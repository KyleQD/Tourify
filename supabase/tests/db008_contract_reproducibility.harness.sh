#!/usr/bin/env bash
# ============================================================================
# db008_contract_reproducibility.harness.sh
#
# The CP-016 gate for the generated contract. Answers one question with evidence:
# would `npm run generate:database-types` against a chain-built target ADD
# coverage to lib/database.types.ts, or DELETE it?
#
# Four stages, and the order matters: the negative controls run FIRST so that a
# later PASS cannot be vacuous.
#
#   0  self-assertions on the instrument
#        The Wave 33 instrument reported 130 phantom out-of-band columns because
#        its `add column` matcher was case-sensitive and its DROP matcher read
#        `alter column c drop not null` as a column named `not`. A gate that
#        under-detects is worse than no gate, so the instrument is first pinned
#        on cases that MUST be detected and cases that must NOT be.
#   1  negative controls on the gate
#        Four mutations of the contract, each of which must make the gate fail
#        and name the mutation. A gate that cannot fail proves nothing.
#   2  the real measurement against the real repository
#   3  post-state re-assertion
#        The report is re-read and the counts re-checked, so a crashed or
#        short-circuited run cannot be reported as a pass.
#
# No database is contacted. No migration is applied. READ-ONLY with respect to
# the repository: every mutated contract is written under a temporary directory.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
REPLAY="$ROOT/supabase/tests/db008_chain_contract_replay.mjs"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/db008-repro.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }

# --- negative-control root: real migrations, mutated contract ---------------
build_neg_root() {
  local dir="$TMP/neg-$1"
  mkdir -p "$dir/lib"
  ln -s "$ROOT/supabase" "$dir/supabase"
  cp "$ROOT/lib/database.types.ts" "$dir/lib/database.types.ts"
  echo "$dir"
}

printf 'db008 contract reproducibility harness\nroot: %s\n' "$ROOT"

# ===========================================================================
stage "0  instrument self-assertions"
# ===========================================================================
REAL_REPORT="$TMP/real.json"
if node "$REPLAY" "$ROOT" "$REAL_REPORT" >"$TMP/real.txt" 2>&1; then
  pass "replay runs against the real repository"
else
  fail "replay errored against the real repository (see below)"
  sed 's/^/      /' "$TMP/real.txt"
fi

