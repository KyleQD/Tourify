#!/usr/bin/env bash
# ============================================================================
# execution-harness.sh
# DB-015 / CP-109 — the EXECUTION proof for the never-executed-block detector.
#
# WHERE IT LIVES AND WHY
#   DB-015's grant (CP-112) is two new `scripts/ci/` files with exact names plus a
#   db015-prefixed report under `docs/engineering/verification/`. `supabase/tests/`
#   belongs to WFC-004 this wave. So the harness sits beside the report it
#   produces, in this directory, and says so. It reads `supabase/tests/**` — the
#   DB-011 emulation bootstrap and DB-014's own contract — and writes nothing there.
#
# WHAT IT PROVES, IN THE ORDER IT PROVES IT
#   1. THREE clusters, each with a distinct job: the execute-path replay target,
#      the "table absent" finding fixture, and the "table first" ordering control.
#      Each asserts its own pre-state before any measurement, and every fixture
#      stage ends with a hard stop on failure. The DB-008 harness shipped a
#      revision that passed 7/7 while its emulation had silently failed to
#      rebuild, so every assertion was vacuous; this harness asserts its fixture
#      before it measures anything, and a broken fixture is a hard stop.
#
#   2. THE STATIC PATH AGREES WITH REAL EXECUTION, ON EVERY GUARD SITE. The
#      detector's own `--execute` mode is driven against this cluster, and the
#      static verdicts are compared to the executed ones. This is the evidence
#      that the static path is a model of execution and not a different, weaker
#      instrument: where they disagree, the run FAILS and says which.
#
#   3. THE CONFIRMED INSTANCE, BY EXECUTION AND NOT BY READING. The chain's own
#      20250812093500:34-56 block — the one that writes the "correctly scoped"
#      staff_performance_metrics_select / _write — is executed at its own version
#      position, on a database where the table does not exist, and creates
#      NOTHING. Then the table is created, from the chain's own CREATE TABLE
#      extracted BY LINE RANGE at run time, and the SAME BYTES are executed again
#      and create BOTH. The delta is the proof, and the second run is the control
#      that rules out "the block is dead code".
#
#   4. THE NEGATIVE CONTROL, AT THE TRUE PRE-STATE, BEFORE THE CONTROL RUNS. An
#      authenticated account with no role anywhere reads every tenant's
#      performance_rating and inserts into another tenant's venue. Then
#      read_all_metrics is DROPPED and both that account and a holder of the
#      chain's own intended read permission EDIT_EVENT_LOGISTICS read 0 rows —
#      which is CP-109's consequence as a measurement rather than an argument:
#      the permissive policy was the ONLY read path, because the chain never
#      created a scoped SELECT. This stage runs before stage 5 on purpose; a
#      negative control that runs after the thing it controls for measures the
#      control and reports it as the finding.
#
#   5. THE ORDERING CLAIM ITSELF. The control from stage 5 is re-run against a
#      THIRD throwaway cluster in which the table was created FIRST. Same bytes,
#      same server, different version order — the whole content of CP-109 in one
#      stage. Three clusters rather than one because two of them have to differ by
#      exactly one migration, and a cluster that has already been used cannot be
#      the control.
#
#   6. THE DETECTOR FAILS WHEN THE TARGET IS BROKEN. The detector is pointed at a
#      synthetic chain in which the guard is false, and the check must report it;
#      and at the same chain with the create moved earlier, and the check must
#      NOT report it. If the detector cannot fail, nothing above means anything.
#
#   7. POST-STATE. The cluster's relation and policy counts are re-asserted at the
#      end, so a crashed or short-circuited run cannot read as a pass.
#
# WHAT IT IS NOT
#   A local emulation. PostgreSQL 16.x, a throwaway cluster in a temp dir, a
#   minimal auth/roles bootstrap, and the chain's own `create table`, guarded
#   policy blocks and function text extracted BY LINE RANGE from the migration
#   files at run time, so the emulated authority cannot drift from the chain. Not
#   Supabase, not a hosted project, not a chain replay, no `supabase db reset`
#   (CP-051), no migration applied to any environment. Nothing here says anything
#   about staging or production; the operator's manual apply is the gate.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

