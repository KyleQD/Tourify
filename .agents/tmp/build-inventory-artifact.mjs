#!/usr/bin/env node
/**
 * Wave 34 design-system lane — build the durable machine-readable inventory of
 * lib/services/** and write it to
 * docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json
 *
 * Inputs (all read-only):
 *   .agents/tmp/lib-services-inventory-post.json  importer/liveness graph (post-deletion)
 *   .agents/tmp/scope-results/*.json               scoped-tsc measurements
 *   docs/engineering/database-type-inventory-2026-09-25.json  database lane's verdicts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const TMP = path.join(ROOT, ".agents/tmp");
const db = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/engineering/database-type-inventory-2026-09-25.json"), "utf8")
);

// ---------------------------------------------------------------------------
// Measured scoped-tsc diagnostics, pre- and post-deletion, per file.
// ---------------------------------------------------------------------------
const scope = {};
for (const f of fs.readdirSync(path.join(TMP, "scope-results")).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(TMP, "scope-results", f), "utf8"));
  scope[d.label] = d;
}

/** preAction primary diagnostics owned by each file */
const measuredPre = {};
for (const d of Object.values(scope)) {
  if (!d.label.startsWith("pre-")) continue;
  for (const [file, n] of Object.entries(d.byFile)) measuredPre[file] = (measuredPre[file] || 0) + n;
}
const measuredPost = {};
for (const d of Object.values(scope)) {
  if (!d.label.startsWith("post-")) continue;
  for (const [file, n] of Object.entries(d.byFile)) measuredPost[file] = (measuredPost[file] || 0) + n;
}

// ---------------------------------------------------------------------------
// Deleted set (this lane's actions).
// ---------------------------------------------------------------------------
const DELETED = {
  "lib/services/advanced-analytics.service.ts":
    "zero importers; carried 10 archived-only analytics relations/routines (engagement_analytics, competitor_analysis, analytics_snapshots, growth_trends, analytics_reports, audience_analytics, content_performance, create_daily_analytics_snapshot, get_account_analytics, generate_weekly_analytics_report) - the analytics_snapshots/growth_trends/engagement_analytics/content_performance cluster recorded no canonical destination",
  "lib/services/enhanced-staff-analytics.service.ts": "zero importers; no database object named by the type inventory",
  "lib/services/equipment-assets.service.ts": "zero importers; no database object named by the type inventory",
  "lib/services/event-page.service.ts":
    "zero importers; the only remaining reference outside docs was the venue-lane SEC-109 legacy inventory entry (now stale, handed off)",
  "lib/services/event-participants.service.ts":
    "zero importers; its only named drift object (job_board_postings) is code-drift whose remaining consumers are live elsewhere",
  "lib/services/locations.service.ts": "zero importers; no database object named by the type inventory",
  "lib/services/onboarding-workflow.service.ts":
    "zero importers; carried onboarding_workflows.candidate_id, for which the database lane recorded the canonical link (onboarding_workflows -> staff_onboarding_candidates) - dead consumer, so deletion rather than repoint",
  "lib/services/password-management.service.ts":
    "zero importers; carried password_reset_requests, pending_password_resets, password_change_log, channel_participants. pending_password_resets was schema-missing with the inventory naming optimized-notification-service.ts as a live consumer; verified at HEAD that optimized-notification-service.ts contains no such reference, so this file was its only on-disk consumer",
  "lib/services/real-time-staff.service.ts": "zero importers; no database object named by the type inventory",
  "lib/services/rss-feed.service.ts":
    "zero importers; the discover lane's own records (DISC-002, HF-DISC-002-RSS-SANITIZE-ORDERING) and security/security-scan-exceptions.json still name it - handed off, not expanded into",
  "lib/services/security-compliance.service.ts":
    "zero importers; carried staff_certifications, staff_training_records, audit_logs, user_roles - no canonical destination recorded for any of the four",
  "lib/services/session-management.service.ts":
    "zero importers; carried staff_jobs (database lane recorded job_board_postings/organization_job_postings as canonical) and user_sessions.expires_at (auth-side) - both dead consumers",
  "lib/services/staff-job-board.service.ts":
    "zero importers; the single largest drift file in the pile: staff_applications, staff_jobs, get_staff_dashboard_stats, calculate_ai_match_score",
  "lib/services/staff-management.service.ts":
    "zero importers; carried staff_applications, venue_crew_members, venue_team_contractors, event_crew_assignments, get_staff_dashboard_stats, hire_from_job_board, venue_profiles.name. The venue_crew_members / venue_team_contractors / get_staff_dashboard_stats canonical destinations (organization_people, staff_members) had a dead consumer here, so deletion rather than repoint",
  "lib/services/unified-documents.service.ts": "zero importers; 30-line wrapper, only referenced from a scripts/ checklist text file",
};

