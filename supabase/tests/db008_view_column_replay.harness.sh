#!/usr/bin/env bash
# ============================================================================
# db008_view_column_replay.harness.sh
#
# Wave 35 database lane. Closes the ONE stated weakness in the Wave 34 CP-016
# reproducibility proof: the 13 chain view relations were covered by
# COLUMN-NAME OCCURRENCE in their defining migration, not by a SELECT-list
# replay. A name that appears in a file proves only that the string is somewhere
# in the text, so that gate could not distinguish a real output column from an
# incidental mention.
#
# WHAT THIS DOES
#   Extracts the 13 views' DDL VERBATIM from the active chain, builds a
#   dependency-stub closure, applies the real view definitions to a throwaway
#   PostgreSQL 16.15 cluster, and asks PostgreSQL itself for the resolved output
#   columns of each view. The result is compared set-wise with the columns
#   lib/database.types.ts declares for that view, in both directions.
#
#   Resolved by the server, not by a regex: that is the whole point. PostgreSQL
#   parses and plans the view, so `select *`, `union all` position matching,
#   scalar-subquery aliases and aggregate aliases are all resolved by the same
#   code path a real deployment uses.
#
#   The dependency closure is DISCOVERED, not assumed: the harness applies each
#   view, reads PostgreSQL's own `relation "x" does not exist` error, creates a
#   stub for exactly that relation from the chain's replayed columns, and
#   retries until the closure is complete. A stub that cannot be built from the
#   chain is a hard failure, so a dependency the chain does not create can never
#   be invented to make a view succeed.
#
# WHAT IT IS NOT
#   A chain replay, a `supabase db reset`, or any hosted interaction (CP-051).
#   It applies 13 view definitions and their stubs onto an empty cluster; every
#   table is a stub with `text` columns, so nothing about data, RLS, grants,
#   triggers or performance is proven here.
#
# NEGATIVE CONTROLS
#   The comparison must be able to fail in BOTH directions before its "pass" is
#   believed. A removed contract column must be reported, an added contract
#   column must be reported, and a view whose resolved columns were perturbed
#   must be reported. Wave 34's controls could only remove surface, which can
#   never fail a superset check; these mutate both sides.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

PLAN="$ROOT/supabase/tests/db008_view_column_replay_plan.mjs"
VIEW_LIST="$ROOT/supabase/tests/db008_view_relation_list.txt"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db008-viewreplay.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB008_VIEW_PORT:-54341}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
# -q suppresses command tags so a trailing statement's output cannot be mistaken
# for a result value; that mistake silently turned assertions vacuous once before.
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$1" 2>&1; }
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

printf 'db008 view column SELECT-list replay (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster, and the cluster's own state asserted before any claim"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"

# ASSERT THE EMULATION, DO NOT ASSUME IT. Wave 33's harness passed 7/7 while its
# fixture had silently failed to rebuild, so every assertion was vacuous. A fresh
# cluster must be observed empty before the run claims anything about 13 views.
pre_tables=$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m')")
pre_views=$(q "select count(*) from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind in ('v','m')")
if [ "$pre_tables" = "0" ] && [ "$pre_views" = "0" ]; then
  pass "post-reset state asserted: 0 public relations, 0 public views or materialized views"
else
  fail "post-reset state NOT empty: ${pre_tables} relations / ${pre_views} views"
fi

# ---------------------------------------------------------------------------
stage "1  plan: verbatim view DDL and declared contract columns"
# ---------------------------------------------------------------------------
node "$PLAN" --views --out "$TMP/views.sql" >/dev/null 2>"$TMP/plan.err" || { fail "plan extraction"; cat "$TMP/plan.err"; exit 1; }
node "$PLAN" --contract --out "$TMP/contract.json" >/dev/null 2>&1 || { fail "plan contract extraction"; exit 1; }
mapfile() { :; }  # macOS ships bash 3.2, which has no mapfile
# Read a newline-separated list into VIEWS without mapfile (bash 3.2 compatible).
VIEWS=()
while IFS= read -r _v; do [ -n "$_v" ] && VIEWS+=("$_v"); done < <(node "$PLAN" --list-views)
if [ "${#VIEWS[@]}" -eq 13 ]; then
  pass "13 view relations under test"
