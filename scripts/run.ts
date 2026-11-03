import { resolve, join } from "node:path";
import { z } from "zod";
import { tasks, configurations } from "../benchmark/tasks";
import {
  dockerPreflight,
  lock,
  sha,
  safe,
  boundedFile,
  environment,
  budgets,
  writeReport,
  read,
} from "./common";
import type { Row, Report } from "../lib/report";
import { evaluate } from "./sandbox";
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const inputs = arg("--inputs");
if (!inputs)
  throw new Error(
    "Usage: npm run bench:run -- --inputs benchmark/runs/generated --out benchmark/results/run.json",
  );
const metadataSchema = z.object({
  model: z.string().min(1).max(120),
  agentVersion: z.string().min(1).max(120),
  promptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
});
const preflight = await dockerPreflight();
const rows: Row[] = [];
let identity: string | null = null;
let interrupted = false;
process.once("SIGINT", () => {
  interrupted = true;
});
process.once("SIGTERM", () => {
  interrupted = true;
});
// Stable shuffled task order avoids testing all enhanced outputs last.
const matrix = tasks
  .flatMap((task) =>
    configurations.map((configuration) => ({ task, configuration })),
  )
  .sort((a, b) =>
    sha(`${lock.seed}:${a.task.id}:${a.configuration}`).localeCompare(
      sha(`${lock.seed}:${b.task.id}:${b.configuration}`),
    ),
  );
for (const { task, configuration } of matrix) {
  if (interrupted) break;
  const row: Row = {
    taskId: task.id,
    configuration,
    status: "blocked",
    phase: "preflight",
    category: "missing-agent-output",
    latencyMs: null,
    estimatedCostUsd: null,
    inputTokens: null,
    outputTokens: null,
    trace: "No candidate supplied.",
    artifactSha256: null,
    promptSha256: null,
    model: null,
    agentVersion: null,
  };
  if (!preflight.ok) {
    row.category = "isolation-unavailable";
    row.trace = preflight.reason;
    rows.push(row);
    continue;
  }
  try {
    const dir = resolve(inputs, configuration, task.id);
    const source = await boundedFile(join(dir, "solution.ts"));
    const meta = metadataSchema.parse(
      JSON.parse(await boundedFile(join(dir, "metadata.json"), 16384)),
    );
    const prompt = await read(
      `benchmark/prepared/${configuration}/${task.id}/prompt.txt`,
    );
    if (meta.promptSha256 !== sha(prompt))
      throw new Error("Candidate prompt hash does not match prepared task");
    const currentIdentity = meta.model + "|" + meta.agentVersion;
    if (identity !== null && identity !== currentIdentity)
      throw new Error(
        "Mixed agent/model versions are not a matched comparison",
      );
    if (
      meta.outputTokens !== null &&
      meta.outputTokens > lock.agentBudget.maxOutputTokens
    )
      throw new Error("Reported output token budget exceeded");
    if (meta.latencyMs > lock.agentBudget.maxWallSeconds * 1000)
      throw new Error("Reported generation time budget exceeded");
    if (
      meta.estimatedCostUsd !== null &&
      meta.estimatedCostUsd > lock.agentBudget.maxCostUsd
    )
      throw new Error("Reported generation spend budget exceeded");
    identity = currentIdentity;
    Object.assign(row, { ...meta, artifactSha256: sha(source) });
    const start = performance.now();
    const result = await evaluate(source, task.id, preflight.digest);
    row.latencyMs = (row.latencyMs ?? 0) + performance.now() - start;
    const compiled = result.output.includes("AGENTFIRST_COMPILE_PASSED");
    row.phase = compiled ? "runtime" : "compile";
    row.status =
      result.code === 0 && result.output.includes("AGENTFIRST_CHECK_PASSED")
        ? "passed"
        : "failed";
    row.category =
      row.status === "passed"
        ? "none"
        : result.timedOut
          ? "timeout"
          : result.overflow
            ? "output-limit"
            : compiled
              ? "assertion"
              : "compile";
    row.trace =
      safe(result.output) || "Container ended without a check result.";
  } catch (e) {
    row.trace = safe(
      e instanceof Error ? e.message : "Invalid candidate input",
    );
    row.category = "invalid-input";
  }
  rows.push(row);
}
const report: Report = {
  schemaVersion: 1,
  id: "benchmark-" + Date.now(),
  createdAt: new Date().toISOString(),
  kind: "benchmark",
  title: "Isolated agent artifact evaluation",
  environment: await environment(preflight.digest),
  budgets: budgets(),
  limitations: [
    "Imported model/version/cost metadata is self-reported; artifact and prepared prompt hashes are verified.",
    "Tests are public contract checks, not an adversarially tamper-proof judge. Container isolation protects the host; it does not prove authenticity of a malicious candidate’s output.",
    "Model generation is nondeterministic. Repeat complete matched runs and report uncertainty before claiming improvements.",
    "Live AssemblyAI API behavior is tested separately and is not implied by contract-test success.",
  ],
  rows,
};
await writeReport(arg("--out") ?? "benchmark/results/latest.json", report);
console.log(
  `Saved ${rows.length} evaluations: ${rows.filter((r) => r.status === "passed").length} passed, ${rows.filter((r) => r.status === "blocked").length} blocked.`,
);
if (rows.some((r) => r.status !== "passed") || interrupted)
  process.exitCode = 1;