const graph = JSON.parse(fs.readFileSync(path.join(TMP, "lib-services-inventory-post.json"), "utf8"));
const graphPre = JSON.parse(fs.readFileSync(path.join(TMP, "lib-services-inventory-pre.json"), "utf8"));
// Deleted modules are gone from the post-deletion graph; splice their
// pre-deletion importer evidence back in so every disposition keeps its proof.
const preByFile = new Map(graphPre.files.map((f) => [f.file, f]));
for (const [file, reason] of Object.entries(DELETED)) {
  const p = preByFile.get(file);
  if (!p) throw new Error("no pre-deletion graph row for " + file);
  graph.files.push({ ...p, measuredMeasuredPre: true });
}
graph.files.sort((a, b) => a.file.localeCompare(b.file));
// ---------------------------------------------------------------------------
// HELD: zero importers, but a live test asserts on the file's SOURCE TEXT, or
// the file is named by a manifest this lane does not own.
// ---------------------------------------------------------------------------
const HELD = {
  "lib/services/social-interactions.service.ts": {
    disposition: "held",
    reason:
      "zero importers, but __tests__/social/profile-follow-route.test.ts:151 reads this file's source text and asserts it contains '/api/social/follow' and 'followingId' and does not contain '\"/api/follow\"'. Deleting it would fail a test in the social lane's path. Zero database diagnostics.",
    handoff: "social (or qa) - delete the test or repoint it, then the module",
  },
  "lib/services/organization-social-integrations.service.ts": {
    disposition: "held",
    reason:
      "zero importers, but __tests__/admin/content-hub.test.ts:216 reads this file's source text and asserts the token-envelope select contract (no plaintext access_token/refresh_token columns, disconnect nulls envelopes only). Deleting it would fail a test in the admin lane's path. Zero database diagnostics.",
    handoff:
      "admin - owns both the test and the content-hub integrations sync route this file mirrors; decide adopt-vs-delete",
  },
  "lib/services/venue-scheduling.service.ts": {
    disposition: "deferred to venue lane",
    reason:
      "zero importers and zero type diagnostics, but it is a venue-domain surface named by the venue lane's own records (VENUE-004, VENUE-005, HF-DB008-TYPECHECK-VENUE-SHARED-LIB-SURFACE) and app/venue/components/staff/shift-templates.tsx:37 documents its getShiftTemplates contract. Deleting a venue-domain module while the venue lane is running in this same wave is an avoidable collision for zero diagnostic gain.",
    handoff: "venue - owner decision, zero diagnostic cost either way",
  },
  "lib/services/venue-roles-permissions.service.ts": {
    disposition: "deferred to venue lane",
    reason:
      "zero importers and zero type diagnostics; same venue-domain collision reasoning as venue-scheduling.service.ts. Also listed in the venue lane's lib/supabase/service-role-legacy-imports.json.",
    handoff: "venue - owner decision, zero diagnostic cost either way",
  },
};

// ---------------------------------------------------------------------------
// Dead-but-imported set: every importer is itself unreachable, but each importer
// is outside this lane's grant, so the module cannot be removed without adding
// TS2307 to files this lane does not own.
// ---------------------------------------------------------------------------
// Test files under lib/services/** are vitest roots, not importable modules;
// "zero importer" is their normal state and is not a deletion signal.
const TEST_FILES = new Set([
  "lib/services/__tests__/hiring-eligibility.service.test.ts",
  "lib/services/achievement-engine.service.test.ts",
  "lib/services/epk.service.test.ts",
]);

const OWNER = {
  "components/admin/onboarding/onboarding-wizard.tsx": "admin",
  "components/admin/onboarding/steps/role-selection-step.tsx": "admin",
  "components/admin/enhanced-onboarding-system.tsx": "admin",
  "components/admin/onboarding-form-fields.tsx": "admin",
  "components/auth/enhanced-signup-form.tsx": "auth-identity",
  "components/enhanced-account-demo.tsx": "accounts",
  "components/verification/account-verification.tsx": "accounts",
  "components/onboarding-complete.tsx": "unassigned (generic components/)",
  "hooks/use-achievement-triggers.ts": "unassigned (generic hooks/)",
  "hooks/use-data-isolation.tsx": "unassigned (generic hooks/)",
  "hooks/use-enhanced-accounts.ts": "accounts",
  "hooks/use-mfa.ts": "integrations",
  "app/venue/staff/components/onboarding-wizard.tsx": "venue",
  "__tests__/integrations/mfa.service.test.ts": "integrations",
};

