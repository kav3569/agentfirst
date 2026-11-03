import { tokenRequest } from "../benchmark/fixtures/reference";
import { safe, save, lock } from "./common";
// This smoke test intentionally mints a token only. It never starts billable audio.
const enabled =
  process.env.AGENTFIRST_LIVE === "1" && process.argv.includes("--allow-live");
const cap = Number(
  process.env.AGENTFIRST_MAX_REQUESTS ?? lock.liveBudget.maxRequests,
);
if (!enabled) {
  console.log(
    "SKIPPED: opt in with AGENTFIRST_LIVE=1 and --allow-live. No API request made.",
  );
  process.exit(0);
}
if (!Number.isInteger(cap) || cap < 1 || cap > lock.liveBudget.maxRequests)
  throw new Error("Live request budget must be 1");
const key = process.env.ASSEMBLYAI_API_KEY;
if (!key)
  throw new Error(
    "Set ASSEMBLYAI_API_KEY in the local environment; never paste it into a prompt.",
  );
const request = tokenRequest(key, 60);
const start = performance.now();
let status = "failed";
let httpStatus: number | null = null;
try {
  const response = await fetch(request.url, {
    ...request.init,
    body: request.init.body as string,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  httpStatus = response.status;
  if (response.ok) {
    const data = await response.json();
    if (typeof data.token !== "string" || !data.token)
      throw new Error("Invalid token response");
    status = "passed";
  } else throw new Error(`Token endpoint returned HTTP ${response.status}`);
} catch (e) {
  console.error(
    safe(e instanceof Error ? e.message : "Live smoke test failed"),
  );
}
await save("benchmark/runs/live-smoke.json", {
  createdAt: new Date().toISOString(),
  status,
  httpStatus,
  latencyMs: performance.now() - start,
  requests: 1,
  estimatedCostUsd: null,
  scope:
    "Authenticated token mint only; no transcription, TTS or streaming session; response token is discarded.",
});
console.log(
  `Live token smoke: ${status}; 1 request; credentials and token not persisted.`,
);
if (status !== "passed") process.exitCode = 1;
