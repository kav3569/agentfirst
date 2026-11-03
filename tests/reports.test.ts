import test from "node:test";
import assert from "node:assert/strict";
import data from "../benchmark/results/readiness.json";
import published from "../public/results.json";
import { reportSchema, parseReport, passRate, csvExport } from "../lib/report";
const report = reportSchema.parse(data);
test("published CI evidence preserves calibration and has no measured agent passes", () => {
  const current = reportSchema.parse(published);
  assert.ok(current.environment.imageDigest);
  assert.equal(
    current.rows.filter(
      (row) => row.configuration === "reference" && row.status === "passed",
    ).length,
    14,
  );
  assert.equal(
    current.rows.filter(
      (row) => row.configuration !== "reference" && row.status === "passed",
    ).length,
    0,
  );
});
test("imported traces redact authorization headers and temporary tokens", () => {
  const value = parseReport(
    JSON.stringify({
      ...report,
      rows: [
        {
          ...report.rows[0],
          trace:
            "Authorization: Bearer secret-value https://example.test?token=private-token&ok=1",
        },
      ],
    }),
  );
  assert.equal(value.rows[0].trace.includes("secret-value"), false);
  assert.equal(value.rows[0].trace.includes("private-token"), false);
  assert.ok(value.rows[0].trace.includes("ok=1"));
});
test("readiness report keeps reference successes out of agent comparisons", () => {
  assert.equal(
    passRate(report.rows.filter((r) => r.configuration === "baseline")),
    null,
  );
  assert.equal(
    passRate(report.rows.filter((r) => r.configuration === "reference")),
    1,
  );
  assert.equal(
    report.rows.filter((r) => r.configuration !== "reference").length,
    42,
  );
});
test("report import rejects malformed, duplicate, oversized and provenance-free rows", () => {
  assert.throws(() => parseReport("{bad"));
  assert.throws(() => parseReport(" ".repeat(2_000_001)));
  assert.equal(
    reportSchema.safeParse({
      ...report,
      rows: [report.rows[0], report.rows[0]],
    }).success,
    false,
  );
  const row = {
    ...report.rows.find((r) => r.configuration === "baseline")!,
    status: "passed",
    phase: "runtime",
  };
  assert.equal(
    reportSchema.safeParse({ ...report, kind: "benchmark", rows: [row] })
      .success,
    false,
  );
  assert.equal(
    reportSchema.safeParse({
      ...report,
      rows: [{ ...report.rows[0], configuration: "enhanced" }],
    }).success,
    false,
  );
});
test("CSV quotes multiline traces and neutralizes spreadsheet formulas", () => {
  const csv = csvExport({
    ...report,
    rows: [{ ...report.rows[0], trace: '=IMPORTXML("test")\nsecond line' }],
  });
  assert.ok(csv.includes('"\'=IMPORTXML(""test"")\nsecond line"'));
  assert.ok(csv.startsWith("taskId,configuration,"));
});
test("pass rate includes actual failures but excludes blockers and skipped rows", () => {
  const base = report.rows[0];
  assert.equal(
    passRate([
      { ...base, status: "passed" },
      { ...base, status: "failed" },
      { ...base, status: "blocked" },
      { ...base, status: "skipped" },
    ]),
    0.5,
  );
});