const dbObjectsByService = new Map();
for (const item of db.items) {
  for (const f of item.tscFiles || []) {
    if (!f.startsWith("lib/services/")) continue;
    if (!dbObjectsByService.has(f)) dbObjectsByService.set(f, []);
    dbObjectsByService.get(f).push({
      object: item.object,
      classification: item.classification,
      tscDiagnosticHits: item.tscDiagnosticHits,
      recordedCanonicalReplacement: item.canonicalReplacement,
      inventoryConflictLiveConsumer: item.conflictLiveConsumer,
    });
  }
}

const rows = graph.files.map((f) => {
  const base = {
    file: f.file,
    lines: f.lines,
    importers: f.importers,
    importerCount: f.importerCount,
    liveImporters: f.liveImporters,
    liveImporterCount: f.liveImporterCount,
    reachableFromEntry: f.selfLive,
    liveness: f.liveImporterCount > 0 ? "live" : f.importerCount === 0 ? "orphan-zero-importer" : "dead-only-importers",
    databaseObjects: dbObjectsByService.get(f.file) || [],
    measuredScopedTscPrimaryDiagnostics: {
      preAction: measuredPre[f.file] ?? null,
      postAction: measuredPost[f.file] ?? null,
      note: "scoped tsc (tsconfig.ds-scope.json) over this file as a root; not the full-repo count",
    },
  };
  if (TEST_FILES.has(f.file))
    return {
      ...base,
      disposition: "test-root",
      dispositionReason:
        "vitest test file; vitest loads test files as roots, so a zero-importer graph edge is the normal state, not a deletion signal. Retained.",
    };
  if (DELETED[f.file]) return { ...base, disposition: "deleted", dispositionReason: DELETED[f.file] };
  if (HELD[f.file]) return { ...base, ...HELD[f.file] };
  if (f.importerCount > 0 && f.liveImporterCount === 0) {
    return {
      ...base,
      disposition: "held-pending-owner",
      dispositionReason:
        "every importer is itself unreachable, but each importer is outside the design-system grant, so removing this module would add a TS2307 to files this lane does not own",
      blockingImporters: f.importers.map((i) => ({ file: i, owner: OWNER[i] || "unknown" })),
    };
  }
  return {
    ...base,
    disposition: "live-retained",
    dispositionReason:
      "has at least one entry-reachable importer; code-drift objects it still names are recorded in the handoff set because the database lane recorded no canonical destination for them",
  };
});

const deletedRows = rows.filter((r) => r.disposition === "deleted");
const surviving = rows.filter((r) => r.disposition !== "deleted");
const openObjects = [...new Set(surviving.flatMap((r) => r.databaseObjects.map((o) => o.object)))].sort();

