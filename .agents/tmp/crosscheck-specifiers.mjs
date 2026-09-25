#!/usr/bin/env node
/**
 * Independent cross-check of the lib/services zero-importer claim.
 * Input: /tmp/all-specifiers.txt (a raw rg -o dump of every quoted specifier
 * that follows from/import/require anywhere in the repo) -- a completely
 * different extraction path from the graph walk in lib-services-inventory.mjs.
 * For every specifier that resolves to a file under lib/services/, the
 * importer file is recorded.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const raw = fs.readFileSync("/tmp/all-specifiers.txt", "utf8").split("\n");

const SPEC_RE = /['"]([^'"]+)['"]\s*$/;
const specs = new Set();
for (const line of raw) {
  const m = SPEC_RE.exec(line.trim());
  if (m) specs.add(m[1]);
}

const EXT = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx"];

function resolve(base) {
  for (const ext of EXT) {
    const cand = base + ext;
    try {
      if (fs.statSync(cand).isFile()) return cand;
    } catch {
      /* next */
    }
  }
  return null;
}

// A specifier is relative-ambiguous unless it names lib/services explicitly.
// For those we can resolve unambiguously from the repo root.
const target = new Map(); // resolved abs -> specifier strings
for (const s of specs) {
  if (!/(^|\/)lib\/services\//.test(s) && !s.startsWith("@/lib/services/")) continue;
  const rel = s.replace(/^@\//, "");
  const r = resolve(path.join(ROOT, rel));
  if (r && r.startsWith(path.join(ROOT, "lib/services") + path.sep)) {
    if (!target.has(r)) target.set(r, []);
    target.get(r).push(s);
  }
}

// Enumerate every candidate service module on disk.
const SERVICES = path.join(ROOT, "lib/services");
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const modules = walk(SERVICES);

const rows = [];
for (const m of modules) {
  rows.push({
    file: path.relative(ROOT, m).split(path.sep).join("/"),
    referencedBySpecifiers: target.get(m) || [],
  });
}
process.stdout.write(
  JSON.stringify(
    {
      note: "specifiers naming lib/services/* found anywhere in repo (root-anchored spellings only; sibling-relative ./x cannot be resolved without the importing file, so those are verified separately in the task record)",
      totalSpecifiersSeen: specs.size,
      serviceModulesReferencedByRootAnchoredSpecifier: rows.filter((r) => r.referencedBySpecifiers.length)
        .length,
      rows,
    },
    null,
    2
  ) + "\n"
);
