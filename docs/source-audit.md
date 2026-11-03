# Official source audit — 2026-11-03

Sources were fetched directly and fingerprinted in
`benchmark/sources/manifest.json`. Full documentation snapshots remain in the
ignored local source cache; upstream documentation is not redistributed. The
official skill is pinned by Git commit and Markdown tree hash. Recheck current
docs before extending the task suite: examples and API specs can disagree.

| Topic        | Verified source and implementation decision                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery    | [llms.txt](https://www.assemblyai.com/docs/llms.txt) is the documented index. Use its actual links rather than guessing paths.                                                                                                                                                                                                                                                                                                   |
| SDKs         | [SDK guide](https://www.assemblyai.com/docs/getting-started/sdks) and [official skill JS reference](https://github.com/AssemblyAI/assemblyai-skill/blob/97419c65a709f2bdeb2d017c466c906f370129c4/skills/assemblyai/references/js-sdk.md). npm registry reported assemblyai 4.42.0; this exact dev dependency is installed and its transcription, streaming-token and TTS surfaces are compile/runtime checked without API calls. |
| Async STT    | [Submit transcript](https://www.assemblyai.com/docs/api-reference/transcripts/submit): POST api.assemblyai.com/v2/transcript, raw Authorization key, audio_url and plural speech_models. Pin universal-3-5-pro with universal-2 fallback, per fetched spec/skill.                                                                                                                                                                |
| Realtime STT | [Streaming API](https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket): v3 WebSocket, 16 kHz PCM session configuration, universal-3-6-pro. Begin/Turn/Termination are distinct events.                                                                                                                                                                                                                          |
| Tokens       | [Current streaming-token spec](https://www.assemblyai.com/docs/streaming/api-spec/generate-streaming-token): POST token.assemblyai.com/v1/token with product streaming, TTL 1..600, session cap 60..10800. Redemption window differs from session duration.                                                                                                                                                                      |
| TTS          | [Official TTS section](https://www.assemblyai.com/docs/llms-full/text-to-speech-2.txt) and [pinned skill TTS reference](https://github.com/AssemblyAI/assemblyai-skill/blob/97419c65a709f2bdeb2d017c466c906f370129c4/skills/assemblyai/references/text-to-speech.md): dedicated tts.us/tts.eu hosts; POST /v1/speech and WebSocket /v1/ws; voice_id; Generate/Flush/Cancel/Terminate.                                            |
| Docs MCP     | [Build with AI agents](https://www.assemblyai.com/docs/coding-agent-prompts) documents https://mcp.assemblyai.com/docs using Streamable HTTP, with search_docs, get_pages, list_sections, get_api_reference. This is documentation retrieval, distinct from an account-connected transcription MCP service. No MCP session was connected or measured in this delivery.                                                           |
| Agent skill  | [Official repository](https://github.com/AssemblyAI/assemblyai-skill) uses skills/assemblyai/SKILL.md plus references. Cache locally at the exact commit; do not silently update between conditions.                                                                                                                                                                                                                             |

## Observed discrepancy

The pinned official skill's streaming reference documents legacy
GET streaming.assemblyai.com/v3/token and says a token is single-use. The current
streaming token spec documents POST token.assemblyai.com/v1/token and explicitly
allows multiple sessions during its redemption window. The enhanced guidance
calls out this discrepancy and prioritizes the current endpoint specification.
This is an observed documentation difference, **not evidence of measured agent
failure or enhanced-skill uplift**. Legacy endpoint functionality was not tested.

## Research limits

No authenticated API behavior, account-specific model availability, quotas or
billing was verified. SDK type/runtime checks show installed symbols exist, not
that every documented live operation works. The TTS task uses the verified raw
HTTP/WebSocket contract instead of inventing SDK signatures. Some obvious-looking
URLs returned 404; sources were resolved through the official index instead.
