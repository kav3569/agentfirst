import { mkdir, writeFile, cp, readdir } from "node:fs/promises";
import { join } from "node:path";
import { root, read, sha, save, lock, command } from "./common";
import { tasks, configurations } from "../benchmark/tasks";
export async function treeText(
  directory: string,
  prefix = "",
): Promise<string> {
  const names = (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  let value = "";
  for (const item of names) {
    const rel = prefix + item.name;
    if (item.isDirectory())
      value += await treeText(join(directory, item.name), rel + "/");
    else if (item.isFile() && item.name.endsWith(".md"))
      value += `\n--- ${rel} ---\n` + (await read(join(directory, item.name)));
  }
  return value;
}
export async function prepare() {
  const official = join(root, "benchmark/skills/official");
  try {
    await read(join(official, "SKILL.md"));
  } catch {
    const checkout = join(root, "work/official-skill");
    await mkdir(join(root, "work"), { recursive: true });
    const cloned = await command(
      "git",
      ["clone", lock.officialSkillRepository, checkout],
      60000,
    );
    if (cloned.code !== 0)
      throw new Error("Fetch official skill into work/official-skill first");
    const checked = await command("git", [
      "-C",
      checkout,
      "checkout",
      "--detach",
      lock.officialSkillCommit,
    ]);
    if (checked.code !== 0)
      throw new Error("Official skill commit is unavailable");
    await cp(join(checkout, "skills/assemblyai"), official, {
      recursive: true,
    });
  }
  const sourceCommit = await command("git", [
    "-C",
    join(root, "work/official-skill"),
    "rev-parse",
    "HEAD",
  ]);
  if (sourceCommit.output.trim() !== lock.officialSkillCommit)
    throw new Error("Official source commit mismatch");
  const officialText = await treeText(official);
  if (sha(officialText) !== lock.officialSkillTreeSha256)
    throw new Error(
      "Official skill content was modified; restore the pinned source",
    );
  const enhanced = await read("benchmark/skills/enhanced.md");
  const contract = await read("benchmark/contract.ts");
  const matrix = [];
  for (const task of tasks)
    for (const configuration of configurations) {
      const instruction =
        "Implement the named TypeScript export in solution.ts. Do not import dependencies or execute commands. Return only TypeScript source; inline the relevant contract types. " +
        task.prompt +
        "\n\nContract:\n" +
        contract;
      const context =
        configuration === "baseline"
          ? ""
          : officialText +
            (configuration === "enhanced" ? "\n" + enhanced : "");
      const prompt = instruction + "\n\n" + context;
      const dir = join(root, "benchmark/prepared", configuration, task.id);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "prompt.txt"), prompt);
      await writeFile(join(dir, "contract.ts"), contract);
      const manifest = {
        taskId: task.id,
        configuration,
        promptSha256: sha(prompt),
        contextSha256: sha(context),
        officialSkillCommit:
          configuration === "baseline" ? null : lock.officialSkillCommit,
        budget: lock.agentBudget,
        orderSeed: lock.seed,
      };
      await save(join(dir, "manifest.json"), manifest);
      matrix.push(manifest);
    }
  await save("benchmark/prepared/matrix.json", matrix);
  console.log(
    `Prepared ${matrix.length} matched task/configuration prompts. Official skill is fetched locally, not redistributed.`,
  );
}
if (process.argv[1]?.endsWith("prepare.ts"))
  prepare().catch(() => {
    console.error(
      "Preparation failed. Check the pinned source and network access.",
    );
    process.exitCode = 1;
  });