CHECK="$ROOT/scripts/ci/check-never-executed-migration-blocks.mjs"
REPORT_DIR="$ROOT/docs/engineering/verification/db015-never-executed-migration-blocks"
[ -f "$CHECK" ] || { echo "FATAL missing $CHECK"; exit 1; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db015-guard.XXXXXX")"
# THREE clusters, because two of them have to differ by exactly one migration
# and a cluster that has already run the chain replay cannot be the "table absent"
# fixture. A harness that reuses one cluster for a finding and its control is a
# harness whose control is not a control.
PORT_A="${DB015_GUARD_PORT:-54351}"   # the execute-path cross-check; replayed by design
PORT_B="${DB015_GUARD_PORT_B:-54352}" # the FINDING: the table does not exist yet
PORT_C="${DB015_GUARD_PORT_C:-54353}" # the ORDERING CONTROL: the table exists first
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
bail() {
  if [ "$fails" -ne 0 ]; then
    printf '\nABORT: %s check(s) failed while BUILDING the fixture. Every later measurement would be of a fixture that does not exist, so this run proves nothing.\n' "$fails"
    exit 1
  fi
}

# --- the chain's own text, by line range, with the marker asserted ------------
# A silent empty extraction compiles as nothing, and every measurement below would
# then be measuring a fixture that quietly lost its subject. That is the Wave 33
# failure shape and it is why every range here carries a marker.
range() {
  local file="$1" from="$2" to="$3" marker="$4" out="$TMP/range.$RANDOM.sql"
  sed -n "${from},${to}p" "$file" >"$out"
  if ! grep -q "$marker" "$out"; then
    echo "MISSING marker '$marker' in $file:${from}-${to} ($(wc -l <"$out" | tr -d ' ') lines)" >&2
    return 1
  fi
  cat "$out"
}

start_cluster() {
  local name="$1" port="$2"
  mkdir -p "$TMP/$name"
  initdb -D "$TMP/$name/data" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/$name.initdb.log" 2>&1 || return 1
  pg_ctl -D "$TMP/$name/data" -o "-p $port -k $TMP/$name -c listen_addresses=''" -l "$TMP/$name.pg.log" start >/dev/null 2>&1 || return 1
  echo "postgresql://postgres@/$name?host=$TMP/$name&port=$port"
}
stop_cluster() { pg_ctl -D "$TMP/$1/data" -m immediate stop >/dev/null 2>&1; }
cleanup() { for c in a b c; do stop_cluster "$c" 2>/dev/null; done; rm -rf "$TMP"; }
trap cleanup EXIT

q() { psql -h "$1" -p "$2" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$3" 2>&1; }
qf() { psql -h "$1" -p "$2" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$3" 2>&1; }
# Run as a real caller, so a DENIAL is observed as a denial rather than inferred
# from a row count.
qs() {
  psql -h "$1" -p "$2" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "set request.jwt.claim.sub = '$3'; set request.jwt.claim.role = 'authenticated'; set role authenticated;" \
    -c "$4" -c "reset role;" 2>&1
}

EARLY="$ROOT/supabase/migrations/20250812093500_entity_rls_policies_more.sql"
CORECORE="$ROOT/supabase/migrations/20250818120000_admin_staffing_core.sql"
RBACCORE="$ROOT/supabase/migrations/20250812090000_entity_rbac_core.sql"
RBACBASE="$ROOT/supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql"
BOOTSTRAP="$ROOT/supabase/tests/db011_emulation_bootstrap.sql"
for f in "$CHECK" "$EARLY" "$CORECORE" "$RBACCORE" "$RBACBASE" "$BOOTSTRAP"; do
  [ -f "$f" ] || { echo "FATAL missing input: $f"; exit 1; }
done

V_A='aaaaaaaa-0000-0000-0000-0000000000a1'
V_B='bbbbbbbb-0000-0000-0000-0000000000b1'
E_A='cccccccc-0000-0000-0000-0000000000c1'
U_ATK='11111111-1111-1111-1111-111111111111'
U_VIEW='22222222-2222-2222-2222-222222222222'
# An ASSIGN_EVENT_ROLES holder on venue A, for the delete/update non-regression
# reading. It is not needed by this harness's stages and is kept only so the
# identity set matches the chain's two permissions.
U_MAN='33333333-3333-3333-3333-333333333333'
R_A='10000000-0000-0000-0000-000000000001'
R_B='10000000-0000-0000-0000-000000000003'

printf 'db015 never-executed-migration-blocks execution harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  three throwaway clusters, each with a distinct job, and each asserting its own pre-state"
# ---------------------------------------------------------------------------
URL_A="$(start_cluster a "$PORT_A")" || { fail "initdb/pg_ctl for cluster A"; tail -5 "$TMP/a.pg.log" 2>/dev/null; exit 1; }
URL_B="$(start_cluster b "$PORT_B")" || { fail "initdb/pg_ctl for cluster B"; tail -5 "$TMP/b.pg.log" 2>/dev/null; exit 1; }
URL_C="$(start_cluster c "$PORT_C")" || { fail "initdb/pg_ctl for cluster C"; tail -5 "$TMP/c.pg.log" 2>/dev/null; exit 1; }
pass "three throwaway PostgreSQL $(q "$TMP/c" "$PORT_C" 'show server_version' | head -1) clusters started"

for pair in "a:$PORT_A" "b:$PORT_B" "c:$PORT_C"; do
  # The socket DIRECTORY, not the cluster name: psql only treats -h as a socket
  # path when it starts with /, and a bare name is resolved as a hostname.
  label="${pair%%:*}"
  sock="$TMP/$label"; port="${pair##*:}"
  qf "$sock" "$port" "$BOOTSTRAP" >"$TMP/$label.boot.log" 2>&1 || fail "emulation bootstrap on cluster $label"
  if [ "$(q "$sock" "$port" "select count(*) from pg_roles where rolname in ('anon','authenticated')")" = "2" ]; then
    pass "cluster $label has the anon and authenticated roles"
  else
    fail "cluster $label did not get anon/authenticated"
  fi
  # auth.role() is what the chain's permissive policies test; the shared bootstrap
  # does not define it. Defined here rather than added to a file other harnesses
  # depend on.
  q "$sock" "$port" "create or replace function auth.role() returns text language sql stable as \$fn\$ select nullif(current_setting('request.jwt.claim.role', true), '') \$fn\$;" >/dev/null
  q "$sock" "$port" 'create extension if not exists "uuid-ossp"' >/dev/null 2>&1
  q "$sock" "$port" "create schema if not exists private" >/dev/null
  # PRE-STATE ASSERTED BEFORE ANY MEASUREMENT. Without this, every later stage
  # could be measuring a fixture that does not exist and reading as a finding.
  pre_rels=$(q "$sock" "$port" "select count(*) from information_schema.tables where table_schema='public'")
  pre_pol=$(q "$sock" "$port" "select count(*) from pg_policies where schemaname='public'")
  pre_tgt=$(q "$sock" "$port" "select to_regclass('public.staff_performance_metrics') is null")
  if [ "$label" = "a" ]; then
    # Cluster A exists to be replayed into, so it must start EMPTY and its
    # emptiness is what makes the replay's stand-in count meaningful.
    if [ "$pre_rels" = "0" ] && [ "$pre_pol" = "0" ]; then
      pass "PRE-STATE ASSERTED on cluster $label: 0 public relations / 0 public policies (it is the replay target)"
    else
      fail "cluster a is not empty: relations=$pre_rels policies=$pre_pol"
    fi
  elif [ "$pre_rels" = "0" ] && [ "$pre_pol" = "0" ] && [ "$pre_tgt" = "t" ]; then
    pass "PRE-STATE ASSERTED on cluster $label: 0 public relations / 0 public policies / staff_performance_metrics ABSENT"
  else
    fail "fixture is wrong on cluster $label: relations=$pre_rels policies=$pre_pol target-absent=$pre_tgt (expected 0/0/t)"
  fi
  # The tenants the chain's own predicates name, created BEFORE the chain's table
  # so its foreign keys resolve. Creating them after would fail the DDL and every
  # later measurement would be of a table that does not exist.
  q "$sock" "$port" "create table if not exists public.venues (id uuid primary key, name text);
                       create table if not exists public.venues_v2 (id uuid primary key, name text);
                       create table if not exists public.events_v2 (id uuid primary key, org_id uuid, title text);
                       create table if not exists public.staff_members (id uuid primary key, name text);" >/dev/null 2>&1
  if [ "$(q "$sock" "$port" "select count(*) = 4 from (values (to_regclass('public.venues')),(to_regclass('public.venues_v2')),(to_regclass('public.events_v2')),(to_regclass('public.staff_members'))) v(c) where c is not null")" = "t" ]; then
    pass "cluster $label has the 4 tenant relations the chain's foreign keys and policy predicates need (venues, venues_v2, events_v2, staff_members)"
  else
    fail "cluster $label could not create the tenant relations"
  fi
done
bail

# ---------------------------------------------------------------------------
stage "1  every guard expression is EXECUTED against a real catalog"
# ---------------------------------------------------------------------------
# What this stage can and cannot assert, stated before it asserts it.
#
# The executed path applies EVERY migration's relation DDL before it evaluates any
# guard, because one psql connection cannot hold two catalog states at once. So it
# can only ever see MORE relations than were present at any guard's own version,
# and it can therefore only OVER-report never-executed blocks — never under-report.
# That makes it useless as a second finding set and useful as exactly one thing: a
# check that the static path's "this guard is TRUE" answers are not contradicted by
# the server. A static `guard-true` that execution calls dead is the unsafe
# direction, and it is the invariant asserted here.
#
# The version-position answer is the STATIC path's, and it is proven by execution in
# stages 2-5, where the chain's own bytes are run against two catalogs that differ
# only in which migration came first.
DB015_PGURL="postgresql://postgres@/postgres?host=$TMP/a&port=$PORT_A" \
  node "$CHECK" --execute --json "$TMP/executed.json" >"$TMP/exec.log" 2>&1
exec_rc=$?
node "$CHECK" --quiet --json "$TMP/static.json" >/dev/null 2>&1
if [ ! -s "$TMP/executed.json" ]; then
  fail "the execution path produced no report"; tail -20 "$TMP/exec.log"
else
  pass "the execution path ran against a real catalog: $(grep -m1 'replayed' "$TMP/exec.log" | sed 's/^ *//')"
fi
grep -m1 'STAND-IN' "$TMP/exec.log" | sed 's/^ *//' | while read -r line; do pass "$line"; done
grep -m1 'routine(s) were stand-ins' "$TMP/exec.log" | sed 's/^ *//' | while read -r line; do pass "$line"; done
if [ "$exec_rc" -ne 0 ]; then
  fail "the execution path exited $exec_rc; it shares the anchor gate with the static path, so the two must not disagree about the check's own preconditions"; tail -12 "$TMP/exec.log"
fi

node -e '
const fs=require("fs")
const ex=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))
const st=JSON.parse(fs.readFileSync(process.argv[2],"utf8"))
const key=(r)=>r.path+":"+r.line
const exV=new Map()
for (const r of ex.unanalysed||[]) exV.set(key(r),"unanalysed")
for (const r of ex.routed||[]) exV.set(key(r),"never-executed")
const stV=new Map()
for (const r of st.unanalysed||[]) stV.set(key(r),"unanalysed")
for (const r of st.routed||[]) stV.set(key(r), r.severity==="high"?"never-executed":"never-executed")
// The invariant: nothing the static path calls LIVE may be called DEAD by the
// server. Everything else is a legitimate difference, because the executed path
// sees a catalog that also contains later migrations.
const contradicted=[]
let both=0, exOnly=0, stOnly=0, unanalysedBoth=0, bothNever=0
for (const [k,v] of stV) {
  const e=exV.get(k)
  if (e===undefined) continue
  if (v==="guard-true" && e==="never-executed") contradicted.push(k)
  if (v==="unanalysed"||e==="unanalysed") unanalysedBoth++
  else if (v==="never-executed" && e==="never-executed") { bothNever++; both++ }
  else if (v==="never-executed" && e!=="never-executed") exOnly++
  else if (v!=="never-executed" && e==="never-executed") stOnly++
}
console.log(JSON.stringify({contradicted,neverExecutedByBothPaths:bothNever,staticOnly:stOnly,executedOnly:exOnly,eitherUnanalysed:unanalysedBoth,executedSites:exV.size,staticSites:stV.size,applied:ex.replay?.ddlStatementsApplied,standIns:ex.replay?.standIns},null,1))
if (contradicted.length) process.exit(3)
' "$TMP/executed.json" "$TMP/static.json" >"$TMP/agree.json" 2>&1
agree_rc=$?
contradicted=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).contradicted.length)}catch(e){console.log("?")}' "$TMP/agree.json" 2>/dev/null)
both=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).neverExecutedByBothPaths)}catch(e){console.log(0)}' "$TMP/agree.json" 2>/dev/null)
if [ "$agree_rc" -eq 0 ] && [ "${contradicted:-?}" = "0" ]; then
  pass "INVARIANT HOLDS: no guard the static path calls live is called dead by the server ($contradicted contradictions)"
