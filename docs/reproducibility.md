# Reproduce an experiment

## Freeze the environment

1. Check out the desired AgentFirst source commit; use Node 24.21.0 and `npm ci`.
2. Run `npm run bench:prepare`. This fetches the official skill at the commit in
   `benchmark/lock.json`, validates its Markdown tree hash, and emits 42 prompts.
3. Build the image with `docker build -t agentfirst-runner:local -f benchmark/Dockerfile .`.
4. Run `npm run bench:pin-image`; retain that image and updated lock with the run.
   For another host, transfer the exact image with `docker save`/`docker load`.
   A fresh build can resolve newer OS packages; matching Dockerfile alone is not
   sufficient. For shared infrastructure, publish the image to your own registry
   and archive its digest. No registry credential belongs in the frontend.
5. Run `npm run bench:container-calibration`. CI performs this check on Linux and logs all 14 reference results plus
   compile/runtime negative controls. New runs do not upload artifacts or create
   dependency caches, to avoid unverified storage charges.

## Matched conditions

There are three prepared conditions: task+contract only, task+contract+official
skill, and task+contract+official+enhanced extension. The full official Markdown
tree is supplied to the single-turn generator because it has no file-reading tool.
This differs from progressive disclosure in a full agent; report it as such.

Use the same model snapshot, agent binary version, effort, output token cap,
180-second generation deadline, $0.50 per-cell estimated cap, tool availability,
and task input across conditions. The single-turn adapter enforces shared caps
and emits cells in a stable shuffled order (seed 42); its provider seed is null.
The offline runner enforces the same 30s/256MB/0.5CPU evaluation budget for all.
External full-agent generation limits must be enforced by that agent environment;
the importer cannot retroactively enforce its past usage.

For repeat trials, use separate output directories and reports. Do not pick the
best trial or mix models under one comparison. Report completion, pass rates,
per-task paired changes, cost and latency distributions across complete runs.
No statistical significance or efficacy claim is available from reference checks.

## External agent artifact contract

For each prepared `prompt.txt`, produce a standalone `solution.ts` with only the
named export from `benchmark/contract.ts`. Inline its relevant types; no package
installation, relative imports or host commands are accepted. The offline image
supports TypeScript and DOM types, not application-specific dependencies.

Place files in `benchmark/runs/my-run/{configuration}/{taskId}/`. Example metadata:

```json
{
  "model": "exact-provider-model-snapshot",
  "agentVersion": "agent-name@exact-version",
  "promptSha256": "replace-with-64-hex-hash-from-prepared-manifest",
  "latencyMs": 1200,
  "inputTokens": null,
  "outputTokens": null,
  "estimatedCostUsd": null
}
```

Unknown metrics remain null. Never fill them with invented zeros. The runner
verifies prompt hashes and computes source hashes; model and past usage metadata
remain self-reported. Generation errors without valid source become missing-input
blockers; capture their provider traces separately rather than interpreting them
as successful integrations.

```sh
npm run bench:run -- --inputs benchmark/runs/my-run --out benchmark/results/my-run.json
```

An incomplete/failed run exits nonzero but still writes its report. A missing
Docker runtime records preflight blockers and executes no candidates. Import
the report in the dashboard locally, or explicitly publish it with
`npm run bench:publish -- benchmark/results/my-run.json` then rebuild/deploy.

## Free-credit-only execution

The user has authorized **$0 out of pocket**, with free credits permitted.
`benchmark/usage-policy.json` is the recorded policy. Estimated token costs
and the nominal per-cell cap above do not authorize a charge to a payment method.

The legacy network adapters fail closed: the Responses generator and any
explicit live AssemblyAI smoke opt-in stop before credential access or requests.
`--allow-paid` cannot override the policy. Neither adapter currently verifies
credit balance, expiry, other concurrent consumers, or an enforced no-charge
cutoff. Supplying an API key or claiming a free balance is insufficient.

Before enabling a provider-backed path, implement and verify provider-specific
credit coverage and a hard stop that prevents paid fallback. Check any remote
compute/CI/deployment allowance as well before starting further hosted jobs.
Model generation remains blocked. No top-up, paid plan or paid fallback is
authorized. No earlier positive spend estimate overrides this restriction.

### Bounded AssemblyAI free-trial demonstration

The user confirmed an AssemblyAI free account with free credits, no payment
method and no auto-pay, and authorized use of the local credential. The dedicated
`npm run bench:demo` path processes the six-second WAV at
`public/audio/integration-check.wav`. It validates PCM format and duration, requires
that local confirmation, and exclusively creates
`benchmark/runs/assemblyai-demo-reservation.json` before its first request.
This file permits one submission across concurrent invocations and is retained
after failure. It must not be deleted to silently retry or increase spending.

The script loads `ASSEMBLYAI_API_KEY` from the ignored `.env.local` file. It
sends the exact audio bytes to POST /v2/upload, submits once to POST /v2/transcript
with an explicit model fallback list, then polls GET /v2/transcript/{id}. There
are no submission retries; total HTTP requests are bounded to 32 and the job
wait is bounded to 90 seconds. An existing provider job may finish after a
client timeout, so a timeout must not trigger a second submission.

`public/live-transcription.json` contains only the recorded transcript, word
timestamps, model if returned, audio hash, request timing/status, and billing
basis. It contains no credential, transcript identifier, or private upload URL.
The provider did not return an exact credit debit; that metric remains null.
`/integration` replays this evidence without making provider requests. The
account type and billing configuration were confirmed by the user, not checked
through an undocumented billing endpoint.

The retained model adapter is a single-turn Responses API adapter, not a full
Codex session. Its former paid invocation instructions have been removed to
avoid implying paid-usage authorization. Actual agent comparisons remain pending.

## Report v1

`lib/report.ts` is the executable schema. A report contains kind
(`readiness`, `benchmark`, or `demo`), timestamps, source/skill/lock/task/image
provenance, shared budgets, limitations, and unique task/configuration rows.
Each row has status, phase, category, nullable latency/tokens/cost/model, source
and prompt hashes, and a bounded redacted trace. `reference` is calibration only.
Blocked/skipped rows never enter pass-rate denominators. Demo reports are visibly
labelled. One report is one trial; the dashboard does not silently pool trials.
