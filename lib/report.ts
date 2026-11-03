import { z } from "zod";
import { tasks } from "../benchmark/tasks";
import { redactSecrets } from "./secret-redaction";
export const configSchema = z.enum([
  "baseline",
  "official",
  "enhanced",
  "reference",
]);
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const rowSchema = z.object({
  taskId: z.enum(tasks.map((t) => t.id)),
  configuration: configSchema,
  status: z.enum(["passed", "failed", "blocked", "skipped"]),
  phase: z.enum([
    "calibration",
    "preflight",
    "compile",
    "runtime",
    "generation",
  ]),
  category: z.string().max(80),
  latencyMs: z.number().nonnegative().nullable(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  trace: z.string().max(65536),
  artifactSha256: sha.nullable(),
  promptSha256: sha.nullable(),
  model: z.string().max(120).nullable(),
  agentVersion: z.string().max(120).nullable(),
});
export const reportSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(120),
    createdAt: z.iso.datetime(),
    kind: z.enum(["readiness", "benchmark", "demo"]),
    title: z.string().max(160),
    environment: z.object({
      node: z.string().max(80),
      platform: z.string().max(80),
      commit: z.string().max(80),
      imageDigest: z.string().max(160).nullable(),
      officialSkillCommit: z.string().regex(/^[a-f0-9]{40}$/),
      lockSha256: sha,
      taskSuiteSha256: sha,
    }),
    budgets: z.object({
      timeoutMs: z.number().positive(),
      memoryMb: z.number().positive(),
      cpus: z.number().positive(),
      maxOutputTokens: z.number().int().positive(),
      maxCostUsd: z.number().nonnegative(),
    }),
    limitations: z.array(z.string().max(1200)).max(30),
    rows: z.array(rowSchema).min(1).max(5000),
  })
  .superRefine((report, ctx) => {
    const seen = new Set<string>();
    for (const row of report.rows) {
      const key = `${row.configuration}:${row.taskId}`;
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          message: "Duplicate task/configuration row",
        });
      seen.add(key);
      if (row.configuration === "reference" && row.phase !== "calibration")
        ctx.addIssue({
          code: "custom",
          message: "Reference rows must be calibration",
        });
      if (row.configuration !== "reference" && row.phase === "calibration")
        ctx.addIssue({
          code: "custom",
          message: "Calibration cannot be represented as agent output",
        });
      if (
        report.kind === "benchmark" &&
        ["passed", "failed"].includes(row.status) &&
        row.configuration !== "reference" &&
        (!row.artifactSha256 ||
          !row.promptSha256 ||
          !row.model ||
          !row.agentVersion)
      )
        ctx.addIssue({
          code: "custom",
          message: "Measured rows require provenance",
        });
    }
  });
export type Report = z.infer<typeof reportSchema>;
export type Row = z.infer<typeof rowSchema>;
export function passRate(rows: Row[]): number | null {
  const evaluated = rows.filter(
    (r) => r.status === "passed" || r.status === "failed",
  );
  return evaluated.length
    ? evaluated.filter((r) => r.status === "passed").length / evaluated.length
    : null;
}
export function csvExport(report: Report): string {
  const columns = [
    "taskId",
    "configuration",
    "status",
    "phase",
    "category",
    "latencyMs",
    "estimatedCostUsd",
    "inputTokens",
    "outputTokens",
    "model",
    "agentVersion",
    "artifactSha256",
    "promptSha256",
    "trace",
  ] as const;
  const cell = (v: unknown) => {
    let text = String(v ?? "");
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [
    columns.join(","),
    ...report.rows.map((row) => columns.map((c) => cell(row[c])).join(",")),
  ].join("\r\n");
}
export function parseReport(text: string): Report {
  if (new TextEncoder().encode(text).length > 2_000_000)
    throw new Error("Reports must be under 2 MB");
  const report = reportSchema.parse(JSON.parse(text));
  return {
    ...report,
    rows: report.rows.map((row) => ({
      ...row,
      trace: redactSecrets(row.trace),
    })),
  };
}
