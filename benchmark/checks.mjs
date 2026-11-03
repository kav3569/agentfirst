import assert from "node:assert/strict";
const key = "fixture-key-do-not-use";
const body = (r) => JSON.parse(r.init.body);
const auth = (r) => {
  assert.equal(r.init.headers.Authorization, key);
  assert.equal(r.init.method, "POST");
};
export const checks = {
  transcription: async (s) => {
    for (const url of [
      "https://assembly.ai/a.wav",
      "https://assembly.ai/b.mp3",
    ]) {
      const r = s.transcriptionRequest(url, key);
      auth(r);
      assert.equal(r.url, "https://api.assemblyai.com/v2/transcript");
      assert.equal(body(r).audio_url, url);
      assert.deepEqual(body(r).speech_models, [
        "universal-3-5-pro",
        "universal-2",
      ]);
      assert.equal(body(r).speech_model, undefined);
    }
  },
  upload: async (s) => {
    const bytes = new Uint8Array([0, 255, 7]);
    const r = s.uploadRequest(bytes, key);
    auth(r);
    assert.equal(r.url, "https://api.assemblyai.com/v2/upload");
    assert.deepEqual(r.init.body, bytes);
    assert.equal(r.init.headers["Content-Type"], "application/octet-stream");
  },
  polling: async (s) => {
    let n = 0;
    const delays = [];
    assert.equal(
      await s.pollTranscript(
        "t1",
        async (id) => {
          assert.equal(id, "t1");
          return [
            { status: "queued" },
            { status: "processing" },
            { status: "completed", text: "hello" },
          ][n++];
        },
        async (ms) => {
          delays.push(ms);
        },
        3,
      ),
      "hello",
    );
    assert.equal(n, 3);
    assert.deepEqual(delays, [1000, 1000]);
    n = 0;
    await assert.rejects(
      () =>
        s.pollTranscript(
          "t",
          async () => {
            n++;
            return { status: "processing" };
          },
          async () => {},
          2,
        ),
      /timeout/i,
    );
    assert.equal(n, 2);
    await assert.rejects(
      () =>
        s.pollTranscript(
          "t",
          async () => ({ status: "error", error: "bad audio" }),
          async () => {},
          5,
        ),
      /bad audio/,
    );
    await assert.rejects(() =>
      s.pollTranscript(
        "t",
        async () => ({ status: "unexpected" }),
        async () => {},
        2,
      ),
    );
  },
  streaming: async (s) => {
    const token = "temporary+a&b=?";
    const u = new URL(s.streamingUrl(token));
    assert.equal(u.origin, "wss://streaming.assemblyai.com");
    assert.equal(u.pathname, "/v3/ws");
    assert.equal(u.searchParams.get("token"), token);
    assert.equal(u.searchParams.get("speech_model"), "universal-3-6-pro");
    assert.equal(u.searchParams.get("sample_rate"), "16000");
    assert.equal(u.searchParams.has("api_key"), false);
  },
  turns: async (s) => {
    assert.deepEqual(
      s.finalTurns([
        { type: "Begin" },
        {
          type: "Turn",
          turn_order: 0,
          transcript: "interim",
          end_of_turn: false,
        },
        { type: "Future" },
        {
          type: "Turn",
          turn_order: 1,
          transcript: "second",
          end_of_turn: true,
        },
        { type: "Turn", turn_order: 0, transcript: "first", end_of_turn: true },
        {
          type: "Turn",
          turn_order: 0,
          transcript: "first corrected",
          end_of_turn: true,
        },
      ]),
      ["first corrected", "second"],
    );
    assert.deepEqual(s.finalTurns([]), []);
  },
  token: async (s) => {
    const r = s.tokenRequest(key, 60);
    auth(r);
    assert.equal(r.url, "https://token.assemblyai.com/v1/token");
    assert.deepEqual(body(r), {
      product: "streaming",
      expires_in_seconds: 60,
      max_session_duration_seconds: 60,
    });
    for (const n of [0, 601, 1.2, NaN])
      assert.throws(() => s.tokenRequest(key, n));
    for (const n of [1, 600])
      assert.equal(body(s.tokenRequest(key, n)).expires_in_seconds, n);
  },
  tts: async (s) => {
    const r = s.ttsRequest("Hello.", key);
    auth(r);
    assert.equal(r.url, "https://tts.us.assemblyai.com/v1/speech");
    assert.deepEqual(body(r), {
      text: "Hello.",
      voice_id: "aai-kyla",
      language: "english",
      encoding: "pcm_s16le",
      sample_rate: 24000,
      container: "wav",
      stream: false,
    });
    for (const text of ["", "  ", "x".repeat(5001)])
      assert.throws(() => s.ttsRequest(text, key));
  },
  "tts-stream": async (s) => {
    assert.deepEqual(s.ttsFrames(["Hello ", "", "world."]), [
      { type: "Generate", text: "Hello " },
      { type: "Generate", text: "world." },
      { type: "Flush" },
    ]);
    assert.deepEqual(s.ttsFrames([]), [{ type: "Flush" }]);
  },
  "voice-agent": async (s) => {
    assert.deepEqual(s.bargeIn(true, "wait"), {
      stopPlayback: true,
      frames: [{ type: "Cancel" }],
    });
    for (const [speaking, text] of [
      [false, "wait"],
      [true, "  "],
    ])
      assert.deepEqual(s.bargeIn(speaking, text), {
        stopPlayback: false,
        frames: [],
      });
  },
  retry: async (s) => {
    let n = 0;
    const waits = [];
    assert.equal(
      (
        await s.retryRequest(
          async () =>
            [{ status: 429, retryAfter: 2 }, { status: 503 }, { status: 200 }][
              n++
            ],
          async (ms) => {
            waits.push(ms);
          },
          3,
        )
      ).status,
      200,
    );
    assert.deepEqual(waits, [2000, 2000]);
    n = 0;
    await assert.rejects(
      () =>
        s.retryRequest(
          async () => {
            n++;
            return { status: 401 };
          },
          async () => {},
          4,
        ),
      /401/,
    );
    assert.equal(n, 1);
    n = 0;
    await assert.rejects(() =>
      s.retryRequest(
        async () => {
          n++;
          return { status: 500 };
        },
        async () => {},
        2,
      ),
    );
    assert.equal(n, 2);
    const caps = [];
    let c = 0;
    await s.retryRequest(
      async () => (c++ ? { status: 200 } : { status: 429, retryAfter: 90 }),
      async (ms) => {
        caps.push(ms);
      },
      2,
    );
    assert.deepEqual(caps, [10000]);
  },
  redaction: async (s) => {
    const secret = "sk_fixture/secret+";
    const result = s.redact(
      `failure ${secret} ${encodeURIComponent(secret)} Authorization: Bearer hidden-value https://example.com?token=also-hidden&ok=1`,
      [secret, ""],
    );
    for (const value of [
      secret,
      encodeURIComponent(secret),
      "hidden-value",
      "also-hidden",
    ])
      assert.equal(result.includes(value), false);
    assert.ok(result.includes("failure"));
    assert.ok(result.includes("ok=1"));
    assert.equal(s.redact("ordinary trace", []), "ordinary trace");
  },
  "url-safety": async (s) => {
    assert.equal(
      s.validateAudioUrl("https://assembly.ai/sample.wav"),
      "https://assembly.ai/sample.wav",
    );
    for (const url of [
      "http://assembly.ai/a",
      "https://assembly.ai.evil.test/a",
      "https://user:pass@assembly.ai/a",
      "https://127.0.0.1/a",
      "https://[::1]/a",
      "https://assembly.ai:8080/a",
      "file:///etc/passwd",
      "not a URL",
    ])
      assert.throws(() => s.validateAudioUrl(url));
  },
  cleanup: async (s) => {
    const calls = [];
    s.cleanupSession({
      send: (data) => calls.push(JSON.parse(data)),
      close: () => calls.push("closed"),
    });
    assert.deepEqual(calls, [{ type: "Terminate" }, "closed"]);
    let closed = false;
    assert.throws(
      () =>
        s.cleanupSession({
          send: () => {
            throw new Error("disconnected");
          },
          close: () => {
            closed = true;
          },
        }),
      /disconnected/,
    );
    assert.equal(closed, true);
  },
  residency: async (s) => {
    assert.deepEqual(s.regionalEndpoints("eu"), {
      rest: "https://api.eu.assemblyai.com",
      streaming: "wss://streaming.eu.assemblyai.com/v3/ws",
      tts: "https://tts.eu.assemblyai.com/v1/speech",
    });
    assert.deepEqual(s.regionalEndpoints("us"), {
      rest: "https://api.assemblyai.com",
      streaming: "wss://streaming.us.assemblyai.com/v3/ws",
      tts: "https://tts.us.assemblyai.com/v1/speech",
    });
    assert.throws(() => s.regionalEndpoints("invalid"));
  },
};
