import { command, lock, save } from "./common";
const result = await command(
  "docker",
  ["image", "inspect", lock.image, "--format", "{{.Id}}"],
  5000,
);
const digest = result.output.trim();
if (result.code !== 0 || !/^sha256:[a-f0-9]{64}$/.test(digest))
  throw new Error("Build the runner image first");
await save("benchmark/lock.json", { ...lock, imageDigest: digest });
console.log("Pinned runner image ID", digest);
