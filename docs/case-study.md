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

## What was not measured

No agent-generated candidate was executed: the local machine has no Docker
runtime, and the runner refuses a host fallback. No paid model generation or
authenticated AssemblyAI API call was made. Baseline, official-skill and
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
- The opt-in live smoke covers token minting only. Expanded live-audio tests need
  consented fixtures, a spend-reserving gateway and explicit paid authorization.
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
supported by those measured trials. Run the optional token smoke with a local
key; extend to billable audio only after choosing fixtures and authorizing a cap.
