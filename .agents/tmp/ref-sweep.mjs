#!/usr/bin/env node
/**
 * Exhaustive reference sweep for a set of lib/services modules.
 * Searches EVERY file in the repo (all extensions, including docs/json/sql/yaml)
 * for the module filename and for the module stem, so that no reference
 * spelling is missed (string-path dynamic import, vi.mock, moduleNameMapper,
 * workspace-ownership manifests, architecture docs, migration ledgers, ...).
 *
 * Usage: node .agents/tmp/ref-sweep.mjs <path> [<path> ...]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: ref-sweep.mjs <path>...");
  process.exit(2);
}

const out = {};
for (const t of targets) {
  const base = path.basename(t); // e.g. staff-job-board.service.ts
  const stem = base.replace(/\.(service|store)?\.(ts|tsx)$/, "");
  const hits = {};
  for (const pat of [base, stem]) {
    let res = "";
    try {
      res = execFileSync(
        "rg",
        ["--no-heading", "-n", "--hidden", "--no-ignore", "-g", "!node_modules", "-g", "!.git", "-g", "!.next", "-g", "!out", "-F", pat, "."],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
      );
    } catch (e) {
      res = (e.stdout || "").toString();
    }
    const files = new Set();
    for (const line of res.split("\n")) {
      const m = /^(\.[^:]*):\d+:/.exec(line);
      if (m) files.add(m[1].replace(/^\./, ""));
    }
    hits[pat] = [...files].sort();
  }
  out[t] = hits;
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