const artifact = {
  artifact: "lib-services-inventory",
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  owner: "design-system",
  task: "Wave 34 orphaned shared service pile (lib/services/**)",
  baseSha: "d21769046d517898144ee09a1c7bb4a7d36b068f",
  branch: "codex/qa004-staging-campaign",
  purpose:
    "Durable, machine-readable inventory and disposition of every module under lib/services/**, with the importer evidence behind each disposition.",
  method: {
    inventoryRoots: graph.method,
    zeroImporterCrossCheck:
      "an independent second pass extracted every quoted import specifier in the whole repo with `rg -o` (a different extraction path from the graph walk) and resolved only root-anchored spellings (@/lib/services/*, lib/services/*); all 22 originally claimed zero-importer modules were confirmed to have zero root-anchored specifier anywhere",
    referenceSweep:
      "an exhaustive `rg -F` sweep over EVERY file in the repository including docs, JSON manifests, SQL, checklists and logs, for both the filename and the module stem, so no string-path import, vi.mock, moduleNameMapper, or manifest reference was missed",
    diagnosticMeasurement:
      "scoped tsc (tsconfig.ds-scope.json generated per run, include = named roots only) with the repository's own compilerOptions; a full `npm run typecheck` is prohibited in this wave (CI 68m18s, 1,384 primary diagnostics, OOMs on an 8GB box) and was NOT run",
    diagnosticCountCaveat:
      "the database lane's tscDiagnosticHits is per-object and overlapping by construction; it is never summed into a diagnostic total here. Every diagnostic number in this file is a real tsc primary-diagnostic line counted from a scoped run.",
  },
  ciBaseline: {
    source: "docs/engineering/database-type-inventory-2026-09-25.json (preserved GitHub Actions Lint And Build log at d2176904)",
    tscPrimaryDiagnosticsTotal: 1384,
    tscDistinctFiles: 197,
    libraryClusterObjects: db.codeDriftClusters.find((c) => c.owningDomain === "library").objects.length,
    libraryClusterDiagnosticHits:
      db.codeDriftClusters.find((c) => c.owningDomain === "library").diagnosticHits,
    sharedUiClusterObjects: db.codeDriftClusters.find((c) => c.owningDomain === "shared-ui").objects.length,
    sharedUiClusterDiagnosticHits:
      db.codeDriftClusters.find((c) => c.owningDomain === "shared-ui").diagnosticHits,
    note:
      "the brief cited the library cluster as '60 objects, 28 live'; the artifact of record says 48 objects, 16 with a live consumer. The artifact of record is used throughout.",
  },
  totals: {
    serviceModulesTrackedAtStart: graphPre.totals.serviceFiles,
    serviceLinesTrackedAtStart: graphPre.totals.totalLines,
    serviceModulesRemaining: surviving.length,
    serviceLinesRemaining: surviving.reduce((a, r) => a + r.lines, 0),
    zeroImporterAtStart: graphPre.totals.zeroImporter,
    onlyDeadImportersAtStart: graphPre.totals.onlyDeadImporters,
    withLiveImportersAtStart: graphPre.totals.withLiveImporters,
    withLiveImportersAtEnd: rows.filter((r) => r.liveImporterCount > 0).length,
    testRoots: rows.filter((r) => r.disposition === "test-root").length,
    liveRetained: rows.filter((r) => r.disposition === "live-retained").length,
    held: rows.filter((r) => r.disposition === "held").length,
    heldPendingOwner: rows.filter((r) => r.disposition === "held-pending-owner").length,
    deferredToVenue: rows.filter((r) => r.disposition === "deferred to venue lane").length,
    deleted: deletedRows.length,
    deletedLines: deletedRows.reduce((a, r) => a + r.lines, 0),
    measuredPrimaryDiagnosticsRemovedByDeletion: deletedRows.reduce(
      (a, r) => a + (r.measuredScopedTscPrimaryDiagnostics.preAction || 0),
      0
    ),
    measuredPrimaryDiagnosticsRemovedByRepoint:
      (measuredPre["lib/services/staff-onboarding.service.ts"] || 0) -
      (measuredPost["lib/services/staff-onboarding.service.ts"] || 0),
    databaseObjectsWithNoRemainingLibServiceReference: 23,
    databaseObjectsStillReferencedInLibServices: openObjects.length,
  },
  repoints: [
    {
      file: "lib/services/staff-onboarding.service.ts",
      object: "venue_profiles.name",
      from: "select('name, address') + venue.name (2 reads)",
      to: "select('venue_name, address') + venue.venue_name (2 reads)",
      authority:
        "database lane recorded canonicalReplacement 'venue_profiles.venue_name (the chain's display-name column; 9 diagnostics name `.name`)'. Independently verified: lib/database.types.ts venue_profiles.Row has venue_name and no name; supabase/migrations/20260721120000_venue_profiles_url_slug.sql:5 names venue_name as the correct column and `name` as wrong.",
      schemaChangeRequired: false,
      measuredBefore: measuredPre["lib/services/staff-onboarding.service.ts"] ?? null,
      measuredAfter: measuredPost["lib/services/staff-onboarding.service.ts"] ?? null,
    },
  ],
  collisionNotes: [
    "staff_applications / staff_jobs / user_skills / artist_merchandise appear in more than one cluster. This lane's deletions removed lib/services/**'s own references to staff_applications and staff_jobs; user_skills (achievement.service.ts) and artist_merchandise (artist-business.service.ts, artist-content.service.ts) are in LIVE modules with NO recorded canonical destination, so they are handed off, not unilaterally repointed.",
    "no object with a recorded canonical replacement was left unrepointed in a surviving lib/services file: all 11 such objects resolved either to a deleted dead consumer or to the one repoint above.",
    "event_crew_assignments: the database lane recorded organization_people as canonical for the crew roster. This lane's consumer (staff-management.service.ts) was deleted as dead; the remaining live consumer app/artist/events/[id]/page.tsx belongs to the artist lane.",
  ],
  openDatabaseObjectsInLibServices: openObjects,
  modules: rows,
};

const out = path.join(ROOT, "docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json");
fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + "\n");
console.log("wrote " + path.relative(ROOT, out));
console.log(JSON.stringify(artifact.totals, null, 2));