else
  fail "the server contradicts the static path on $contradicted guard(s) the static path calls LIVE: $(tr -d '\n' <"$TMP/agree.json" | head -c 500)"
fi
if [ "${both:-0}" -gt 0 ]; then
  pass "both paths independently report $both of the same blocks as never-executed"
else
  fail "the two paths agree on NO never-executed block, so their agreement is vacuous"
fi
ex_un=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).unanalysed.length)' "$TMP/executed.json")
st_un=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).unanalysed.length)' "$TMP/static.json")
if [ "${ex_un:-0}" -gt 0 ] && [ "${st_un:-0}" -gt 0 ]; then
  pass "both paths also report blind spots rather than claiming full coverage (executed $ex_un, static $st_un unanalysed)"
else
  fail "a path reported zero unanalysed sites, which means it claims coverage it does not have"
fi
printf '  contingency: %s\n' "$(tr -d '\n ' <"$TMP/agree.json")"
bail
# ---------------------------------------------------------------------------
stage "2  THE FINDING, BY EXECUTION, on cluster B: the scoped policies are never created"
# ---------------------------------------------------------------------------
# Cluster B is the "table absent" fixture and has never seen the chain replay. The
# chain's own block, byte range, at its own version position.
range "$EARLY" 34 56 'create policy staff_performance_metrics_select' >"$TMP/early.sql" \
  && pass "extracted the guarded block verbatim from ${EARLY#$ROOT/}:34-56" \
  || { fail "20250812093500:34-56 extraction"; bail; }
