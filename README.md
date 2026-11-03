# AgentFirst

An open-source benchmark workbench for AssemblyAI's Agent Experience team.
Compare **baseline**, a **pinned official skill**, and an **enhanced skill** on
14 TypeScript integration tasks. A static Next.js dashboard displays validated
JSON reports, task traces, failure categories, and JSON/CSV exports.

**Current evidence:** 14/14 trusted reference modules compile and pass in isolated
Docker evaluation in [GitHub CI](https://github.com/kav3569/agentfirst/actions/runs/41714749263),
including compile/runtime negative controls. The 42 agent cells are blocked
pending generated agent outputs and model credentials. Local Docker is unavailable. No coding-agent uplift,
live audio success, or paid usage is claimed. This is an independently built
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

An optional **single-turn Responses API generator** is also provided. This is a
bounded code-generation baseline, **not a Codex CLI agent session**. It needs an
environment-provided `OPENAI_API_KEY`, Docker preflight, an explicit model, current
price ceilings, and `--allow-paid`. Do not paste keys into chat or put them in
command arguments. [Reproducibility](docs/reproducibility.md) documents the command,
spend reservation ledger and limitations. It has not been run in this delivery.

## Live smoke (opt in)

Set `ASSEMBLYAI_API_KEY` using your local secret manager or an untracked local
environment file. Node's `--env-file=.env.local` can load it; the CLI does not
automatically read Next.js environment files.

```sh
AGENTFIRST_LIVE=1 node --env-file=.env.local --import tsx scripts/live.ts --allow-live
```

The smoke makes **one authenticated temporary-token request**, discards the
returned token, and never opens billable audio sessions. It validates auth and
the current token endpoint only. STT, TTS, streaming and voice-agent live tests
remain a documented limitation. The default command, `npm run bench:live`, skips
all network requests. Repeated opt-ins are separate requests; there is no account-
wide billing cap.

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
