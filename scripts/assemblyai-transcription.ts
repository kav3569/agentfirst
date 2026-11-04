import { createHash } from "node:crypto";

export type TrialConfirmation = {
  confirmedAt: string;
  accountType: "free";
  hasFreeCredits: true;
  paymentMethodOnFile: false;
  autoPayEnabled: false;
  maxOutOfPocketUsd: 0;
  maxSubmissions: 1;
  maxAudioSeconds: number;
};

export function validateTrialConfirmation(value: unknown): TrialConfirmation {
  const c = value as Partial<TrialConfirmation> | null;
  if (
    !c ||
    c.accountType !== "free" ||
    c.hasFreeCredits !== true ||
    c.paymentMethodOnFile !== false ||
    c.autoPayEnabled !== false ||
    c.maxOutOfPocketUsd !== 0 ||
    c.maxSubmissions !== 1 ||
    !c.confirmedAt ||
    !Number.isFinite(Date.parse(c.confirmedAt)) ||
    typeof c.maxAudioSeconds !== "number" ||
    c.maxAudioSeconds <= 0 ||
    c.maxAudioSeconds > 10
  ) {
    throw new Error(
      "A confirmed free account with credits, no payment method, and no auto-pay is required. Paid fallback is prohibited.",
    );
  }
  return c as TrialConfirmation;
}

export function inspectWav(audio: Uint8Array): {
  durationSeconds: number;
  sampleRate: number;
  sha256: string;
} {
  const bytes = Buffer.from(audio);
  if (
    bytes.length < 44 ||
    bytes.length > 400000 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Expected a bounded PCM WAV file");
  let sampleRate = 0,
    blockAlign = 0,
    dataBytes = 0,
    formatFound = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const name = bytes.toString("ascii", offset, offset + 4),
      size = bytes.readUInt32LE(offset + 4),
      start = offset + 8;
    if (start + size > bytes.length) throw new Error("Truncated WAV chunk");
    if (name === "fmt ") {
      if (
        size < 16 ||
        bytes.readUInt16LE(start) !== 1 ||
        bytes.readUInt16LE(start + 2) !== 1 ||
        bytes.readUInt16LE(start + 14) !== 16
      )
        throw new Error("Only 16-bit mono PCM is allowed");
      sampleRate = bytes.readUInt32LE(start + 4);
      blockAlign = bytes.readUInt16LE(start + 12);
      formatFound = true;
    }
    if (name === "data") dataBytes += size;
    offset = start + size + (size % 2);
  }
  if (
    !formatFound ||
    sampleRate !== 16000 ||
    blockAlign !== 2 ||
    dataBytes === 0 ||
    dataBytes % 2
  )
    throw new Error("Expected nonempty 16 kHz mono PCM");
  const durationSeconds = dataBytes / (sampleRate * blockAlign);
  if (durationSeconds > 10)
    throw new Error("Audio exceeds the ten-second trial limit");
  return {
    durationSeconds,
    sampleRate,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export type RequestTrace = {
  stage: "upload" | "submit" | "poll";
  method: "GET" | "POST";
  path: string;
  httpStatus: number;
  latencyMs: number;
};
export type Word = {
  text: string;
  start: number;
  end: number;
  confidence: number;
};
export type TranscriptionResult = {
  text: string;
  words: Word[];
  speechModelUsed: string | null;
  audioDurationSeconds: number | null;
  latencyMs: number;
  requests: RequestTrace[];
};
type Dependencies = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

export async function transcribeShortAudio(
  audio: Uint8Array,
  key: string,
  dependencies: Dependencies,
): Promise<TranscriptionResult> {
  inspectWav(audio);
  if (!key.trim() || /[\r\n]/.test(key))
    throw new Error("A private local API credential is required");
  const started = dependencies.now(),
    deadline = started + 90000,
    requests: RequestTrace[] = [];
  async function request(
    stage: RequestTrace["stage"],
    path: string,
    method: "GET" | "POST",
    body?: Uint8Array | string,
  ) {
    const remaining = deadline - dependencies.now();
    if (remaining <= 0 || requests.length >= 32)
      throw new Error(
        "API request budget exhausted; no resubmission will occur",
      );
    const before = dependencies.now();
    const response = await dependencies.fetch(
      "https://api.assemblyai.com" + path,
      {
        method,
        headers: {
          Authorization: key,
          ...(body
            ? {
                "Content-Type":
                  typeof body === "string"
                    ? "application/json"
                    : "application/octet-stream",
              }
            : {}),
        },
        body: body as BodyInit | undefined,
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(10000, remaining)),
      },
    );
    requests.push({
      stage,
      method,
      path: stage === "poll" ? "/v2/transcript/{id}" : path,
      httpStatus: response.status,
      latencyMs: Math.max(0, dependencies.now() - before),
    });
    if (!response.ok)
      throw new Error(
        `AssemblyAI ${stage} returned HTTP ${response.status}. No automatic retry or paid fallback.`,
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (!response.body) throw new Error("Missing API response body");
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length;
      if (size > 1000000) throw new Error("API response exceeded size limit");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  const upload = await request("upload", "/v2/upload", "POST", audio);
  const url = new URL(upload.upload_url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "cdn.assemblyai.com" ||
    url.username ||
    url.password
  )
    throw new Error("Unexpected upload URL");
  const submitted = await request(
    "submit",
    "/v2/transcript",
    "POST",
    JSON.stringify({
      audio_url: url.href,
      speech_models: ["universal-3-5-pro", "universal-2"],
    }),
  );
  if (
    typeof submitted.id !== "string" ||
    !/^[a-zA-Z0-9-]{6,100}$/.test(submitted.id)
  )
    throw new Error("Invalid transcript identifier");
  let transcript = submitted;
  for (let attempts = 0; attempts <= 30; attempts++) {
    if (transcript.status === "completed") {
      if (
        typeof transcript.text !== "string" ||
        !transcript.text.trim() ||
        !Array.isArray(transcript.words) ||
        !transcript.words.length
      )
        throw new Error(
          "Completed response lacks transcript text or word timestamps",
        );
      const words: Word[] = transcript.words.map((w: Word) => {
        if (
          typeof w.text !== "string" ||
          !Number.isFinite(w.start) ||
          !Number.isFinite(w.end) ||
          w.start < 0 ||
          w.end < w.start ||
          !Number.isFinite(w.confidence) ||
          w.confidence < 0 ||
          w.confidence > 1
        )
          throw new Error("Invalid word timestamps");
        return {
          text: w.text,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        };
      });
      return {
        text: transcript.text,
        words,
        speechModelUsed:
          typeof transcript.speech_model_used === "string"
            ? transcript.speech_model_used
            : null,
        audioDurationSeconds:
          typeof transcript.audio_duration === "number"
            ? transcript.audio_duration
            : null,
        latencyMs: Math.max(0, dependencies.now() - started),
        requests,
      };
    }
    if (transcript.status === "error")
      throw new Error(
        "AssemblyAI reported a terminal transcription error. No resubmission will occur.",
      );
    if (!["queued", "processing"].includes(transcript.status))
      throw new Error("Unknown transcript status");
    if (attempts === 30) break;
    if (attempts > 0) await dependencies.sleep(2000);
    transcript = await request("poll", "/v2/transcript/" + submitted.id, "GET");
  }
  throw new Error(
    "Transcript polling limit reached; the existing job will not be resubmitted",
  );
}
