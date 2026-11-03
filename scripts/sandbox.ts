import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { command, lock, read, type CommandResult } from "./common";
export async function evaluate(
  source: string,
  taskId: string,
  digest: string,
): Promise<CommandResult> {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest))
    throw new Error("Image ID must be pinned");
  const workspace = await mkdtemp(join(tmpdir(), "agentfirst-"));
  const name = "agentfirst-" + randomUUID();
  try {
    await chmod(workspace, 0o755);
    await writeFile(join(workspace, "solution.ts"), source, { mode: 0o444 });
    await writeFile(
      join(workspace, "checks.mjs"),
      await read("benchmark/checks.mjs"),
      { mode: 0o444 },
    );
    await writeFile(
      join(workspace, "container-check.mjs"),
      await read("benchmark/container-check.mjs"),
      { mode: 0o444 },
    );
    return await command("docker", [
      "run",
      "--name",
      name,
      "--rm",
      "--pull=never",
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=64",
      `--memory=${lock.memoryMb}m`,
      `--memory-swap=${lock.memoryMb}m`,
      `--cpus=${lock.cpus}`,
      "--ulimit",
      "nofile=128:128",
      "--user",
      "10001:10001",
      "--tmpfs",
      "/scratch:rw,noexec,nosuid,size=64m,uid=10001,gid=10001",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=16m,uid=10001,gid=10001",
      "--mount",
      `type=bind,src=${workspace},dst=/candidate,readonly`,
      "--env",
      `TASK_ID=${taskId}`,
      digest,
      "sh",
      "-c",
      "tsc /candidate/solution.ts --strict --skipLibCheck --target ES2022 --module commonjs --lib ES2022,DOM --outDir /scratch/out && echo AGENTFIRST_COMPILE_PASSED && node /candidate/container-check.mjs",
    ]);
  } finally {
    await command("docker", ["rm", "-f", name], 5000).catch(() => {});
    await rm(workspace, { recursive: true, force: true });
  }
}
