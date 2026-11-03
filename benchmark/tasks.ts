export const tasks = [
  {
    id: "transcription",
    name: "Transcribe a recording",
    category: "Transcription",
    fn: "transcriptionRequest",
    prompt:
      "Build a POST /v2/transcript request using the injected key, HTTPS audio URL and an explicit current speech_models fallback list. Return RequestSpec. No network calls.",
    docs: "https://www.assemblyai.com/docs/api-reference/transcripts/submit",
  },
  {
    id: "upload",
    name: "Upload local audio",
    category: "Transcription",
    fn: "uploadRequest",
    prompt:
      "Build a binary POST /v2/upload request. Preserve the exact Uint8Array payload; use raw Authorization and application/octet-stream.",
    docs: "https://www.assemblyai.com/docs/api-reference/files/upload",
  },
  {
    id: "polling",
    name: "Bounded transcript polling",
    category: "Error handling",
    fn: "pollTranscript",
    prompt:
      "Poll using injected get(id) and sleep(ms), at most maxAttempts. Return completed text, throw terminal error immediately, reject unknown statuses, and time out when exhausted. Wait 1000ms between attempts only.",
    docs: "https://www.assemblyai.com/docs/api-reference/transcripts/get",
  },
  {
    id: "streaming",
    name: "Connect realtime STT",
    category: "Realtime",
    fn: "streamingUrl",
    prompt:
      "Return a streaming v3 WebSocket URL with speech_model universal-3-6-pro, sample_rate 16000 and the properly escaped temporary token. Never put a permanent key into the URL.",
    docs: "https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket",
  },
  {
    id: "turns",
    name: "Handle final turns",
    category: "Realtime",
    fn: "finalTurns",
    prompt:
      "Reduce streaming events to final transcript strings, ordered by turn_order. Ignore unknown and interim events. Deduplicate final turn updates using the latest text for each turn_order.",
    docs: "https://www.assemblyai.com/docs/streaming/message-sequence",
  },
  {
    id: "token",
    name: "Mint temporary authentication",
    category: "Security",
    fn: "tokenRequest",
    prompt:
      "Return a server-side streaming token request using the current token API reference, product streaming, integer TTL 1..600, and max_session_duration_seconds 60. Reject invalid TTLs. Use raw Authorization.",
    docs: "https://www.assemblyai.com/docs/streaming/api-spec/generate-streaming-token",
  },
  {
    id: "tts",
    name: "Synthesize playable speech",
    category: "TTS",
    fn: "ttsRequest",
    prompt:
      "Return a buffered HTTP TTS request to the US host with voice_id aai-kyla, english language, pcm_s16le, sample_rate 24000, container wav, stream false. Reject empty/whitespace text or text >5000 chars.",
    docs: "https://www.assemblyai.com/docs/tts/api-reference/http-api/create-speech",
  },
  {
    id: "tts-stream",
    name: "Flush streaming synthesis",
    category: "TTS",
    fn: "ttsFrames",
    prompt:
      "Convert nonempty text chunks to Generate frames without changing spaces, then exactly one Flush. Even empty input must flush. Do not terminate the persistent session.",
    docs: "https://www.assemblyai.com/docs/tts/api-reference/websocket-api",
  },
  {
    id: "voice-agent",
    name: "Handle voice barge-in",
    category: "Voice agents",
    fn: "bargeIn",
    prompt:
      "When speaking and a nonempty caller transcript arrives, return stopPlayback true and one TTS Cancel frame. Otherwise return false and no frames. Preserve the session.",
    docs: "https://www.assemblyai.com/docs/tts/message-frames",
  },
  {
    id: "retry",
    name: "Recover from rate limits",
    category: "Error handling",
    fn: "retryRequest",
    prompt:
      "Use injected send/sleep with maximum maxAttempts. Return 2xx, retry 429/5xx, fail other 4xx immediately. Honor retryAfter in seconds (clamp 0..10 seconds); otherwise use 1,2,4s exponential delays capped 10s. No final sleep.",
    docs: "https://www.assemblyai.com/docs/streaming/common-session-errors-and-closures",
  },
  {
    id: "redaction",
    name: "Redact sensitive traces",
    category: "Security",
    fn: "redact",
    prompt:
      "Remove injected secrets and URL-encoded variants from trace text, Authorization values (including Bearer) and token query values. Preserve harmless diagnostics and ignore empty secrets. Use [REDACTED].",
    docs: "https://www.assemblyai.com/docs/coding-agent-prompts",
  },
  {
    id: "url-safety",
    name: "Constrain remote audio URLs",
    category: "Security",
    fn: "validateAudioUrl",
    prompt:
      "This application permits only HTTPS audio at the exact hostname assembly.ai on the default port. Reject credentials, other hosts, IPs, non-HTTPS and malformed URLs; return the normalized href. Policy is application-specific, not an AssemblyAI requirement.",
    docs: "https://www.assemblyai.com/docs/api-reference/transcripts/submit",
  },
  {
    id: "cleanup",
    name: "Close sessions reliably",
    category: "Realtime",
    fn: "cleanupSession",
    prompt:
      "Send the JSON Terminate frame then close the socket. Always close even when send throws; preserve that exception.",
    docs: "https://www.assemblyai.com/docs/streaming/message-sequence",
  },
  {
    id: "residency",
    name: "Respect regional endpoints",
    category: "Security",
    fn: "regionalEndpoints",
    prompt:
      "Return rest base, streaming WebSocket, and tts synthesis endpoint for us/eu. Use region-specific streaming zones, US async api.assemblyai.com / EU api.eu.assemblyai.com and tts.us/tts.eu. Reject invalid regions.",
    docs: "https://www.assemblyai.com/docs/streaming/endpoints-and-data-zones",
  },
] as const;
export const configurations = ["baseline", "official", "enhanced"] as const;
export type Configuration = (typeof configurations)[number];
