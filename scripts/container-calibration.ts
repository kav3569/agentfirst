import { tasks } from "../benchmark/tasks";
import { dockerPreflight, read, save, environment } from "./common";
import { evaluate } from "./sandbox";
const preflight = await dockerPreflight();
if (!preflight.ok) throw new Error(preflight.reason);
const source = (await read("benchmark/fixtures/reference.ts")).replace(
  "import type { Solution, RequestSpec } from '../contract';",
  await read("benchmark/contract.ts"),
);
const results = [];
for (const task of tasks) {
  const result = await evaluate(source, task.id, preflight.digest);
  results.push({ taskId: task.id, ...result });
  console.log(`${task.id}: ${result.code === 0 ? "passed" : "FAILED"}`);
}
const badCompile = await evaluate(
  "export const broken: string = 123;",
  "transcription",
  preflight.digest,
);
results.push({
  taskId: "negative-compile",
  ...badCompile,
  expectedFailure: true,
});
const badRuntime = await evaluate(
  "export function ttsFrames() { return []; }",
  "tts-stream",
  preflight.digest,
);
results.push({
  taskId: "negative-runtime",
  ...badRuntime,
  expectedFailure: true,
});
await save("benchmark/runs/container-calibration.json", {
  environment: await environment(preflight.digest),
  results,
});
if (results.some((r) => ("expectedFailure" in r ? r.code === 0 : r.code !== 0)))
  process.exitCode = 1;
