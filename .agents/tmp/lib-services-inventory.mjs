#!/usr/bin/env node
/**
 * Wave 34 design-system lane: rigorous importer/liveness inventory for lib/services/**.
 * Read-only analysis. Emits a machine-readable JSON inventory.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVICES = path.join(ROOT, "lib/services");

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "out", "dist", "coverage", ".turbo",
  ".agents", ".opencode", "ios", "android",
]);

function walk(dir, out = []) {
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    if (e.name.startsWith(".") && e.name !== ".agents") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const allFiles = walk(ROOT);

/** Read a file, returning text ('' when missing). */
function read(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 1. Next.js entry points (liveness roots), per the inventory's method.
// ---------------------------------------------------------------------------
const ENTRY_DIR_NAMES = new Set(["app", "pages", "src/app", "src/pages"]);
const ENTRY_RE =
  /(^|\/)(page|layout|loading|error|not-found|template|default|route|middleware|instrumentation)\.(tsx|ts|jsx|js)$/;
const NEXT_CONFIG = /(^|\/)next\.config\.(mjs|js|ts)$/;

const entryPoints = new Set();
for (const f of allFiles) {
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  if (ENTRY_RE.test(rel)) entryPoints.add(f);
  if (/(^|\/)middleware\.(tsx|ts)$/.test(rel)) entryPoints.add(f);
  if (NEXT_CONFIG.test(rel)) entryPoints.add(f);
}
// Route groups / catch-all pages are already covered by the filename rule.
console.error(`entry points: ${entryPoints.size}`);

// ---------------------------------------------------------------------------
// 2. Import graph (static, string-literal based, alias + relative spellings).
// ---------------------------------------------------------------------------
const EXT_CANDIDATES = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", "/index.ts", "/index.tsx"];

function resolveSpecifier(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package specifier -> node_modules
  for (const ext of EXT_CANDIDATES) {
    const cand = base + ext;
    try {
      const st = fs.statSync(cand);
      if (st.isFile()) return cand;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

const IMPORT_RE =
  /(?:^|[\s;{}()])(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?)\s*from\s*["']([^"']+)["']|(?:^|[\s;{}()])import\s*\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|(?:^|[\s;{}()])import\s+["']([^"']+)["']/g;

function importsOf(file) {
  const text = read(file);
  const res = [];
  let m;
  const re = new RegExp(IMPORT_RE.source, "g");
  while ((m = re.exec(text))) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (!spec) continue;
    const r = resolveSpecifier(file, spec);
    if (r) res.push({ spec, resolved: r });
  }
  return res;
}

// Build reverse edges once.
const importers = new Map(); // target -> Set<importer>
const children = new Map(); // source -> string[] resolved
for (const f of allFiles) {
  const deps = importsOf(f);
  const uniq = [...new Set(deps.map((d) => d.resolved))];
  children.set(f, uniq);
  for (const d of deps) {
    if (!importers.has(d.resolved)) importers.set(d.resolved, new Set());
    importers.get(d.resolved).add(f);
  }
}

// ---------------------------------------------------------------------------
// 3. Liveness: BFS from entry points (ignoring cross-boundary self-loops).
// ---------------------------------------------------------------------------
const live = new Set();
const q = [...entryPoints];
while (q.length) {
  const f = q.pop();
  if (live.has(f)) continue;
  live.add(f);
  for (const c of children.get(f) || []) {
    if (!live.has(c)) q.push(c);
  }
}
console.error(`live files: ${live.size} / ${allFiles.length}`);

// ---------------------------------------------------------------------------
// 4. Per-service-module importer inventory.
// ---------------------------------------------------------------------------
const serviceFiles = allFiles
  .filter((f) => f.startsWith(SERVICES + path.sep))
  .map((f) => path.relative(ROOT, f).split(path.sep).join("/"))
  .sort();

const results = [];
for (const rel of serviceFiles) {
  const abs = path.join(ROOT, rel);
  const imps = [...(importers.get(abs) || [])].map((f) => path.relative(ROOT, f).split(path.sep).join("/")).sort();
  const liveImps = imps.filter((f) => live.has(path.join(ROOT, f)));
  const deadImps = imps.filter((f) => !live.has(path.join(ROOT, f)));
  const text = read(abs);
  const lines = text.split("\n").length;
  // object literals of the form .from('x') / .rpc('x') referenced in this file
  const objects = new Set();
  const or1 = /\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]\s*\)/g;
  const or2 = /\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g;
  let m;
  while ((m = or1.exec(text))) objects.add(m[1]);
  while ((m = or2.exec(text))) objects.add(m[1]);
  const exportedNames = new Set();
  const expRe = /export\s+(?:async\s+)?(?:const|function|class|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/g;
  while ((m = expRe.exec(text))) exportedNames.add(m[1]);
  results.push({
    file: rel,
    lines,
    importerCount: imps.length,
    importers: imps,
    liveImporterCount: liveImps.length,
    liveImporters: liveImps,
    deadImporterCount: deadImps.length,
    deadImporters: deadImps,
    selfLive: live.has(abs),
    supabaseObjects: [...objects].sort(),
    exportedNames: [...exportedNames].sort(),
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  method: {
    roots: "Next.js entry points: app|pages route/page/layout/loading/error/not-found/template/default/route files, middleware.ts, next.config.*",
    importResolution: "static regex over import/export-from, dynamic import(), require(), bare side-effect import; @/* -> repo root, relative resolved; extensionless + /index resolution",
    liveness: "BFS over the resolved import graph from entry points; a file not reached is DEAD (nothing reachable can execute it)",
    caveat: "regex-based import extraction; dynamic string-concatenated specifiers are not resolvable and are reported separately as unresolved",
  },
  totals: {
    serviceFiles: results.length,
    totalLines: results.reduce((a, r) => a + r.lines, 0),
    zeroImporter: results.filter((r) => r.importerCount === 0).length,
    onlyDeadImporters: results.filter((r) => r.importerCount > 0 && r.liveImporterCount === 0).length,
    withLiveImporters: results.filter((r) => r.liveImporterCount > 0).length,
  },
  files: results,
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