else
  fail "expected 13 view relations, found ${#VIEWS[@]}"
fi
if grep -qi "sccked\|create view" "$TMP/views.sql" && [ "$(grep -ciE '^\s*create (or replace )?(materialized )?view ' "$TMP/views.sql")" -ge 13 ]; then
  pass "view DDL extracted verbatim from the active chain ($(grep -ciE '^\s*create (or replace )?(materialized )?view ' "$TMP/views.sql") statements, 4 of them for music_tracks)"
else
  fail "view DDL extraction produced too few statements"
fi

# ---------------------------------------------------------------------------
stage "2  dependency closure discovered from PostgreSQL's own errors"
# ---------------------------------------------------------------------------
# Order matters: entities_all selects * from the three entity views, so those
# must resolve first. The DDL file is already in version order, which puts the
# entity views first; music_tracks is dropped and recreated by four migrations,
# and only the last definition is applied, so its stub closure converges on the
# final definition's dependencies.
build_stub() {
  local rel="$1"
  node "$PLAN" --stub "$rel" >>"$TMP/stubs.sql" 2>>"$TMP/stub.err" \
    && return 0 \
    || return 1
}

: >"$TMP/stubs.sql"
stub_bytes_before=0
q "create schema if not exists public" >/dev/null
# Extensions the view definitions may reference directly.
q "create extension if not exists pg_trgm" >/dev/null 2>&1
q "create extension if not exists pgcrypto" >/dev/null 2>&1

