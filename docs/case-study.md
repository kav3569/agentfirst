# Case study: establishing an honest baseline

The supplied workspace was empty: no existing Next.js application, Git history,
tests or imported benchmark dataset existed. AgentFirst was built from scratch
as a static dashboard and a separate offline evaluation CLI.

## Verified locally

The suite contains 14 deterministic integration contracts. Trusted reference
implementations pass all 14. Additional tests check rejected legacy patterns,
installed AssemblyAI SDK surfaces, strict report validation, pass-rate accounting,
CSV formula protection, symlink/size limits, subprocess environment filtering,
wall timeouts, and default opt-out behavior for live/paid requests. The application
passes a TypeScript check and a production static build.

GitHub Actions run [41714749263](https://github.com/kav3569/agentfirst/actions/runs/41714749263)
also compiled and ran all 14 reference modules in Docker. All passed; deliberately
broken compile/runtime controls failed as expected. The imported CI readiness
report records that actual isolated evidence, plus 42 blocked agent cells. It is not synthetic demo data and is not an agent-performance
dataset. The public dashboard displays their distinction and offers local report
import, per-task traces and JSON/CSV exports.

## Actual AssemblyAI integration

A six-second excerpt of the official documentation audio sample was uploaded,
submitted and polled against the real API using the user-confirmed free account.
AssemblyAI returned a completed transcript, 15 timestamped words and model
`universal-3-5-pro`. Five HTTP requests returned 200; the recorded end-to-end
latency was approximately 5.01 seconds. These observations describe one run,
not a latency benchmark or accuracy study.

The `/integration` experience replays the clip with clickable transcript words
and publishes a sanitized request history. Playback does not make API calls.
The exact credit debit was not provided by the API and remains unknown.
The run was bounded to one transcription submission under the user-confirmed
free-credit account without a payment method or auto-pay.

## What was not measured

No agent-generated candidate was executed: the local machine has no Docker
runtime, and the runner refuses a host fallback. No paid model generation was
performed. The real API example above exercises trusted application code, not
an independently generated coding-agent candidate. Baseline, official-skill and
enhanced-skill pass rates are therefore **unavailable**. No improvement percentage,
latency benefit, cost savings or efficacy conclusion is justified.

The case study does identify a concrete docs inconsistency around token minting
and captures it in the enhanced guidance. Whether that guidance helps agents is
a hypothesis for a future paired experiment, not a result.

## Limits of this MVP

- Tasks exercise reusable integration modules, not full application repositories.
- Mocked deterministic request/event logic cannot establish speech quality,
  audio playback correctness, reconnection behavior, deployment correctness of
  generated applications, or live STT/TTS/voice-agent end-to-end success.
- One real prerecorded transcription is verified. Streaming, TTS and voice-agent
  live behavior remain unverified. The legacy token-only smoke and paid model
  generator remain blocked under the free-credit-only policy.
- The optional API adapter is single-turn text generation, not a full Codex agent.
  Full coding-agent sessions must be run in external isolation and imported.
- Generation is stochastic; repeated matched trials and uncertainty estimates
  are required for efficacy claims. Token budgets are maximums, not equal realized
  context or compute. The official context is intentionally longer than baseline.
- Imported generation metadata is self-reported. Public contract tests are not
  an adversarially secure grading protocol. Isolation protects the host but does
  not stop a malicious submission from spoofing a success marker.
- Local Docker is unavailable. Isolated evaluation was verified by the linked
  successful GitHub Actions job; its raw artifact is retained with the report.
- No full browser accessibility audit has been performed. Responsive layout,
  labelled controls and normal keyboard access are included.

## Next evidence to collect

Provision Docker; pin and calibrate the image. Generate complete independent
trials with a frozen agent/model and identical budgets, evaluate all 42 cells,
retain raw artifacts privately and publish redacted result reports. Inspect
per-task paired failures before revising the skill. Only report improvements
supported by those measured trials. Any additional provider calls must fit
verified free credits or the specifically confirmed free-account arrangement;
paid fallback and out-of-pocket spending remain prohibited.