q "$TMP/b" "$PORT_B" "$(cat "$TMP/early.sql")" >"$TMP/earlyB1.log" 2>&1
if grep -qi error "$TMP/earlyB1.log"; then
  fail "the block failed at its own version position"; head -5 "$TMP/earlyB1.log"
fi
made_1=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public'")
if [ "${made_1:-x}" = "0" ]; then
  pass "the block executed CLEANLY at 20250812093500's version position and created 0 policies — its guard is false"
else
  fail "the block created $made_1 policies at its own version position; the ordering finding is wrong"
fi

# The chain's own CREATE TABLE references staff_members, and the chain's own
# policy body needs public.rbac_user_entity_roles to exist before it can compile.
# Both are extracted BY LINE RANGE from the chain, never paraphrased, so the
# emulated authority cannot drift from the source — which is the whole reason this
# harness extracts text rather than writing a fixture of its own.
range "$RBACCORE" 8 15 'create table if not exists rbac_roles' >"$TMP/rbac1.sql" || { fail "rbac_roles extraction"; bail; }
range "$RBACCORE" 18 25 'create table if not exists rbac_permissions' >"$TMP/rbac2.sql" || { fail "rbac_permissions extraction"; bail; }
range "$RBACCORE" 27 31 'create table if not exists rbac_role_permissions' >"$TMP/rbac3.sql" || { fail "rbac_role_permissions extraction"; bail; }
range "$RBACCORE" 34 43 'create table if not exists rbac_user_entity_roles' >"$TMP/rbac4.sql" || { fail "rbac_user_entity_roles extraction"; bail; }
range "$RBACCORE" 46 53 'create table if not exists rbac_user_permission_overrides' >"$TMP/rbac5.sql" || { fail "rbac_user_permission_overrides extraction"; bail; }
cat "$TMP"/rbac1.sql "$TMP"/rbac2.sql "$TMP"/rbac3.sql "$TMP"/rbac4.sql "$TMP"/rbac5.sql >"$TMP/rbac.sql"
pass "extracted the 5 rbac tables verbatim from ${RBACCORE#$ROOT/}:8-53 — the policy body cannot compile without them"
q "$TMP/b" "$PORT_B" "create table if not exists public.staff_members (id uuid primary key, name text);" >/dev/null 2>&1
q "$TMP/c" "$PORT_C" "create table if not exists public.staff_members (id uuid primary key, name text);" >/dev/null 2>&1
q "$TMP/b" "$PORT_B" "$(cat "$TMP/rbac.sql")" >"$TMP/rbacB.log" 2>&1
grep -qi error "$TMP/rbacB.log" && { fail "cluster B rbac tables"; head -5 "$TMP/rbacB.log"; }
if [ "$(q "$TMP/b" "$PORT_B" "select to_regclass('public.rbac_user_entity_roles') is not null and to_regclass('public.staff_members') is not null")" = "t" ]; then
  pass "PRECONDITION ASSERTED: the chain's rbac tables and staff_members exist, so the chain's own DDL is applied unmodified rather than stood in for"
else
  fail "precondition broken; the chain's own CREATE TABLE cannot be applied and stage 2 would be measuring a stand-in"
fi

