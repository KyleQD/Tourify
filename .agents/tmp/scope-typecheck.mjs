#!/usr/bin/env node
/**
 * Scoped typecheck harness for the design-system Wave 34 lib/services lane.
 *
 * Emits a temporary root tsconfig whose `include` is exactly the requested
 * file set, so tsc type-checks ONLY those roots and their transitive imports.
 * A full `npm run typecheck` is prohibited in this wave (CI 68m18s, 1,384
 * errors, OOMs on an 8GB box); this gives a real, comparable measurement
 * instead of an estimate.
 *
 * Usage: node .agents/tmp/scope-typecheck.mjs <label> <file...>
 * Writes: .agents/tmp/scope-results/<label>.json
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".agents/tmp/scope-results");
const TSCONFIG = path.join(ROOT, "tsconfig.ds-scope.json");

const [label, ...files] = process.argv.slice(2);
if (!label || files.length === 0) {
  console.error("usage: scope-typecheck.mjs <label> <file...>");
  process.exit(2);
}

const include = ["next-env.d.ts", ...files];
fs.writeFileSync(
  TSCONFIG,
  JSON.stringify(
    {
      extends: "./tsconfig.json",
      compilerOptions: { incremental: false, noEmit: true },
      include,
      exclude: ["node_modules"],
    },
    null,
    2
  ) + "\n"
);

fs.mkdirSync(OUT_DIR, { recursive: true });
const rawOut = path.join(OUT_DIR, `${label}.raw.txt`);

const t0 = Date.now();
const p = spawn("npx", ["tsc", "-p", "tsconfig.ds-scope.json", "--pretty", "false", "--diagnostics"], {
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
let err = "";
p.stdout.on("data", (d) => (out += d));
p.stderr.on("data", (d) => (err += d));
const killer = setTimeout(() => {
  console.error("TIMEOUT after 900s — killing tsc");
  p.kill("SIGKILL");
}, 900000);

p.on("close", (code) => {
  clearTimeout(killer);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  fs.writeFileSync(rawOut, out);
  try {
    fs.unlinkSync(TSCONFIG);
  } catch {
    /* best effort */
  }
  const lines = out.split("\n").filter((l) => l.trim().length > 0);
  // Primary diagnostic = a line matching file(line,col): error TSxxxx
  const byFile = {};
  const byCode = {};
  for (const l of lines) {
    const m = /^([^(]+)\((\d+),(\d+)\): error (TS\d+):/.exec(l);
    if (!m) continue;
    byFile[m[1]] = (byFile[m[1]] || 0) + 1;
    byCode[m[4]] = (byCode[m[4]] || 0) + 1;
  }
  const report = {
    label,
    roots: files,
    tscExitCode: code,
    elapsedSeconds: Number(elapsed),
    primaryDiagnosticLines: Object.values(byFile).reduce((a, b) => a + b, 0),
    filesWithDiagnostics: Object.keys(byFile).length,
    byFile: Object.fromEntries(Object.entries(byFile).sort((a, b) => b[1] - a[1])),
    byCode: Object.fromEntries(Object.entries(byCode).sort((a, b) => b[1] - a[1])),
    tsFilesParsed: (/Files:\s+(.*)/.exec(out) || [, null])[1],
    tsLines: (/Lines of TypeScript:\s+(.*)/.exec(out) || [, null])[1],
    stderr: err.slice(0, 4000),
  };
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(report, null, 2) + "\n");
  console.log(
    `SCOPED TSC [${label}] exit=${code} elapsed=${elapsed}s primaryDiagnostics=${report.primaryDiagnosticLines} filesWithDiagnostics=${report.filesWithDiagnostics} tsFilesParsed=${report.tsFilesParsed}`
  );
  console.log("byFile:", JSON.stringify(report.byFile));
  console.log("byCode:", JSON.stringify(report.byCode));
});
