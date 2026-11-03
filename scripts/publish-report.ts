import { readFile, writeFile } from "node:fs/promises";
import { parseReport } from "../lib/report";
import { safe, root } from "./common";
const path = process.argv[2];
if (!path) throw new Error("Supply a report JSON path");
const report = parseReport(safe(await readFile(path, "utf8")));
await writeFile(
  root + "/public/results.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Published validated, redacted report to public/results.json. Rebuild the dashboard to deploy it.",
);
