import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectWav,
  validateTrialConfirmation,
  transcribeShortAudio,
} from "../scripts/assemblyai-transcription";

function wav(seconds = 1) {
  const b = Buffer.alloc(44 + 32000 * seconds);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVE", 8);
  b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(b.length - 44, 40);
  return b;
}
const confirmation = {
  confirmedAt: new Date().toISOString(),
  accountType: "free",
  hasFreeCredits: true,
  paymentMethodOnFile: false,
  autoPayEnabled: false,
  maxOutOfPocketUsd: 0,
  maxSubmissions: 1,
  maxAudioSeconds: 10,
};
test("free trial requires explicit credits and no payment method or auto-pay", () => {
  assert.equal(validateTrialConfirmation(confirmation).maxOutOfPocketUsd, 0);
  for (const changed of [
    { paymentMethodOnFile: true },
    { autoPayEnabled: true },
    { hasFreeCredits: false },
    { maxSubmissions: 2 },
    { accountType: "paid" },
    { maxAudioSeconds: 600 },
    { maxOutOfPocketUsd: 1 },
  ])
    assert.throws(() =>
      validateTrialConfirmation({ ...confirmation, ...changed }),
    );
});
test("audio parser rejects empty, truncated, stereo and over-budget clips", () => {
  assert.equal(inspectWav(wav(6)).durationSeconds, 6);
  assert.throws(() => inspectWav(wav(0)));
  assert.throws(() => inspectWav(wav(11)));
  assert.throws(() => inspectWav(wav(1).subarray(0, 100)));
  const stereo = wav();
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => inspectWav(stereo));
});
test("real integration pipeline preserves bytes, raw auth, models and returned words", async () => {
  const audio = wav();
  let now = 0;
  const calls: { url: string; init: RequestInit }[] = [];
  const responses = [
    { upload_url: "https://cdn.assemblyai.com/upload/fixture" },
    { id: "fixture-job", status: "queued" },
    { id: "fixture-job", status: "processing" },
    {
      status: "completed",
      text: "Hello.",
      words: [{ text: "Hello.", start: 0, end: 500, confidence: 0.9 }],
      speech_model_used: "universal-3-5-pro",
      audio_duration: 1,
    },
  ];
  const fetcher: typeof fetch = async (input, init) => {
    assert.ok(init);
    calls.push({ url: String(input), init });
    now += 10;
    return new Response(JSON.stringify(responses.shift()), { status: 200 });
  };
  const result = await transcribeShortAudio(audio, "fixture-only-key", {
    fetch: fetcher,
    sleep: async (ms) => {
      now += ms;
    },
    now: () => now,
  });
  assert.equal(result.text, "Hello.");
  assert.equal(result.words[0].end, 500);
  assert.equal(result.requests.length, 4);
  assert.equal(result.requests[2].path, "/v2/transcript/{id}");
  assert.equal(result.latencyMs, 2040);
  for (const call of calls) {
    assert.ok(call.url.startsWith("https://api.assemblyai.com/v2/"));
    assert.equal(
      (call.init.headers as Record<string, string>).Authorization,
      "fixture-only-key",
    );
    assert.equal(call.init.redirect, "error");
  }
  assert.deepEqual(calls[0].init.body, audio);
  assert.deepEqual(JSON.parse(calls[1].init.body as string), {
    audio_url: "https://cdn.assemblyai.com/upload/fixture",
    speech_models: ["universal-3-5-pro", "universal-2"],
  });
  assert.equal(JSON.stringify(result).includes("fixture-only-key"), false);
  assert.equal(JSON.stringify(result).includes("cdn.assemblyai.com"), false);
});
test("failed API calls stop without automatic retries or resubmission", async () => {
  for (const status of [401, 402, 429, 500]) {
    let count = 0;
    await assert.rejects(
      () =>
        transcribeShortAudio(wav(), "fixture-key", {
          fetch: async () => {
            count++;
            return new Response("{}", { status });
          },
          sleep: async () => {},
          now: () => 0,
        }),
      new RegExp(`HTTP ${status}`),
    );
    assert.equal(count, 1);
  }
});
test("polling has a fixed request budget and one transcription submission", async () => {
  let count = 0,
    submits = 0;
  const fetcher: typeof fetch = async (input, init) => {
    count++;
    let response;
    if (String(input).endsWith("/upload"))
      response = { upload_url: "https://cdn.assemblyai.com/upload/fixture" };
    else if (init?.method === "POST") {
      submits++;
      response = { id: "fixture-job", status: "processing" };
    } else response = { status: "processing" };
    return new Response(JSON.stringify(response), { status: 200 });
  };
  await assert.rejects(
    () =>
      transcribeShortAudio(wav(), "fixture-key", {
        fetch: fetcher,
        sleep: async () => {},
        now: () => 0,
      }),
    /polling limit/,
  );
  assert.equal(submits, 1);
  assert.equal(count, 32);
});
test("unknown upload hosts are rejected before a transcription is submitted", async () => {
  let count = 0;
  await assert.rejects(
    () =>
      transcribeShortAudio(wav(), "fixture-key", {
        fetch: async () => {
          count++;
          return new Response(
            JSON.stringify({ upload_url: "https://example.test/upload" }),
          );
        },
        sleep: async () => {},
        now: () => 0,
      }),
    /Unexpected upload URL/,
  );
  assert.equal(count, 1);
});
