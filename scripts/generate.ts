import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tasks, configurations } from "../benchmark/tasks";
import { root, read, sha, lock, save, dockerPreflight, safe } from "./common";
import { requireVerifiedFreeCredits } from "./usage-policy";

requireVerifiedFreeCredits("Model generation");
// Trusted HTTP adapter: model output is saved as text and never evaluated here.
// This is single-turn code generation, not a full Codex CLI/tool-use session.
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
if (!process.argv.includes("--allow-paid"))
  throw new Error(
    "Paid model usage requires --allow-paid and explicit model/rate ceilings.",
  );
const model = arg("--model");
const inputRate = Number(arg("--input-usd-per-million"));
const outputRate = Number(arg("--output-usd-per-million"));
const totalCap = Number(arg("--max-total-usd") ?? "3");
if (
  !model ||
  ![inputRate, outputRate, totalCap].every((n) => Number.isFinite(n) && n > 0)
)
  throw new Error(
    "Supply --model, positive --input-usd-per-million and --output-usd-per-million rate ceilings, and --max-total-usd. Verify current provider pricing.",
  );
const preflight = await dockerPreflight();
if (!preflight.ok) throw new Error(preflight.reason);
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY must be set locally.");
const output = resolve(
  arg("--out") ?? join(root, "benchmark/runs/generated-" + Date.now()),
);
try {
  await access(output);
  throw new Error(
    "Output directory already exists. Use a new directory to avoid overwriting results or resetting a spend ledger.",
  );
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
await mkdir(output, { recursive: true });
let reservedUsd = 0;
let requests = 0;
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
  const prompt = await read(
    `benchmark/prepared/${configuration}/${task.id}/prompt.txt`,
  );
  const promptBytes = Buffer.byteLength(prompt);
  if (promptBytes > 262144)
    throw new Error("Prompt exceeds shared 256 KiB input budget.");
  // UTF-8 bytes + generous protocol overhead conservatively bound text input
  // tokens for this no-tools, text-only request. Provider billing remains final.
  const reserve =
    ((promptBytes + 4096) * inputRate +
      lock.agentBudget.maxOutputTokens * outputRate) /
    1e6;
  if (reserve > lock.agentBudget.maxCostUsd || reservedUsd + reserve > totalCap)
    throw new Error(
      "Budget exhausted before next request. Prior reservations remain in the ledger.",
    );
  reservedUsd += reserve;
  requests++;
  await save(join(output, "ledger.json"), {
    model,
    requests,
    reservedUsd,
    totalCap,
    inputRate,
    outputRate,
    pricing: "User-supplied upper-bound rates; not verified billing",
    updatedAt: new Date().toISOString(),
  });
  const started = performance.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: lock.agentBudget.maxOutputTokens,
      store: false,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(lock.agentBudget.maxWallSeconds * 1000),
  });
  if (!response.ok)
    throw new Error(
      `Provider HTTP ${response.status}; reservation retained. No automatic retry.`,
    );
  const data = await response.json();
  if (data.status !== "completed")
    throw new Error("Provider response incomplete; reservation retained.");
  const text = (data.output ?? [])
    .filter((part: { type: string }) => part.type === "message")
    .flatMap(
      (part: { content?: { type: string; text?: string }[] }) =>
        part.content ?? [],
    )
    .filter((part: { type: string }) => part.type === "output_text")
    .map((part: { text: string }) => part.text)
    .join("\n");
  if (!text || Buffer.byteLength(text) > 262144)
    throw new Error("Invalid or oversized generated source.");
  const source = text
    .trim()
    .replace(/^```(?:typescript|ts)?\s*\n/, "")
    .replace(/\n```\s*$/, "");
  const inputTokens = data.usage?.input_tokens ?? null;
  const outputTokens = data.usage?.output_tokens ?? null;
  const estimatedCostUsd =
    inputTokens !== null && outputTokens !== null
      ? (inputTokens * inputRate + outputTokens * outputRate) / 1e6
      : null;
  const dir = join(output, configuration, task.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "solution.ts"), safe(source), { mode: 0o600 });
  await save(join(dir, "metadata.json"), {
    model: data.model ?? model,
    requestedModel: model,
    agentVersion: "agentfirst-responses-single-turn-v1",
    promptSha256: sha(prompt),
    latencyMs: performance.now() - started,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    responseId: data.id,
    providerSeed: null,
    orderSeed: lock.seed,
  });
  console.log(
    `${configuration}/${task.id}: output saved; never executed on host.`,
  );
}
console.log(
  `Saved ${requests} generated candidates. Evaluate with bench:run --inputs ${output}`,
);
