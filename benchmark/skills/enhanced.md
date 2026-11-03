# AgentFirst enhanced AssemblyAI integration guidance

Read the pinned official skill first. This extension adds a verification procedure;
it has no measured efficacy claim.

1. Read the supplied source manifest and resolve conflicting examples against the
   current endpoint specification. Do not infer undocumented methods or models.
2. Map acceptance criteria to exports in the task contract. Keep credentials in
   injected server context; browser URLs may contain only temporary tokens.
3. Bound polling and retries. Retry 429/5xx only, honor Retry-After, and fail
   immediately on 401/403. Preserve terminal API errors without credentials.
4. Distinguish transcript end_of_turn from interim Turn updates. Send Terminate
   during cleanup. TTS uses its own host, voice_id, Generate and Flush frames.
5. For voice barge-in, stop playback and Cancel TTS; retain the session.
6. Test normal completion, malformed input, unknown events, duplicate final turns,
   exhausted budgets, and secret leakage. Never put a permanent key in a URL.
7. Compile the TypeScript. Return only the requested solution and factual usage
   metadata. Never claim a live API test ran if it did not.

Snapshot-specific correction (2026-11-03): the current streaming token spec uses
POST https://token.assemblyai.com/v1/token with product=streaming in JSON,
expires_in_seconds 1..600 and max_session_duration_seconds 60..10800. The
official skill snapshot still describes legacy GET /v3/token and one-use tokens.
The current spec says tokens can open multiple sessions during the redemption
window. Consult the pinned spec rather than silently blending the two flows.