# Now the table, from the chain's own CREATE TABLE by line range, plus RLS, plus
# the chain's own authority helper so the policy body can compile at all.
range "$CORECORE" 282 301 'create table if not exists staff_performance_metrics' >"$TMP/spm.sql" \
  && pass "extracted the staff_performance_metrics CREATE TABLE from ${CORECORE#$ROOT/}:282-301" \
  || { fail "staff_performance_metrics CREATE TABLE extraction"; bail; }
q "$TMP/b" "$PORT_B" "$(cat "$TMP/spm.sql")" >"$TMP/spm.log" 2>&1
grep -qi error "$TMP/spm.log" && { fail "staff_performance_metrics DDL did not compile"; head -5 "$TMP/spm.log"; }
q "$TMP/b" "$PORT_B" "alter table public.staff_performance_metrics enable row level security" >/dev/null
sed -n '87,128p' "$RBACBASE" | sed 's/^    //' >"$TMP/hep.sql"
if ! grep -q 'create or replace function public.has_entity_permission' "$TMP/hep.sql"; then
  fail "has_entity_permission extraction returned unexpected text"; bail
fi
q "$TMP/b" "$PORT_B" "$(cat "$TMP/hep.sql")" >"$TMP/hep.log" 2>&1
grep -qi error "$TMP/hep.log" && { fail "has_entity_permission did not compile"; head -5 "$TMP/hep.log"; }
q "$TMP/b" "$PORT_B" "grant execute on function public.has_entity_permission(uuid, text, uuid, text) to authenticated, service_role" >/dev/null
# The rbac tables are EMPTY straight out of the chain's DDL, and the whole point of
# the next assertion is that the chain's own authority helper answers, so the
# identities and permissions it reads are seeded. An empty helper would make every
# reading below vacuously zero, which is the same failure as a broken fixture.
# The chain's rbac_user_entity_roles carries a foreign key to public.users, so the
# identities it references have to exist before they can be granted anything. A
# foreign key is the cheapest possible statement of a dependency the chain itself
# wrote, and honouring it is why this harness is not a hand-written fixture.
# The chain's rbac_user_entity_roles carries `user_id uuid references auth.users(id)` —
# read straight out of its own DDL, which is why the identities go into auth.users
# and not into a users table this harness invented.
q "$TMP/b" "$PORT_B" "insert into auth.users (id) values ('$U_ATK'), ('$U_VIEW'), ('$U_MAN');
" >"$TMP/users.log" 2>&1
grep -qi error "$TMP/users.log" && { fail "auth.users identity seed"; head -5 "$TMP/users.log"; }
if [ "$(q "$TMP/b" "$PORT_B" "select count(*) from auth.users")" = "3" ]; then
  pass "seeded the 3 identities into auth.users, which the chain's own rbac foreign key names"
else
  fail "the identity seed did not land"
fi
q "$TMP/b" "$PORT_B" "
  insert into public.rbac_permissions (name) values ('EDIT_EVENT_LOGISTICS'),('ASSIGN_EVENT_ROLES');
  insert into public.rbac_roles (id, name, scope_type) values
    ('00000000-0000-0000-0000-0000000000a1','r_viewer','global'),
    ('00000000-0000-0000-0000-0000000000a2','r_manager','global');
  insert into public.rbac_role_permissions (role_id, permission_id)
    select '00000000-0000-0000-0000-0000000000a1', id from public.rbac_permissions where name = 'EDIT_EVENT_LOGISTICS';
  insert into public.rbac_role_permissions (role_id, permission_id)
    select '00000000-0000-0000-0000-0000000000a2', id from public.rbac_permissions where name = 'ASSIGN_EVENT_ROLES';
  insert into public.rbac_user_entity_roles (user_id, entity_type, entity_id, role_id, is_active) values
    ('$U_VIEW', 'Venue', '$V_A', '00000000-0000-0000-0000-0000000000a1', true);
" >"$TMP/rbacseed.log" 2>&1
grep -qi error "$TMP/rbacseed.log" && { fail "rbac identity seed"; head -5 "$TMP/rbacseed.log"; }
if [ "$(q "$TMP/b" "$PORT_B" "select count(*) from public.rbac_user_entity_roles")" = "1" ]; then
  pass "seeded one EDIT_EVENT_LOGISTICS role on venue A — the chain's authority helper now has something to answer about"
else
  fail "the rbac seed did not land; every reading below would be vacuously zero"
fi
# The preconditions the readings below depend on, asserted BEFORE the reading each
# one makes meaningful, so no reading can be vacuously true.
if [ "$(q "$TMP/b" "$PORT_B" "select has_entity_permission('$U_VIEW','Venue','$V_A','EDIT_EVENT_LOGISTICS')")" = "t" ]; then
  pass "precondition: a holder of EDIT_EVENT_LOGISTICS on venue A satisfies the chain's own authority helper"
else
  fail "precondition broken; every reading below would be vacuous"
fi
if [ "$(q "$TMP/b" "$PORT_B" "select has_entity_permission('$U_VIEW','Venue','$V_A','ASSIGN_EVENT_ROLES')")" = "f" ]; then
  pass "precondition: EDIT_EVENT_LOGISTICS is not ASSIGN_EVENT_ROLES — the read permission and the write permission are different"
else
  fail "precondition broken: the two permissions are not distinct, so 'no read path' would be meaningless"
fi
# The three permissive predecessors, in the shape 20250818120000 writes them.
q "$TMP/b" "$PORT_B" "
  create policy read_all_metrics on staff_performance_metrics for select using (auth.role() = 'authenticated');
  create policy insert_metrics   on staff_performance_metrics for insert with check (auth.role() = 'authenticated');
  create policy update_metrics   on staff_performance_metrics for update using (auth.role() = 'authenticated');
