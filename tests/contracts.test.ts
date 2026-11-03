import test from "node:test";
import assert from "node:assert/strict";
import * as reference from "../benchmark/fixtures/reference";
import { checks } from "../benchmark/checks.mjs";
import { tasks } from "../benchmark/tasks";
import { AssemblyAI } from "assemblyai";
for (const task of tasks)
  test(`reference contract: ${task.id}`, () => checks[task.id](reference));
test("oracle rejects legacy auth, models, token endpoint and missing flush", async () => {
  await assert.rejects(() =>
    checks.transcription({
      ...reference,
      transcriptionRequest: () => ({
        url: "https://api.assemblyai.com/v2/transcript",
        init: {
          method: "POST",
          headers: { Authorization: "Bearer fixture-key-do-not-use" },
          body: JSON.stringify({ speech_model: "universal-3-pro" }),
        },
      }),
    }),
  );
  await assert.rejects(() =>
    checks.token({
      ...reference,
      tokenRequest: () => ({
        url: "https://streaming.assemblyai.com/v3/token",
        init: {
          method: "GET",
          headers: { Authorization: "fixture-key-do-not-use" },
        },
      }),
    }),
  );
  await assert.rejects(() =>
    checks["tts-stream"]({ ...reference, ttsFrames: () => [] }),
  );
});
test("installed AssemblyAI SDK exposes verified transcription and TTS surfaces", () => {
  const client = new AssemblyAI({ apiKey: "fixture-not-a-real-key" });
  const request: Parameters<typeof client.transcripts.submit>[0] = {
    audio_url: "https://assembly.ai/sample.wav",
    speech_models: ["universal-3-5-pro", "universal-2"],
  };
  assert.equal(request.speech_models?.[0], "universal-3-5-pro");
  assert.equal(typeof client.transcripts.submit, "function");
  assert.equal(typeof client.streaming.createTemporaryToken, "function");
  assert.equal(typeof client.tts.synthesize, "function");
});
