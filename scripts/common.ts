import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import lock from "../benchmark/lock.json";
import { redactSecrets } from "../lib/secret-redaction";
import { reportSchema, type Report } from "../lib/report";
export { lock };
export const root = resolve(import.meta.dirname, "..");
export const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export const read = (path: string) => readFile(resolve(root, path), "utf8");
export const secrets = () =>
  Object.entries(process.env)
    .filter(([key]) => /KEY|TOKEN|SECRET|PASSWORD/.test(key))
    .map(([, value]) => value ?? "")
    .filter((v) => v.length > 5);
export const safe = (value: string) => redactSecrets(value, secrets());
export async function save(path: string, value: unknown) {
  const target = resolve(root, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
}
export async function boundedFile(path: string, maxBytes = 262144) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes)
    throw new Error("Input must be a bounded regular file");
  return readFile(path, "utf8");
}
export async function environment(imageDigest: string | null = null) {
  let commit = "uncommitted";
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {}
  return {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    commit,
    imageDigest,
    officialSkillCommit: lock.officialSkillCommit,
    lockSha256: sha(await read("benchmark/lock.json")),
    taskSuiteSha256: sha(
      (await read("benchmark/tasks.ts")) +
        (await read("benchmark/checks.mjs")) +
        (await read("benchmark/contract.ts")),
    ),
  };
}
export function budgets() {
  return {
    timeoutMs: lock.timeoutMs,
    memoryMb: lock.memoryMb,
    cpus: lock.cpus,
    maxOutputTokens: lock.agentBudget.maxOutputTokens,
    maxCostUsd: lock.agentBudget.maxCostUsd,
  };
}
export async function writeReport(path: string, report: Report) {
  const sanitized = JSON.parse(safe(JSON.stringify(report)));
  reportSchema.parse(sanitized);
  await save(path, sanitized);
}
export type CommandResult = {
  code: number;
  output: string;
  timedOut: boolean;
  overflow: boolean;
};
export function command(
  file: string,
  args: string[],
  timeoutMs = lock.timeoutMs,
): Promise<CommandResult> {
  return new Promise((resolveResult, reject) => {
    let output = "";
    let bytes = 0;
    let overflow = false;
    let timedOut = false;
    const child = spawn(file, args, {
      cwd: root,
      shell: false,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    const collect = (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > lock.maxOutputBytes) {
        overflow = true;
        child.kill("SIGKILL");
        return;
      }
      output += chunk.toString();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveResult({
        code: code ?? 1,
        output: safe(output),
        timedOut,
        overflow,
      });
    });
  });
}
export async function dockerPreflight() {
  try {
    const info = await command(
      "docker",
      ["info", "--format", "{{.ServerVersion}}"],
      5000,
    );
    if (info.code !== 0) throw new Error("Docker daemon unavailable");
    const inspected = await command(
      "docker",
      ["image", "inspect", lock.image, "--format", "{{.Id}}"],
      5000,
    );
    const digest = inspected.output.trim();
    if (inspected.code !== 0 || !/^sha256:[a-f0-9]{64}$/.test(digest))
      throw new Error("Build the runner image first");
    if (lock.imageDigest !== digest)
      throw new Error(
        "Image is not pinned; run npm run bench:pin-image after building",
      );
    return { ok: true as const, digest, reason: null };
  } catch {
    return {
      ok: false as const,
      digest: null,
      reason:
        "Isolation unavailable: install/start Docker, build the runner image, then pin its image ID. No candidate code was executed.",
    };
  }
}