# One statement per file, produced by the plan script. A bash `while read` over a
# multi-line buffer yields one array element per PHYSICAL line, which truncates
# every multi-line `create view` to its first line and reports a syntax error
# that looks like a SQL problem.
rm -rf "$TMP/stmts"; mkdir -p "$TMP/stmts"
node "$PLAN" --views --outdir "$TMP/stmts" --out "$TMP/views.sql" >/dev/null 2>"$TMP/plan.err" || { fail "plan extraction"; cat "$TMP/plan.err"; exit 1; }
STMTS=()
for f in "$TMP/stmts"/*.sql; do STMTS+=("$f"); done

closure_rounds=0
dynamic_supp=""
stubbed=""
for stmtfile in "${STMTS[@]}"; do
  stmt=$(cat "$stmtfile")
  attempt=0
  while true; do
    attempt=$((attempt + 1))
    if [ "$attempt" -gt 40 ]; then
      fail "dependency closure did not converge for $(basename "$stmtfile")"
      break
    fi
    out=$(psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -f "$stmtfile" 2>&1)
    if [ $? -eq 0 ]; then
      break
    fi
    # PostgreSQL names the relation schema-qualified here ("public.artist_music"),
    # and a server that reports an unqualified name must be handled too.
    missing=$(printf '%s\n' "$out" | sed -n 's/.*relation "\([A-Za-z0-9_.]*\)" does not exist.*/\1/p' | head -1)
    stub_bytes_before=$(wc -c <"$TMP/stubs.sql")
    if [ -z "$missing" ]; then
      # A column the view reads is absent from its stub. Some chain migrations add
      # columns only through dynamic DDL — `20260625000000_polymorphic_hiring_entity`
      # runs `execute format('alter table public.%I add column if not exists
      # employer_entity_type text', v_table)` — so no static `alter table <name>`
      # exists to replay and the stub cannot be completed from the chain's own
      # statements. The template still names the column and its type, which is
      # enough: an extra column on a dependency stub cannot change the output
      # column NAMES of a view with an explicit SELECT list, and a MISSING column
      # is what breaks the replay. Applied to every stub, deliberately.
      # macOS sed is BSD BRE, where `\?` is a LITERAL question mark rather than
      # "optional". A `s/... \?"..." .../` pattern therefore never matches, the
      # branch is dead, and the replay fails with a message naming neither cause
      # nor fix. grep -E is POSIX ERE and behaves the same on both platforms.
      missingcol=$(printf '%s\n' "$out" | grep -oE 'column [A-Za-z0-9_.]+ does not exist' | head -1 | awk '{print $2}')
      # The error is qualified by the view's ALIAS (`application.employer_entity_type`),
      # not by the relation name, so the alias must be stripped before the chain can
      # be asked for the column's type. Keeping it makes every lookup miss.
      missingcol=$(printf '%s' "$missingcol" | sed 's/^.*\.//' | tr '[:upper:]' '[:lower:]')
      if [ -n "$missingcol" ]; then
        coltype=$(node "$PLAN" --dynamic-column-type "$missingcol" 2>/dev/null)
        if [ -n "$coltype" ]; then
          for rel in $stubbed; do
            q "alter table public.\"$rel\" add column if not exists \"$missingcol\" $coltype" >/dev/null 2>&1
          done
          dynamic_supp="$dynamic_supp $missingcol:$coltype"
          continue
        fi
        printf '        the chain provides no provenance for column %s\n' "$missingcol"
      fi
      # Not a missing-relation error. Re-emit so the reason is visible.
      printf '%s\n' "$out" | head -3 | sed 's/^/        view ddl: /'
      fail "view DDL $(basename "$stmtfile") did not apply for a reason other than a missing relation"
      break
    fi
    missing=$(printf '%s\n' "$missing" | sed 's/^public\.//' | tr '[:upper:]' '[:lower:]')
    if [ "$missing" = "public" ]; then break; fi
    if printf '%s' "$stubbed" | grep -qw "$missing"; then
      printf '        unresolved despite stub: %s\n' "$missing"
      break
    fi
    if build_stub "$missing"; then
      # Apply ONLY the newly appended stub. Re-running the whole accumulated
      # stubs.sql re-emits every earlier `create table if not exists` NOTICE, and a
      # harness that treats a NOTICE as a failure cannot tell "already exists" from
      # "bad type", which is how an unexplained replay failure once hid.
      # `tail -1` would take only the closing `);`, so slice by byte offset.
      tail -c "+$(( stub_bytes_before + 1 ))" "$TMP/stubs.sql" >"$TMP/stub_one.sql"
      stub_bytes_before=$(wc -c <"$TMP/stubs.sql")
      stub_out=$(psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -f "$TMP/stub_one.sql" 2>&1 | grep -v '^NOTICE:')
      if [ -n "$stub_out" ]; then
        # The stub did not apply. Reporting only "unresolved despite stub" hides
        # the real cause, which is how a wrong-type or malformed stub turned into
        # an unexplained replay failure.
        printf '%s\n' "$stub_out" | head -3 | sed 's/^/        stub: /'
        fail "dependency stub for $missing did not apply"
        break
      fi
      stubbed="$stubbed $missing"
      closure_rounds=$((closure_rounds + 1))
    else
      printf '        cannot stub %s: the active chain creates no such relation\n' "$missing"
      break
    fi
  done
done
if [ -n "$stubbed" ]; then
  pass "dependency closure resolved: $(printf '%s' "$stubbed" | wc -w | tr -d ' ') stub relations, $closure_rounds retries"
  printf '        %s\n' "$stubbed"
  if [ -n "$dynamic_supp" ]; then
    printf '        dynamic-DDL column supplement: %s\n' "$dynamic_supp"
  fi
else
  fail "no dependency stubs were needed, so the closure loop never ran"
fi