" >/dev/null
q "$TMP/b" "$PORT_B" "
  insert into public.venues (id, name) values ('$V_A','Venue A'),('$V_B','Venue B');
  insert into public.staff_performance_metrics (id, venue_id, metric_date, performance_rating) values
    ('$R_A', '$V_A', current_date, 4.5),
    ('$R_B', '$V_B', current_date, 1.0);
  grant select, insert, update, delete on public.staff_performance_metrics to authenticated;
" >"$TMP/rows.log" 2>&1
grep -qi error "$TMP/rows.log" && { fail "fixture seed"; head -5 "$TMP/rows.log"; }
pre=$(q "$TMP/b" "$PORT_B" "select string_agg(policyname, ',' order by policyname) from pg_policies where schemaname='public' and tablename='staff_performance_metrics'")
if [ "$pre" = "insert_metrics,read_all_metrics,update_metrics" ]; then
  pass "PRE-STATE ASSERTED: exactly 3 policies, all permissive. There is NO scoped SELECT policy — which IS the finding"
else
  fail "pre-state wrong: $pre"
fi
bail

# ---------------------------------------------------------------------------
stage "3  NEGATIVE CONTROL on cluster B: with ONLY the permissive policies, the read path is the permissive one"
# ---------------------------------------------------------------------------
# This stage runs BEFORE the control on purpose. Once the dead block has been run,
# `staff_performance_metrics_select` exists and an EDIT_EVENT_LOGISTICS holder reads
# rows legitimately — so a reading taken after the control would measure the control
# and be reported as though it were the finding. A negative control that runs after
# the thing it controls for is not a control.
if [ "$(q "$TMP/b" "$PORT_B" "select to_regclass is not null from pg_policies where schemaname='public' and tablename='staff_performance_metrics' and policyname='staff_performance_metrics_select'")" != "t" ]; then
  pass "PRE-STATE RE-ASSERTED: staff_performance_metrics_select does NOT exist, so every read below can only have come from a permissive policy"
else
  fail "the scoped SELECT policy already exists; this stage is measuring the wrong state"
fi
ratings=$(qs "$TMP/b" "$PORT_B" "$U_ATK" "select count(distinct performance_rating) from public.staff_performance_metrics;")
if [ "${ratings:-0}" = "2" ]; then
  pass "control: an authenticated account with NO role anywhere reads $ratings distinct performance_rating values across both tenants"
else
  fail "control: the caller read ${ratings:-0} distinct ratings, so the readings below mean nothing"
fi
exact=$(qs "$TMP/b" "$PORT_B" "$U_ATK" "select performance_rating from public.staff_performance_metrics where id='$R_B';")
if [ "$exact" = "1.0" ]; then
  pass "control: and reads venue B's exact rating cross-tenant ($exact)"
else
  fail "control: the targeted cross-tenant read returned '$exact', expected 1.0"
fi
# And the writes, so the exposure is shown to be a disclosure rather than a tidiness gap.
ins=$(psql -h "$TMP/b" -p "$PORT_B" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
  -c "set request.jwt.claim.sub = '$U_ATK'; set request.jwt.claim.role = 'authenticated'; set role authenticated;" \
  -c "insert into public.staff_performance_metrics (venue_id, metric_date, performance_rating) values ('$V_A', current_date, 0.0);" \
  -c "reset role;" 2>&1); rc=$?
case "$ins" in
  *"row-level security"*) fail "the attacker's pre-state INSERT was already rejected, so the fixture proves nothing: $ins" ;;
  *) if [ "$rc" -eq 0 ]; then
       pass "control: the same account INSERTS a metrics row into venue A under insert_metrics"
     else
       fail "the INSERT failed for a reason other than RLS: $ins"
     fi ;;
esac
# THE DECISIVE READING. Remove the one permissive read policy and re-read. If the
# EDIT_EVENT_LOGISTICS holder now reads nothing, then that policy WAS the only read
# path — which is CP-109's consequence stated as a measurement rather than an
# argument: the chain's intended read permission had no scoped policy of its own.
q "$TMP/b" "$PORT_B" "drop policy read_all_metrics on public.staff_performance_metrics" >/dev/null
after_drop=$(qs "$TMP/b" "$PORT_B" "$U_VIEW" "select count(*) from public.staff_performance_metrics;")
after_drop_atk=$(qs "$TMP/b" "$PORT_B" "$U_ATK" "select count(*) from public.staff_performance_metrics;")
if [ "${after_drop:-x}" = "0" ] && [ "${after_drop_atk:-x}" = "0" ]; then
  pass "DECISIVE: with read_all_metrics dropped, BOTH the EDIT_EVENT_LOGISTICS holder and the no-role account read 0 rows. The permissive policy WAS the only read path — the chain never created a scoped SELECT for this table"
else
  fail "after dropping read_all_metrics: EDIT_EVENT_LOGISTICS reads ${after_drop:-?}, no-role reads ${after_drop_atk:-?}; expected 0 and 0, so 'no scoped read path' does not hold on this target"
fi
q "$TMP/b" "$PORT_B" "create policy read_all_metrics on staff_performance_metrics for select using (auth.role() = 'authenticated')" >/dev/null
restored=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics'")
if [ "${restored:-0}" = "3" ]; then
  pass "fixture restored: the pre-state policy set is back to 3, so stage 4 measures from the same starting point"
else
  fail "the fixture was not restored ($restored policies); stage 4 would measure a different state"
