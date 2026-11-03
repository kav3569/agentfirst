import { performance } from "node:perf_hooks";
import * as reference from "../benchmark/fixtures/reference";
import { checks } from "../benchmark/checks.mjs";
import { tasks, configurations } from "../benchmark/tasks";
import {
  environment,
  budgets,
  read,
  sha,
  writeReport,
  safe,
  dockerPreflight,
} from "./common";
import type { Report, Row } from "../lib/report";
const rows: Row[] = [];
for (const task of tasks) {
  const start = performance.now();
  let trace =
    "Trusted reference implementation passed deterministic contract assertions.";
  let status: Row["status"] = "passed";
  try {
    await checks[task.id](reference);
  } catch (e) {
    status = "failed";
    trace = safe(e instanceof Error ? (e.stack ?? e.message) : String(e));
  }
  rows.push({
    taskId: task.id,
    configuration: "reference",
    status,
    phase: "calibration",
    category: status === "passed" ? "none" : "assertion",
    latencyMs: performance.now() - start,
    estimatedCostUsd: 0,
    inputTokens: null,
    outputTokens: null,
    trace,
    artifactSha256: sha(await read("benchmark/fixtures/reference.ts")),
    promptSha256: null,
    model: null,
    agentVersion: "trusted-reference-v1",
  });
}
const preflight = await dockerPreflight();
for (const task of tasks)
  for (const configuration of configurations)
    rows.push({
      taskId: task.id,
      configuration,
      status: "blocked",
      phase: "preflight",
      category: preflight.ok ? "missing-agent-output" : "isolation-unavailable",
      latencyMs: null,
      estimatedCostUsd: null,
      inputTokens: null,
      outputTokens: null,
      trace:
        preflight.reason ??
        "No generated agent output supplied. Reference checks do not measure coding-agent performance.",
      artifactSha256: null,
      promptSha256: null,
      model: null,
      agentVersion: null,
    });
const report: Report = {
  schemaVersion: 1,
  id: "readiness-" + new Date().toISOString().replaceAll(/[:.]/g, "-"),
  createdAt: new Date().toISOString(),
  kind: "readiness",
  title: "Verified harness readiness",
  environment: await environment(preflight.digest),
  budgets: budgets(),
  limitations: [
    "Reference calibration tests trusted hand-written adapters, not coding-agent output. No agent uplift has been measured.",
    "All 42 agent/configuration cells are blocked pending isolated execution and generated artifacts.",
    "No authenticated AssemblyAI API request or paid model request was made.",
    "Contract tests cover API request construction and event logic; they do not verify end-to-end audio quality or real network streaming.",
  ],
  rows,
};
await writeReport("benchmark/results/readiness.json", report);
console.log(
  `${rows.filter((r) => r.configuration === "reference" && r.status === "passed").length}/${tasks.length} reference checks passed; 42 agent evaluations blocked.`,
);
if (rows.some((r) => r.status === "failed")) process.exitCode = 1;
