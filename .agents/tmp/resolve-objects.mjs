#!/usr/bin/env node
/**
 * Wave 34 design-system lane — FINAL classification of every database
 * code-drift object that had a lib/services/** consumer in the database lane's
 * inventory, evaluated against the post-deletion tree.
 *
 * For each object:
 *   - onDiskConsumers  : files under lib/services/** that still reference it
 *   - otherConsumers    : files elsewhere in the repo (another lane's to fix)
 *   - action            : deleted-consumer | repointed | handoff-<domain>
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const db = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/engineering/database-type-inventory-2026-09-25.json"), "utf8")
);

const libObjects = db.items.filter((i) => (i.tscFiles || []).some((f) => f.startsWith("lib/services/")));

function refsIn(dir, obj) {
  let res = "";
  try {
    res = execFileSync(
      "rg",
      ["--no-heading", "-n", "-F", obj, dir],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (e) {
    res = (e.stdout || "").toString();
  }
  const out = [];
  for (const line of res.split("\n")) {
    const m = /^([^:]+):(\d+):/.exec(line);
    if (m) out.push(`${m[1]}:${m[2]}`);
  }
  return out;
}

const rows = [];
for (const item of libObjects) {
  const obj = item.object;
  const base = obj.split(".")[0];
  const svc = refsIn("lib/services", base);
  rows.push({
    object: obj,
    classification: item.classification,
    tscDiagnosticHits: item.tscDiagnosticHits,
    recordedCanonicalReplacement: item.canonicalReplacement,
    inventoryLiveConsumers: item.liveConsumers,
    inventoryConflictLiveConsumer: item.conflictLiveConsumer,
    inventoryLibServiceConsumers: item.tscFiles.filter((f) => f.startsWith("lib/services/")),
    onDiskLibServiceRefs: svc,
  });
}

const totals = {
  objectsWithInventoryLibServiceConsumer: rows.length,
  inventoryHitSumNote:
    "tscDiagnosticHits SUM OVERLAPS (tsc repeats the rejected literal in the printed overload union); not a diagnostic total. See the inventory's diagnosticHitCountMethod.",
  nowZeroOnDiskLibServiceRefs: rows.filter((r) => r.onDiskLibServiceRefs.length === 0).length,
  stillReferencedInLibServices: rows.filter((r) => r.onDiskLibServiceRefs.length > 0).length,
};
const still = rows.filter((r) => r.onDiskLibServiceRefs.length > 0);
totals.remainingHitSumOverlapping = still.reduce((a, r) => a + r.tscDiagnosticHits, 0);

process.stdout.write(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scope: "objects the database lane attributed to a lib/services/** file",
      totals,
      resolvedByDeletion: rows.filter((r) => r.onDiskLibServiceRefs.length === 0),
      stillOpen: still,
    },
    null,
    2
  ) + "\n"
);