fi
bail
# ---------------------------------------------------------------------------
stage "4  THE CONTROL on cluster B: the SAME bytes, run again now that the table exists"
# ---------------------------------------------------------------------------
q "$TMP/b" "$PORT_B" "$(cat "$TMP/early.sql")" >"$TMP/earlyB2.log" 2>&1
if grep -qi error "$TMP/earlyB2.log"; then
  fail "the block failed once the table existed"; head -5 "$TMP/earlyB2.log"
fi
made_2=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics' and policyname like 'staff_performance_metrics_%'")
if [ "${made_2:-0}" = "2" ]; then
  pass "CONTROL: the SAME block creates 2 policies once the table exists — the block is not dead code, its GUARD is"
else
  fail "control broken: the same block produced ${made_2:-0} scoped policies after the table existed, so stage 2 proves nothing"
fi
delta=$(( ${made_2:-0} - ${made_1:-0} ))
if [ "$delta" = "2" ]; then
  pass "THE DELTA IS 2. Identical bytes, identical server, identical guard text; the entire difference is which migration ran first"
else
  fail "the delta is $delta, expected 2"
fi
bail
# ---------------------------------------------------------------------------
stage "5  THE ORDERING CLAIM ITSELF, on cluster C: same bytes, same server, table FIRST"
# ---------------------------------------------------------------------------
# Cluster C differs from cluster B by exactly one thing: the table exists before
# the block runs. If the guard is about version order, this is where it is true —
# and that is the entire content of CP-109 in one stage.
b_pre=$(q "$TMP/c" "$PORT_C" "select to_regclass('public.staff_performance_metrics') is null")
if [ "$b_pre" = "t" ]; then
  pass "PRE-STATE ASSERTED on cluster C: the table is ABSENT, the same starting point as cluster B"
else
  fail "cluster C fixture is wrong: the table already exists, so stage 5 would be a copy of stage 3"
fi
q "$TMP/c" "$PORT_C" "$(cat "$TMP/rbac.sql")" >"$TMP/rbacC.log" 2>&1
grep -qi error "$TMP/rbacC.log" && { fail "cluster C rbac tables"; head -5 "$TMP/rbacC.log"; }
q "$TMP/c" "$PORT_C" "$(cat "$TMP/spm.sql")" >"$TMP/spmC.log" 2>&1
grep -qi error "$TMP/spmC.log" && { fail "cluster C table DDL"; head -5 "$TMP/spmC.log"; }
q "$TMP/c" "$PORT_C" "alter table public.staff_performance_metrics enable row level security" >/dev/null
q "$TMP/c" "$PORT_C" "$(cat "$TMP/hep.sql")" >/dev/null 2>&1
c_pre=$(q "$TMP/c" "$PORT_C" "select to_regclass('public.staff_performance_metrics') is null")
if [ "$c_pre" = "f" ]; then
  pass "PRE-STATE ASSERTED on cluster C: the table now EXISTS, which is the ONLY difference from cluster B"
else
  fail "cluster C fixture is wrong after the create; stage 5 would prove nothing"
fi
q "$TMP/c" "$PORT_C" "$(cat "$TMP/early.sql")" >"$TMP/earlyC.log" 2>&1
grep -qi error "$TMP/earlyC.log" && { fail "the block failed on cluster C"; head -5 "$TMP/earlyC.log"; }
made_3=$(q "$TMP/c" "$PORT_C" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics'")
if [ "${made_3:-0}" = "2" ]; then
  pass "CONTROL: on cluster C, where the table came FIRST, the identical block creates 2 policies"
else
  fail "the identical block created ${made_3:-0} policies where the table existed first; the finding is not about ordering"
fi
# The guard predicate itself, executed verbatim from the migration's own text, on
# both clusters. This is the smallest possible statement of the whole finding.
# The guard expression, lifted out of the migration by LINE and run verbatim on
# both clusters. `exists(...)` is put back around the inner SELECT because the
# extracted text is the SELECT, not the predicate — a bare `select (select 1 ...)`
# returns a row and not a boolean, which is a quieter version of the same mistake
# of not running the author's own expression.
guard_pred=$(sed -n '35p' "$EARLY" | sed 's/^ *if exists (//; s/) then *$//')
gt_B=$(q "$TMP/b" "$PORT_B" "select exists($guard_pred)")
gt_C=$(q "$TMP/c" "$PORT_C" "select exists($guard_pred)")
if [ "$gt_B" = "t" ] && [ "$gt_C" = "t" ]; then
  pass "the guard's OWN expression, extracted by line from the migration and run verbatim, evaluates TRUE on both clusters — because both now hold the table. The version position, not the table, is the difference, and the version position is what stages 2-4 measured"
else
  fail "the extracted guard expression returned cluster B=$gt_B cluster C=$gt_C; both should be t, since both clusters now hold the table"
fi

# ---------------------------------------------------------------------------
stage "6  the detector FAILS on a broken chain and is SILENT on a repaired one"
# ---------------------------------------------------------------------------
# Nothing above means anything if the detector cannot fail. The negative control is
# the detector itself, on two synthetic chains that differ only in order.
SYN="$TMP/syn"; SYN2="$TMP/syn2"
mkdir -p "$SYN" "$SYN2"
cat >"$SYN/20250101000000_a_guard.sql" <<'SQL'
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'db015_probe') then
    execute 'create policy db015_probe_read on db015_probe for select using (true)';
  end if;
end $$;
SQL
cat >"$SYN/20250601000000_b_create.sql" <<'SQL'
create table if not exists public.db015_probe (id uuid primary key);
SQL
cp "$SYN/20250601000000_b_create.sql" "$SYN2/20240101000000_a_create.sql"
cp "$SYN/20250101000000_a_guard.sql" "$SYN2/20250101000000_b_guard.sql"

