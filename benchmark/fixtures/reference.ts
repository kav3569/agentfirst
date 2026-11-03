import type { Solution, RequestSpec } from "../contract";
const json = (url: string, key: string, body: unknown): RequestSpec => ({
  url,
  init: {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
});
export const transcriptionRequest: Solution["transcriptionRequest"] = (
  audioUrl,
  key,
) =>
  json("https://api.assemblyai.com/v2/transcript", key, {
    audio_url: audioUrl,
    speech_models: ["universal-3-5-pro", "universal-2"],
  });
export const uploadRequest: Solution["uploadRequest"] = (audio, key) => ({
  url: "https://api.assemblyai.com/v2/upload",
  init: {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/octet-stream" },
    body: audio,
  },
});
export const pollTranscript: Solution["pollTranscript"] = async (
  id,
  get,
  sleep,
  maxAttempts,
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await get(id);
    if (r.status === "completed") return r.text ?? "";
    if (r.status === "error")
      throw new Error(r.error ?? "Transcription failed");
    if (!["queued", "processing"].includes(r.status))
      throw new Error("Unknown transcript status");
    if (attempt + 1 < maxAttempts) await sleep(1000);
  }
  throw new Error("Polling timeout");
};
export const streamingUrl: Solution["streamingUrl"] = (token) => {
  const u = new URL("wss://streaming.assemblyai.com/v3/ws");
  u.search = new URLSearchParams({
    speech_model: "universal-3-6-pro",
    sample_rate: "16000",
    token,
  }).toString();
  return u.toString();
};
export const finalTurns: Solution["finalTurns"] = (events) => {
  const turns = new Map<number, string>();
  for (const e of events)
    if (e.type === "Turn" && e.end_of_turn && e.turn_order !== undefined)
      turns.set(e.turn_order, e.transcript ?? "");
  return [...turns].sort((a, b) => a[0] - b[0]).map(([, text]) => text);
};
export const tokenRequest: Solution["tokenRequest"] = (key, ttl) => {
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 600)
    throw new Error("Invalid token TTL");
  return json("https://token.assemblyai.com/v1/token", key, {
    product: "streaming",
    expires_in_seconds: ttl,
    max_session_duration_seconds: 60,
  });
};
export const ttsRequest: Solution["ttsRequest"] = (text, key) => {
  if (!text.trim() || text.length > 5000) throw new Error("Invalid text");
  return json("https://tts.us.assemblyai.com/v1/speech", key, {
    text,
    voice_id: "aai-kyla",
    language: "english",
    encoding: "pcm_s16le",
    sample_rate: 24000,
    container: "wav",
    stream: false,
  });
};
export const ttsFrames: Solution["ttsFrames"] = (chunks) => [
  ...chunks.filter(Boolean).map((text) => ({ type: "Generate", text })),
  { type: "Flush" },
];
export const bargeIn: Solution["bargeIn"] = (speaking, transcript) =>
  speaking && transcript.trim()
    ? { stopPlayback: true, frames: [{ type: "Cancel" }] }
    : { stopPlayback: false, frames: [] };
export const retryRequest: Solution["retryRequest"] = async (
  send,
  sleep,
  maxAttempts,
) => {
  for (let i = 0; i < maxAttempts; i++) {
    const r = await send();
    if (r.status >= 200 && r.status < 300) return r;
    if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status}`);
    if (i + 1 < maxAttempts)
      await sleep(
        Math.min(10000, Math.max(0, (r.retryAfter ?? 2 ** i) * 1000)),
      );
  }
  throw new Error("Retry budget exhausted");
};
export const redact: Solution["redact"] = (text, secrets) => {
  let value = text;
  for (const secret of [...secrets]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)) {
    for (const variant of new Set([secret, encodeURIComponent(secret)]))
      value = value.split(variant).join("[REDACTED]");
  }
  return value
    .replace(
      /(authorization["'\s]*[:=]["'\s]*)(?:Bearer\s+)?[^\s,;}"']+/gi,
      "$1[REDACTED]",
    )
    .replace(/([?&]token=)[^&\s"']+/gi, "$1[REDACTED]");
};
export const validateAudioUrl: Solution["validateAudioUrl"] = (value) => {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "assembly.ai" ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error("Audio URL not allowlisted");
  return u.href;
};
export const cleanupSession: Solution["cleanupSession"] = (socket) => {
  try {
    socket.send(JSON.stringify({ type: "Terminate" }));
  } finally {
    socket.close();
  }
};
export const regionalEndpoints: Solution["regionalEndpoints"] = (region) => {
  if (!["us", "eu"].includes(region)) throw new Error("Invalid region");
  return region === "eu"
    ? {
        rest: "https://api.eu.assemblyai.com",
        streaming: "wss://streaming.eu.assemblyai.com/v3/ws",
        tts: "https://tts.eu.assemblyai.com/v1/speech",
      }
    : {
        rest: "https://api.assemblyai.com",
        streaming: "wss://streaming.us.assemblyai.com/v3/ws",
        tts: "https://tts.us.assemblyai.com/v1/speech",
      };
};
