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
5. Run `npm run bench:container-calibration`. CI performs this check on Linux and
   uploads all 14 reference results plus compile/runtime negative controls.

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

## Optional paid generator

Set `OPENAI_API_KEY` in your local environment or secret manager. Choose a model
and verify its current input/output USD-per-million-token rate ceilings. The
following uses environment values, not hardcoded or claimed current prices:

```sh
npm run bench:generate -- --allow-paid \
  --model "$AGENTFIRST_MODEL" \
  --input-usd-per-million "$AGENTFIRST_INPUT_RATE" \
  --output-usd-per-million "$AGENTFIRST_OUTPUT_RATE" \
  --max-total-usd 3 \
  --out benchmark/runs/experiment-001
```

This calls the [Responses API](https://developers.openai.com/api/docs/guides/text)
once per cell with `store:false`, no tools, 6,000 maximum output tokens, and no
automatic retries. It is not a full Codex run. Source text is saved but not run.

A conservative text-input reservation uses UTF-8 prompt bytes plus 4,096 protocol
tokens and the full output cap. Positive caller-supplied rates are required; if
they understate provider rates the monetary estimate is invalid. Reservations are
persisted before requests and retained after errors/timeouts because an aborted
request can still incur provider charges. Each invocation requires a fresh output
directory, preventing silent overwrite or resetting the same ledger. Multiple
invocations have independent budgets; the provider account's own spend controls
are the account-wide backstop. The default $3 total can stop before completing all
42 cells; raise it only with explicit paid-usage authorization. Failed/incomplete
provider responses stop the run. Do not compare partially selected conditions as
a complete experiment.

## Report v1

`lib/report.ts` is the executable schema. A report contains kind
(`readiness`, `benchmark`, or `demo`), timestamps, source/skill/lock/task/image
provenance, shared budgets, limitations, and unique task/configuration rows.
Each row has status, phase, category, nullable latency/tokens/cost/model, source
and prompt hashes, and a bounded redacted trace. `reference` is calibration only.
Blocked/skipped rows never enter pass-rate denominators. Demo reports are visibly
labelled. One report is one trial; the dashboard does not silently pool trials.