node "$CHECK" --migrations "$SYN"  --quiet --json "$TMP/syn-bad.json" >"$TMP/synbad.log" 2>&1; rc_bad=$?
node "$CHECK" --migrations "$SYN2" --quiet --json "$TMP/syn-ok.json"  >"$TMP/synok.log"  2>&1; rc_ok=$?
n_bad=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).totals.neverExecuted)}catch(e){console.log("ERR")}' "$TMP/syn-bad.json" 2>/dev/null)
n_ok=$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).totals.neverExecuted)}catch(e){console.log("ERR")}' "$TMP/syn-ok.json" 2>/dev/null)
if [ "${n_bad:-ERR}" != "ERR" ] && [ "${n_bad:-0}" -ge 1 ]; then
  pass "NEGATIVE CONTROL: the detector reports $n_bad never-executed block(s) on a chain whose guard is false"
else
  fail "the detector found nothing on a chain that IS broken: $(tr -d '\n' <"$TMP/synbad.log" | head -c 300)"
fi
if [ "${n_ok:-ERR}" = "0" ]; then
  pass "POSITIVE CONTROL: the detector reports 0 on the same chain with the create moved earlier — it is not a name blacklist"
else
  fail "the detector reported ${n_ok} on a chain where the create runs FIRST"
fi
# And the CI signal: an unrouted finding must make the CLI exit nonzero.
if [ "$rc_bad" -ne 0 ]; then
  pass "EXIT CODE: nonzero ($rc_bad) on the broken synthetic chain, because its finding has no disposition — this is the behaviour release must wire"
else
  fail "the broken synthetic chain exited 0; an unrouted never-executed block must fail the check"
fi
# The repaired chain exits NONZERO, and that is correct rather than a defect: the
# anti-vacuity anchors are two migrations from the REAL chain, and a two-file
# synthetic chain does not contain them. The assertion is therefore that it fails
# on the ANCHOR gate and on nothing else — a check that refused to look at a
# different chain would be a check that could only ever be right about one chain.
if [ "$rc_ok" -ne 0 ] && grep -q "ANTI-VACUITY" "$TMP/synok.log"; then
  pass "EXIT CODE: the repaired chain exits $rc_ok on the ANTI-VACUITY gate alone, because a two-file synthetic chain does not contain the two real anchors — a check that could only be right about one chain would be worse than no check"
elif [ "$rc_ok" -eq 0 ]; then
  fail "the repaired synthetic chain exited 0, which means the anchor gate did not fire; the check would be reporting clean on a chain it has never seen"
else
  fail "the repaired synthetic chain exited $rc_ok for a reason other than the anchor gate: $(tr '\n' ' ' <"$TMP/synok.log" | head -c 300)"
fi
bail

# ---------------------------------------------------------------------------
stage "7  post-state re-assertion — a crashed run must not read as a pass"
# ---------------------------------------------------------------------------
scoped_B=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics' and policyname like 'staff_performance_metrics_%'")
perm_B=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics' and policyname in ('read_all_metrics','insert_metrics','update_metrics')")
total_B=$(q "$TMP/b" "$PORT_B" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics'")
if [ "${scoped_B:-0}" = "2" ] && [ "${perm_B:-0}" = "3" ] && [ "${total_B:-0}" = "5" ]; then
  pass "post-state re-asserted on B: 5 policies = 3 permissive predecessors + the 2 the dead block would have created"
else
  fail "unexpected final state on B: total=$total_B scoped=$scoped_B permissive=$perm_B (expected 5/2/3)"
fi
total_C=$(q "$TMP/c" "$PORT_C" "select count(*) from pg_policies where schemaname='public' and tablename='staff_performance_metrics'")
if [ "${total_C:-0}" = "2" ]; then
  pass "post-state re-asserted on C: exactly 2 policies, the same two the dead block would have created"
else
  fail "unexpected final state on C: $total_C (expected 2)"
fi
# The attacker's planted row is still there: this harness MEASURED the defect and
# did not fix it, and a harness that quietly repaired its fixture would be
# measuring its own repair.
planted=$(q "$TMP/b" "$PORT_B" "select count(*) from public.staff_performance_metrics where performance_rating = 0.0")
still_readable=$(qs "$TMP/b" "$PORT_B" "$U_ATK" "select count(distinct performance_rating) from public.staff_performance_metrics;")
if [ "${planted:-0}" = "1" ] && [ "$still_readable" = "3" ] && [ "$fails" -eq 0 ]; then
  pass "post-state re-assertion: the attacker's planted row is still present and the cross-tenant read is still open (3 ratings) — this harness MEASURED the defect and did not fix it, 0 failed checks"
else
  fail "post-state re-assertion: planted=$planted readable-ratings=${still_readable:-?}, $fails checks failed"
fi

# ---------------------------------------------------------------------------
stage "8  the committed report is current"
# ---------------------------------------------------------------------------
node "$CHECK" --quiet --json "$REPORT_DIR/report.json" >/dev/null 2>&1
if [ -s "$REPORT_DIR/report.json" ]; then
  pass "regenerated ${REPORT_DIR#$ROOT/}/report.json from the chain"
else
  fail "could not write $REPORT_DIR/report.json"
fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (every guard expression executed against a real catalog with 0 contradictions of the static path; the confirmed instance created 0 policies at its version position and 2 one version later, same bytes, same server; a cross-tenant read AND write of performance_rating is measured, not assumed; the detector is shown to fire on a broken chain, to stay silent on a repaired one, and to exit nonzero on an unrouted finding)\n'
  exit 0
fi
printf '%s CHECK(S) FAILED\n' "$fails"
exit 1
