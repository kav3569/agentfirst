import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, symlink, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boundedFile, command, safe } from "../scripts/common";
test("candidate import rejects symlinks and oversized files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentfirst-test-"));
  try {
    await writeFile(join(dir, "source.ts"), "safe");
    await symlink(join(dir, "source.ts"), join(dir, "link.ts"));
    await assert.rejects(() => boundedFile(join(dir, "link.ts")));
    await assert.rejects(() => boundedFile(join(dir, "source.ts"), 2));
    assert.equal(await boundedFile(join(dir, "source.ts")), "safe");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("subprocess environment omits API keys and wall timeout kills trusted hung commands", async () => {
  process.env.AGENTFIRST_TEST_SECRET = "test-secret-not-credential";
  try {
    const result = await command(
      process.execPath,
      ["-e", 'console.log(process.env.AGENTFIRST_TEST_SECRET ?? "absent")'],
      2000,
    );
    assert.equal(result.output.trim(), "absent");
    const hung = await command(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      50,
    );
    assert.equal(hung.timedOut, true);
    assert.notEqual(hung.code, 0);
    assert.equal(safe("test-secret-not-credential"), "[REDACTED]");
  } finally {
    delete process.env.AGENTFIRST_TEST_SECRET;
  }
});
test("live smoke is opt-in and makes no request by default", async () => {
  const result = await command(
    process.execPath,
    ["--import", "tsx", "scripts/live.ts"],
    5000,
  );
  assert.equal(result.code, 0);
  assert.match(result.output, /SKIPPED/);
});
test("paid generation fails before network access without explicit opt-in", async () => {
  const result = await command(
    process.execPath,
    ["--import", "tsx", "scripts/generate.ts"],
    5000,
  );
  assert.notEqual(result.code, 0);
  assert.match(result.output, /requires --allow-paid/);
});
test("frontend has no API routes or credential access", async () => {
  const source = await readFile(
    new URL("../app/dashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("process.env"), false);
  assert.equal(source.includes("dangerouslySetInnerHTML"), false);
});
