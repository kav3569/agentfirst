import { checks } from "./checks.mjs";
try {
  const solution = await import("/scratch/out/solution.js");
  await checks[process.env.TASK_ID](solution);
  console.log("AGENTFIRST_CHECK_PASSED");
} catch (error) {
  console.error(error instanceof Error ? error.stack : "Unknown check failure");
  process.exitCode = 1;
}
