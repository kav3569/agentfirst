# AgentFirst

An open-source benchmark workbench for AssemblyAI's Agent Experience team.
Compare **baseline**, a **pinned official skill**, and an **enhanced skill** on
14 TypeScript integration tasks. A static Next.js dashboard displays validated
JSON reports, task traces, failure categories, and JSON/CSV exports.

**Real API demo:** [Play the AssemblyAI transcription](https://agentfirst-three.vercel.app/integration).
A six-second documentation audio excerpt was uploaded and transcribed by AssemblyAI.
The page replays the actual returned transcript and 15 word timestamps, with a
request history and downloadable evidence. It consumes no credits on playback.
The run used the user-confirmed free account, with no payment method or auto-pay.
The API did not report the dollar value of credits deducted.

**Benchmark evidence:** 14/14 trusted reference modules compile and pass in isolated
Docker evaluation in [GitHub CI](https://github.com/kav3569/agentfirst/actions/runs/41714749263),
including compile/runtime negative controls. The 42 agent cells are blocked
pending generated agent outputs and model credentials. Local Docker is unavailable.
No coding-agent uplift is claimed. This is an independently built
prototype, not an AssemblyAI-endorsed product.

## Start

Node 24.21.0 and npm are required. No credentials are needed for the dashboard.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm start
```

Live dashboard: [agentfirst-three.vercel.app](https://agentfirst-three.vercel.app).

Open http://localhost:3000. `npm start` serves the production static export;
`npm run dev` enables development mode. Vercel hosts only `out/`, with no runner,
API routes, server functions or API keys. Never add AssemblyAI or model keys to
Vercel: this frontend does not use them.

## Run an evaluation

```sh
npm run bench:prepare
docker build -t agentfirst-runner:local -f benchmark/Dockerfile .
npm run bench:pin-image
npm run bench:container-calibration
```

Preparation fetches the official skill at commit
`97419c65a709f2bdeb2d017c466c906f370129c4` and verifies its content hash. It creates
42 prompts under `benchmark/prepared/{configuration}/{task}/`. Upstream skill
content is cached locally and is not redistributed because the fetched repository
does not include a license. The enhanced extension is our own MIT-licensed work.

For **Codex or another full coding agent**, provide each prepared prompt to an
independent session in your organization's isolated agent environment. Keep the
same exact agent/model version, token/time/spend limits and tool access across
conditions. Return `solution.ts` and `metadata.json` in
`benchmark/runs/my-run/{baseline|official|enhanced}/{task}/`. No agent-generated
command is accepted or run by the host adapter. See [reproducibility](docs/reproducibility.md)
for the metadata format and experiment controls.

```sh
npm run bench:run -- --inputs benchmark/runs/my-run --out benchmark/results/my-run.json
npm run bench:publish -- benchmark/results/my-run.json
npm run build
```

Missing isolation fails closed. Missing/malformed outputs are blockers, compile
or runtime assertion failures are scored failures. Blockers are never scored as
passes or included in pass-rate denominators. Report completeness alongside rate.

## Free-credit-only usage policy

The authorized out-of-pocket budget is **$0**. Paid fallback, top-ups, plan
upgrades, and unverified metered requests are not authorized.
`benchmark/usage-policy.json` records this policy. The paid model generator and
legacy token-only smoke remain blocked, including when their opt-in flags are
supplied. A dedicated transcription demo permits one clip of at most ten seconds
only after the user confirms a free account with free credits, no payment method,
and no auto-pay. This is a user-confirmed billing basis, not a programmatic
balance verification. No billing configuration is changed.

Offline evaluation, report imports, and local tests remain available. The
historical result cost fields and nominal token budgets describe estimates,
not authorization to spend money. Full-agent execution and remote compute must
also fit verified free credits or a verified free allowance before being started.

The retained Responses adapter is single-turn code generation. It remains blocked.
The default `npm run bench:live` skips all network requests. The separate
`npm run bench:demo` loads the key from untracked `.env.local`, validates the
clip, exclusively reserves one submission, uploads it, submits once, and polls
with a 32-request/90-second limit. No automatic resubmission occurs, including
after an error or timeout. The reservation survives failures. It has already
been consumed by the recorded demo run; invoking the command again stops.
Only the short sample and an allowlisted result are published; API credentials,
upload URLs, and local account-confirmation files are excluded. See
[reproducibility](docs/reproducibility.md) for experiment controls.

## Task coverage

| Surface                  | Tasks                                                        |
| ------------------------ | ------------------------------------------------------------ |
| Transcription            | Request construction, binary upload                          |
| Realtime                 | WebSocket connection, final-turn reduction, graceful cleanup |
| Temporary authentication | Server-side token minting and TTL validation                 |
| TTS                      | Buffered playable speech, streamed text and Flush            |
| Voice agents             | Barge-in playback stop and Cancel                            |
| Error handling           | Bounded polling, rate limits, retry exhaustion               |
| Security                 | Secret redaction, strict audio allowlist, data residency     |

These are real integration modules with deterministic injected-I/O contracts;
they are not 14 complete end-user applications. The suite intentionally starts
with a tractable, inspectable MVP rather than claiming end-to-end product coverage.

## Sources and project docs

- [Architecture and threat model](docs/architecture.md)
- [Reproducibility and report format](docs/reproducibility.md)
- [Verified case study and limitations](docs/case-study.md)
- [Official source audit](docs/source-audit.md)
- [AssemblyAI current docs index](https://www.assemblyai.com/docs/llms.txt)
- [AssemblyAI coding-agent guidance](https://www.assemblyai.com/docs/coding-agent-prompts)
- [Official skill](https://github.com/AssemblyAI/assemblyai-skill)

MIT for original code. No affiliation or benchmark improvement is implied.