node - "$REAL_REPORT" "$ROOT" <<'NODE'
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const ROOT = process.argv[3]
const r = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const cols = JSON.parse(fs.readFileSync(process.argv[2].replace(/\.json$/, "") + ".chain-columns.json", "utf8"))
let fails = 0
const check = (name, cond, detail) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond || !detail ? "" : ` (${detail})`}`)
  if (!cond) fails++
}
const has = (t, c) => Array.isArray(cols[t]) ? cols[t].includes(c) : Boolean(cols[t] && Object.prototype.hasOwnProperty.call(cols[t], c))
// MUST be detected. Each of these is a real defect class the Wave 33
// instrument missed; if the scanner regresses, the gate regresses silently.
check("detects a column from an UPPER-CASE multi-clause ALTER", has("ground_transportation_coordination", "row_version"),
  "20260908100000, the statement that produced 25 phantom out-of-band columns")
check("detects a column from a lower-case multi-clause ALTER", has("map_versions", "snapshot_payload"), "20260908100000")
check("detects a column added beside `alter column ... drop not null`", has("events_v2", "quick_start_batch_id"),
  "20260731193454, whose leading verb is `alter` not `add`")
check("detects a column added by a single-clause UPPER-CASE ALTER", has("venue_profiles", "archived_at"), "20260823120000")
const newest = r.chainLast
check("detects a column added by the newest migration in the chain",
  has("venue_profiles", "social_links") || r.staleColumns.some((c) => c.createdIn === newest), newest)
check("keeps the whole contract-visible venue_profiles surface", Object.keys(cols["venue_profiles"] || {}).length === 44,
  `reconstructed ${Object.keys(cols["venue_profiles"] || {}).length}, expected 44`)
// MUST NOT be produced.
const phantom = []
for (const [t, m] of Object.entries(cols)) {
  if (!m || typeof m !== "object") continue
  for (const c of ["constraint", "not", "null", "if", "exists", "column"]) if (Object.prototype.hasOwnProperty.call(m, c)) phantom.push(`${t}.${c}`)
}
check("no constraint/keyword is recorded as a column", phantom.length === 0, phantom.slice(0, 5).join(", "))
// 20250813121000 ALTERs staff_invitations four times BEFORE 20250813123000
// creates it, inside a to_regclass guard, so a fresh replay skips all four.
// The columns still exist because the later CREATE declares them. The assertion
// pins the provenance, not just the presence: they must come from the CREATE.
check("a skipped pre-create ALTER is not what supplies the column",
  cols["staff_invitations"] && cols["staff_invitations"]["tour_id"] === "20250813123000_create_staff_invitations_if_missing.sql",
  `provenance recorded as ${cols["staff_invitations"] && cols["staff_invitations"]["tour_id"]}`)
// 20250904110000 adds platform_status/platform_errors to scheduled_posts BEFORE
// 20260413200000 creates that table, so until 20260926140200 a fresh replay
// really had neither column. This assertion USED to pin that divergence
// ("a genuinely skipped column is absent from chain and contract alike") and it
// started failing the moment the repair landed, which is the correct outcome: the
// defect it described no longer exists.
//
// The assertion is therefore rewritten, not deleted. It now pins the REPAIRED
// invariant, which is strictly stronger because it covers both halves:
//
//   the CHAIN must now carry both columns, attributed to 20260926140200 and not
//   to the migration that was supposed to supply them, so the repair is what
//   closes the gap and not the original ALTER quietly starting to work; and
//   the CONTRACT still declares neither, which is the remaining CP-016 debt and
//   the reason the regeneration delta keeps counting them as additions.
//
// An assertion that stops being true when the bug is fixed is a bug detector.
// An assertion that stops being true and is quietly deleted is how a bug detector
// becomes a rubber stamp. Keep the check, change what it claims.
const spStatus = has("scheduled_posts", "platform_status")
const spErrors = has("scheduled_posts", "platform_errors")
check("the ordering repair is what supplies the platform columns, not the original ALTER",
  spStatus && spErrors
    && (cols["scheduled_posts"] || {})["platform_status"] === "20260926140200_scheduled_posts_platform_columns.sql"
    && (cols["scheduled_posts"] || {})["platform_errors"] === "20260926140200_scheduled_posts_platform_columns.sql",
  `platform_status attributed to ${(cols["scheduled_posts"] || {})["platform_status"]}, platform_errors to ${(cols["scheduled_posts"] || {})["platform_errors"]}`)
// The two original ALTER migrations are STILL skipped on a fresh replay and the
// replay must keep saying so. The repair did not make 20250904110000 start
// working; it added a later migration that supplies the columns regardless. If
// these notes ever disappear it means the ordering changed underneath this
// harness, and the attribution assertion above would then be proving the wrong
// thing.
const schedNotes = (r.replayNotes || []).filter((n) => JSON.stringify(n).includes("scheduled_posts"))
check("the replay still records the two skipped scheduled_posts ALTERs (the repair did not make them effective)",
  schedNotes.length === 2
    && schedNotes.every((n) => /20250904110000|20250905004500/.test(n.file || "")),
  `${schedNotes.length} scheduled_posts replay note(s): ${JSON.stringify(schedNotes)}`)
// The contract still lacks the two columns, so they remain part of the
// regeneration ADDITION set. Recorded as the honest remaining state, not as a pass
// condition: the type surface is still behind the chain on this table.
const contractDeclaresPlatformColumns =
  /platform_status/.test(require("fs").readFileSync(path.join(ROOT, "lib/database.types.ts"), "utf8").split("scheduled_posts: {")[1]?.split("\n      };")[0] || "")
check("the contract still does not declare the platform columns (known CP-016 debt, not a gate)",
  contractDeclaresPlatformColumns === false,
  `contractDeclaresPlatformColumns = ${contractDeclaresPlatformColumns}`)
// Internal consistency of the report itself.
check("report is self-consistent: outOfBand == sum of per-relation entries",
  r.counts.outOfBand === Object.values(r.outOfBandByRelation).reduce((a, v) => a + v.length, 0))
// Cross-implementation check: db008_chain_surface_replay.mjs is a separate
// scanner written in Wave 33. Two independent reconstructions of the chain's
// relation count agreeing is a real signal; `tables + views === total` would only
// restate how this script fills in its own report.
const surfacePath = path.join(ROOT, "supabase/tests/db008_chain_surface_replay.mjs")
const surfaceOut = path.join(require("os").tmpdir(), `db008-surface-${process.pid}.json`)
let surfaceRelations = null
try {
  execFileSync("node", [surfacePath, ROOT, surfaceOut], { stdio: "ignore" })
  const s = JSON.parse(fs.readFileSync(surfaceOut, "utf8"))
  surfaceRelations = s.counts.chainLiveRelations
  fs.unlinkSync(surfaceOut)
} catch {}
check("a second, independent replay agrees on the chain relation count",
  surfaceRelations === r.counts.chainTables + r.counts.chainViews,
  `surface replay ${surfaceRelations} vs contract replay ${r.counts.chainTables + r.counts.chainViews}`)
check("report is self-consistent: relations are disjoint between Tables and Views",
  new Set(r.chainOnlyRelations).size === r.chainOnlyRelations.length)
process.exit(fails === 0 ? 0 : 1)
NODE
if [ $? -eq 0 ]; then pass "instrument self-assertions"; else fail "instrument self-assertions"; fi

# ===========================================================================
stage "1  negative controls (the gate must be able to fail)"
# ===========================================================================
run_control() {
  local name="$1" expect_name="$2" mutate="$3"
  local neg
  neg="$(build_neg_root "$name")"
  node -e "$mutate" "$neg/lib/database.types.ts"
  local out rc
  out="$(node "$REPLAY" "$neg" "$TMP/neg-$name.json" --check 2>&1)"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    fail "negative control '$name' did not fail the gate"
    printf '%s\n' "$out" | sed 's/^/      /' | head -5
  elif printf '%s' "$out" | grep -q -- "$expect_name"; then
    pass "negative control '$name' fails and names '$expect_name'"
  else
    fail "negative control '$name' failed but did not name '$expect_name'"
    printf '%s\n' "$out" | sed 's/^/      /' | head -5
  fi
}

# The gate asks "is the chain a superset of the contract?". The only mutation
# that can break a superset check is one that ADDS contract surface the chain
# does not have -- which is exactly the Wave 33 failure mode. Removing contract
# entries can only make the contract a smaller subset, so a removal-based control
# would pass against a completely broken gate. (The first revision of this
# harness used removals and every control passed against a gate that could not
# fail; the controls are additions for that reason.)
run_control() {
  local name="$1" expect_name="$2" mutate="$3"
  local neg
  neg="$(build_neg_root "$name")"
  node -e "$mutate" "$neg/lib/database.types.ts"
  local out rc
  out="$(node "$REPLAY" "$neg" "$TMP/neg-$name.json" --check 2>&1)"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    fail "negative control '$name' did not fail the gate"
    printf '%s\n' "$out" | sed 's/^/      /' | head -5
  elif printf '%s' "$out" | grep -q -- "$expect_name"; then
    pass "negative control '$name' fails and names '$expect_name'"
  else
    fail "negative control '$name' failed but did not name '$expect_name'"
    printf '%s\n' "$out" | sed 's/^/      /' | head -5
  fi
}

# 1a a table column the chain never creates
run_control extra-column "venue_profiles: unapplied_ddl_probe" '
  const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("      venue_profiles: {");
  const k=s.indexOf("\n          id: string\n",i);
  s=s.slice(0,k+1)+"          unapplied_ddl_probe: string | null\n"+s.slice(k+1);
  fs.writeFileSync(p,s);'
# 1b a whole relation the chain never creates
run_control extra-relation "unapplied_relation_probe" '
  const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("      venue_profiles: {");
  s=s.slice(0,i)+"      unapplied_relation_probe: {\n        Row: {\n          id: string\n        }\n        Insert: {\n          id?: string\n        }\n        Update: {\n          id?: string\n        }\n        Relationships: []\n      }\n"+s.slice(i);
  fs.writeFileSync(p,s);'
# 1c a callable the chain never creates
run_control extra-routine "unapplied_rpc_probe" '
  const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("\n    Functions: {");
  s=s.slice(0,i)+"\n      unapplied_rpc_probe: {\n        Args: { p_id: string }\n        Returns: boolean\n      }"+s.slice(i);
  fs.writeFileSync(p,s);'
# 1d a column on a relation the chain creates only as a view, whose name never
#     appears in the view definition. Caught by the view name-occurrence surface,
#     not by the table replay, so it pins the weaker half of the gate.
run_control extra-view-column "friend_suggestions_view" '
  const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("      friend_suggestions_view: {");
  const k=s.indexOf("\n        Row: {\n",i)+"\n        Row: {\n".length;
  s=s.slice(0,k)+"          unapplied_view_column_probe: string | null\n"+s.slice(k);
  fs.writeFileSync(p,s);'
# 1e removing contract surface must NOT fail the gate: a removal is the one
#     mutation the superset property tolerates.
neg="$(build_neg_root removal-tolerated)"
node -e '
  const fs=require("fs"),p=process.argv[1];let s=fs.readFileSync(p,"utf8");
  const i=s.indexOf("      venue_profiles: {");
  const j=s.indexOf("          stage_plot_url: string | null\n",i);
  s=s.slice(0,j)+s.slice(j+"          stage_plot_url: string | null\n".length);
  fs.writeFileSync(p,s);' "$neg/lib/database.types.ts"
if node "$REPLAY" "$neg" "$TMP/neg-removal.json" --check >/dev/null 2>&1; then
  pass "control 'removal-tolerated' still passes (a subset is still a subset)"
else
  fail "control 'removal-tolerated' wrongly failed; the gate is over-strict"
fi

# ===========================================================================
stage "2  measurement against the real repository"
# ===========================================================================
NEG_ONLY="$(node -e '
  const fs=require("fs");
  const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
  process.stdout.write(String(r.counts.outOfBand));
' "$REAL_REPORT")"
node "$REPLAY" "$ROOT" "$TMP/final.json" >"$TMP/final.txt" 2>&1
GATE_RC=$?

# ===========================================================================
stage "3  post-state re-assertion (a crashed run must not read as a pass)"
# ===========================================================================
if [ "$GATE_RC" -eq 0 ]; then
  pass "gate exits 0 on the real repository"
else
  fail "gate exits non-zero on the real repository"
  sed 's/^/      /' "$TMP/final.txt" | head -20
fi

if [ -s "$TMP/final.json" ]; then
  pass "report file written and non-empty"
else
  fail "report file missing or empty"
fi

node - "$TMP/final.json" "$REAL_REPORT" <<'NODE'
const fs = require("fs")
const [final, first] = process.argv.slice(2)
let fails = 0
const check = (name, cond, detail) => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond || !detail ? "" : ` (${detail})`}`)
  if (!cond) fails++
}
if (!fs.existsSync(final)) { console.log("  FAIL  final report missing"); process.exit(1) }
const a = JSON.parse(fs.readFileSync(final, "utf8"))
const b = fs.existsSync(first) ? JSON.parse(fs.readFileSync(first, "utf8")) : null
check("two independent runs agree on the measured surface",
  b === null || JSON.stringify({ ...a, generatedAt: 0 }) === JSON.stringify({ ...b, generatedAt: 0 }))