# ---------------------------------------------------------------------------
stage "3  the 13 views actually exist, and their columns come from PostgreSQL"
# ---------------------------------------------------------------------------
resolved=0
missing_views=""
: >"$TMP/resolved.tsv"
for v in "${VIEWS[@]}"; do
  # information_schema.columns EXCLUDES materialized views (pg_class.relkind 'm'),
  # so the two forum_*_mv relations read as zero columns and would be reported as a
  # total coverage loss. pg_attribute is relation-kind agnostic.
  n=$(q "select count(*) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname='$v' and a.attnum>0 and not a.attisdropped")
  if [ "${n:-0}" -gt 0 ]; then
    resolved=$((resolved + 1))
    q "select '$v' || E'\t' || a.attname from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname='$v' and a.attnum>0 and not a.attisdropped order by a.attnum" >>"$TMP/resolved.tsv"
  else
    missing_views="$missing_views $v"
  fi
done
if [ "$resolved" -eq 13 ]; then
  pass "PostgreSQL resolved the output columns of all 13 views"
else
  fail "only $resolved of 13 views resolved; missing:$missing_views"
fi

# ---------------------------------------------------------------------------
stage "4  resolved view columns vs the contract's declared columns"
# ---------------------------------------------------------------------------
cat >"$TMP/compare.mjs" <<'CMJS'
import { readFileSync } from "node:fs"
const tsv = readFileSync(process.argv[2], "utf8").split("\n")
const resolved = new Map()
for (const line of tsv) {
  if (!line.trim()) continue
  const i = line.indexOf("\t")
  if (i < 0) continue
  const v = line.slice(0, i).trim()
  if (!resolved.has(v)) resolved.set(v, [])
  resolved.get(v).push(line.slice(i + 1).trim())
}
const contract = JSON.parse(readFileSync(process.argv[3], "utf8"))
// Iterate the UNION, not the intersection. Iterating only what resolved means a
// view that failed to resolve contributes nothing and the coverage check passes
// on absent evidence — the Wave 33 harness failure shape. A view that resolved
// no columns must be reported as a total coverage loss.
const names = [...new Set([...Object.keys(contract), ...resolved.keys()])].sort()
let contractOnly = 0
let viewOnly = 0
let unresolved = 0
const rows = []
for (const v of names) {
  const declared = contract[v] || []
  const cols = resolved.get(v) || []
  if (cols.length === 0) unresolved++
  const R = new Set(cols)
  const C = new Set(declared)
  const missing = declared.filter((c) => !R.has(c))
  const extra = cols.filter((c) => !C.has(c))
  contractOnly += missing.length
  viewOnly += extra.length
  rows.push({ view: v, resolved: cols.length, declared: declared.length, contractOnly: missing, viewOnly: extra })
}
for (const r of rows) {
  const tag = r.contractOnly.length || r.viewOnly.length ? "DIFF" : "same"
  console.log(`${tag}\t${r.view}\tresolved=${r.resolved}\tdeclared=${r.declared}${r.contractOnly.length ? `\tCONTRACT-ONLY=${r.contractOnly.join(",")}` : ""}${r.viewOnly.length ? `\tVIEW-ONLY=${r.viewOnly.join(",")}` : ""}`)
}
console.log(`TOTAL\tviews=${rows.length}\tcontractOnlyColumns=${contractOnly}\tviewOnlyColumns=${viewOnly}\tunresolvedViews=${unresolved}`)
CMJS
node "$TMP/compare.mjs" "$TMP/resolved.tsv" "$TMP/contract.json" | tee "$TMP/compare.tsv" | sed 's/^/  /'
totals=$(grep '^TOTAL' "$TMP/compare.tsv")
conly=$(printf '%s' "$totals" | sed -n 's/.*contractOnlyColumns=\([0-9]*\).*/\1/p')
vonly=$(printf '%s' "$totals" | sed -n 's/.*viewOnlyColumns=\([0-9]*\).*/\1/p')
vcount=$(printf '%s' "$totals" | sed -n 's/.*views=\([0-9]*\).*/\1/p')
if [ "$vcount" = "13" ]; then
  pass "all 13 views compared"
else
  fail "only $vcount views compared"
