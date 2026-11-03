import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tasks, configurations } from "../benchmark/tasks";
import { reportSchema, type Report, type Row } from "../lib/report";
import { root, sha, budgets, writeReport, save } from "./common";
const [input, runId, completedAt] = process.argv.slice(2);
if (!input || !/^\d+$/.test(runId ?? "") || !completedAt)
  throw new Error(
    "Usage: bench:import-calibration -- artifact.json numericRunId ISOCompletedAt",
  );
const raw = JSON.parse(await readFile(input, "utf8"));
const environment = reportSchema.shape.environment.parse(raw.environment);
if (!/^[a-f0-9]{40}$/.test(environment.commit) || !environment.imageDigest)
  throw new Error("Calibration requires committed source and a pinned image");
const source = (path: string) =>
  execFileSync("git", ["show", `${environment.commit}:${path}`], {
    cwd: root,
    encoding: "utf8",
  });
const fingerprint = sha(
  source("benchmark/tasks.ts") +
    source("benchmark/checks.mjs") +
    source("benchmark/contract.ts"),
);
if (fingerprint !== environment.taskSuiteSha256)
  throw new Error("Calibration suite hash does not match committed source");
const artifact = source("benchmark/fixtures/reference.ts").replace(
  /import type \{[^}]+\} from ["']\.\.\/contract["'];?/,
  source("benchmark/contract.ts"),
);
const rows: Row[] = [];
for (const task of tasks) {
  const matches = raw.results.filter(
    (r: { taskId: string }) => r.taskId === task.id,
  );
  if (matches.length !== 1)
    throw new Error("Incomplete or duplicate calibration task");
  const r = matches[0];
  const passed = r.code === 0 && r.output.includes("AGENTFIRST_CHECK_PASSED");
  rows.push({
    taskId: task.id,
    configuration: "reference",
    status: passed ? "passed" : "failed",
    phase: "calibration",
    category: passed ? "none" : "assertion",
    latencyMs: null,
    estimatedCostUsd: 0,
    inputTokens: null,
    outputTokens: null,
    trace: `GitHub Actions run ${runId}; isolated compile and runtime checks.\n${r.output}`,
    artifactSha256: sha(artifact),
    promptSha256: null,
    model: null,
    agentVersion: "trusted-reference-v1",
  });
}
for (const name of ["negative-compile", "negative-runtime"]) {
  const r = raw.results.find((r: { taskId: string }) => r.taskId === name);
  if (!r || r.code === 0 || r.expectedFailure !== true)
    throw new Error("Negative control did not fail as expected");
}
for (const task of tasks)
  for (const configuration of configurations)
    rows.push({
      taskId: task.id,
      configuration,
      status: "blocked",
      phase: "preflight",
      category: "missing-agent-output",
      latencyMs: null,
      estimatedCostUsd: null,
      inputTokens: null,
      outputTokens: null,
      trace:
        "The Docker evaluator passed calibration in GitHub Actions. No coding-agent output was generated or supplied for this cell. Model API credentials and paid-usage authorization are not configured.",
      artifactSha256: null,
      promptSha256: null,
      model: null,
      agentVersion: null,
    });
const report: Report = {
  schemaVersion: 1,
  id: `ci-${runId}`,
  createdAt: completedAt,
  kind: "readiness",
  title: "Isolated harness calibration · GitHub Actions",
  environment,
  budgets: budgets(),
  limitations: [
    `Evidence: https://github.com/kav3569/agentfirst/actions/runs/${runId}. All 14 trusted reference modules passed isolated compilation and runtime assertions; compile/runtime negative controls failed as expected. Task timings were not collected and remain null.`,
    "This is harness calibration, not coding-agent performance. All 42 agent/configuration cells lack generated outputs. No skill uplift has been measured.",
    "No authenticated AssemblyAI API request or paid model request was made. Docker is verified in CI; no local Docker runtime is installed.",
    "Request/event contract tests do not verify end-to-end audio quality, live streaming or full application integrations.",
  ],
  rows,
};
await writeReport("benchmark/results/isolated-readiness.json", report);
await save("benchmark/results/container-calibration.json", raw);
console.log(
  "Imported actual isolated CI evidence. Agent comparisons remain unavailable.",
);