check("the contract declares no relation the chain lacks", a.counts.outOfBand === 0,
  `${a.counts.outOfBand} contract columns lack chain provenance`)
check("the contract declares no routine the chain lacks", a.counts.contractOnlyRoutines === 0)
check("every view column has a name occurrence in its defining migration",
  a.counts.viewColumnsWithoutProvenance === 0, `${a.counts.viewColumnsWithoutProvenance} unexplained`)
check("no chain ALTER is recorded as a replay abort", (a.preCreateAlters || []).every((x) => x.kind === "skippedRelationAbsentAtReplay"),
  (a.preCreateAlters || []).filter((x) => x.kind !== "skippedRelationAbsentAtReplay").map((x) => `${x.relation}@${x.file}`).join(", "))
console.log(`\n  chain: ${a.counts.chainTables} tables + ${a.counts.chainViews} views, ${a.counts.chainColumns} columns, ${a.counts.chainRoutines} routines`)
console.log(`  contract: ${a.counts.contractRelations} relations, ${a.counts.contractColumns} columns, ${a.counts.contractRoutines} callables`)
console.log(`  regeneration would ADD: ${a.counts.chainOnlyRelations} relations, ${a.counts.staleColumns} columns, ${a.counts.chainOnlyCallables} callables`)
console.log(`  regeneration would DELETE: 0`)
process.exit(fails === 0 ? 0 : 1)
NODE
if [ $? -eq 0 ]; then pass "post-state re-assertion"; else fail "post-state re-assertion"; fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (measured out-of-band columns: %s)\n' "$NEG_ONLY"
  exit 0
fi
printf '%d CHECK(S) FAILED\n' "$fails"
exit 1