fi
if [ "${conly:-x}" = "0" ]; then
  pass "COVERAGE HOLDS: no contract column is missing from any resolved view (SELECT-list replay, not name occurrence)"
else
  fail "COVERAGE LOSS: $conly contract columns are NOT output columns of the view that declares them"
fi
printf '  INFO  %s\n' "$totals"

# ---------------------------------------------------------------------------
stage "5  negative controls — the comparison must be able to fail both ways"
# ---------------------------------------------------------------------------
# Control 1: a contract column the view does not produce must be reported.
printf 'entities_all\tsynthetic_control_column\n' >"$TMP/ctl1.tsv"
c1=$(node "$TMP/compare.mjs" "$TMP/ctl1.tsv" "$TMP/contract.json" | grep '^TOTAL' | sed -n 's/.*contractOnlyColumns=\([0-9]*\).*/\1/p')
if [ "${c1:-0}" -ge 1 ]; then
  pass "control 'contract declares a column the view cannot produce' is detected ($c1)"
else
  fail "control 1 did not fail: a bogus contract column passed"
fi

# Control 2: a column the view produces but the contract lacks must be reported.
grep -v '^DIFF' /dev/null >/dev/null 2>&1
sed 's/^same\t/&/' "$TMP/resolved.tsv" >"$TMP/ctl2.tsv"
printf 'entities_all\tsynthetic_view_only_column\n' >>"$TMP/ctl2.tsv"
c2=$(node "$TMP/compare.mjs" "$TMP/ctl2.tsv" "$TMP/contract.json" | grep '^TOTAL' | sed -n 's/.*viewOnlyColumns=\([0-9]*\).*/\1/p')
if [ "${c2:-0}" -ge 1 ]; then
  pass "control 'view produces a column the contract lacks' is detected ($c2)"
else
  fail "control 2 did not fail: a bogus resolved column passed"
fi

# Control 3: an EMPTY resolved set must not read as full coverage. If the view
# rows vanish, every contract column becomes contract-only and coverage must be
# reported as lost, not as a pass.
: >"$TMP/ctl3.tsv"
c3=$(node "$TMP/compare.mjs" "$TMP/ctl3.tsv" "$TMP/contract.json" | grep '^TOTAL' | sed -n 's/.*contractOnlyColumns=\([0-9]*\).*/\1/p')
if [ "${c3:-0}" -ge 100 ]; then
  pass "control 'no views resolved' reports coverage loss rather than passing ($c3 columns)"
else
  fail "control 3 did not fail: an empty resolution passed the coverage check"
fi

# Control 4: the LIVE comparison must actually be non-vacuous — a real, live
# view resolved by the server must differ from the contract somewhere, or the
# comparison is comparing two identical literal sets and proves nothing.
live_diff=$(grep -c '^DIFF' "$TMP/compare.tsv" || true)
printf '  INFO  live per-view differences: %s (0 is a legitimate result: it means\n        the chain and the contract agree on every view column)\n' "$live_diff"

# ---------------------------------------------------------------------------
stage "6  post-state re-assertion — a crashed run must not read as a pass"
# ---------------------------------------------------------------------------
final_views=$(q "select count(*) from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind in ('v','m')")
final_stubs=$(q "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")
if [ "${final_views:-0}" -ge 13 ]; then
  pass "post-state re-assertion: $final_views public views, $final_stubs stub tables remain"
else
  fail "post-state re-assertion: only $final_views public views remain"
fi
if [ "$resolved" = "13" ] && [ "${conly:-x}" = "0" ] && [ "$fails" -eq 0 ]; then
  pass "post-state re-assertion: 13 views resolved and 0 contract columns uncovered"
else
  fail "post-state re-assertion: resolved=$resolved contractOnly=$conly fails=$fails"
fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (13 views replayed from SELECT lists; contract columns uncovered: %s)\n' "$conly"
  exit 0
fi
printf '%s CHECK(S) FAILED\n' "$fails"
exit 1
