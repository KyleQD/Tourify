#!/usr/bin/env bash
# CP-059 replay-safety harness for the storage policy guard (DB-008, Wave 33).
#
# This is the EMPIRICAL proof that the guard in the ten guarded migrations is
# correct. It is deliberately NOT wired into `npm run check:*`: it needs a
# throwaway PostgreSQL cluster, and this lane shares one 8GB box with three other
# lanes. Run it deliberately, never as part of the shared gates.
#
#   1. initdb a throwaway cluster in a temp dir on a unix socket, port 55433
#   2. node db008_storage_replay_extract.mjs <repo-root> <out-dir> <migration tags...>
#      which writes <tag>.owner.sql (the git HEAD form) and <tag>.guarded.sql
#      (the working-tree form) for each migration
#   3. bash db008_storage_replay_guard.harness.sh
#   4. pg_ctl stop, then delete the cluster
#
# It asserts, per migration:
#   * the ORIGINAL storage DDL aborts under a replay role that is not a member
#     of the storage owning role (the PR #14 failure mode), and the GUARDED form
#     does not, while emitting a warning carrying sqlstate/sqlerrm
#   * the owner-applied policy set is IDENTICAL to the original wherever the
#     original worked, so the guard cannot silently lose a policy
#   * the guarded form is idempotent over three applies
#   * a migration whose original guard compared relowner = current_user and
#     reported with a suppressed `raise notice` created ZERO policies under an
#     owner: that silent loss is recorded as a repair, not treated as a match
# The harness also asserts its own state after every reset, because a scenario
# that silently failed to rebuild the emulation would make every assertion
# below vacuously true.
# For every guarded migration:
#   1. apply the ORIGINAL storage DDL as a NON-OWNER replay role  -> record outcome
#   2. apply the GUARDED storage DDL as a NON-OWNER replay role  -> must NOT abort
#   3. apply the ORIGINAL storage DDL as the OWNER               -> snapshot policies
#   4. reset, apply the GUARDED storage DDL as the OWNER        -> policy set must be identical
#   5. re-apply the GUARDED storage DDL as the OWNER twice more -> idempotent
set -u
# ---------------------------------------------------------------------------
# REPRODUCIBILITY, Wave 35.
#
# This harness as committed in Wave 33 exited 0 having executed ZERO scenarios:
# the scenario manifest (`manifest.json`) and the emulation bootstrap it loads
# (`00-bootstrap.sql`) were never committed, and it also demanded a cluster that
# the reader was expected to have already created on a fixed port. Nothing about
# it was reproducible from the tree, so the CP-059 proof it carried was not
# durable evidence — it was a claim.
#
# It is now SELF-CONTAINING and needs nothing but the repository and a local
# PostgreSQL 16:
#   * it creates and destroys its own throwaway cluster in a temp dir
#   * it generates the scenario manifest itself from the ten guarded migrations,
#     by running db008_storage_replay_extract.mjs into that temp dir
#   * it loads the committed fixture db008_storage_replay_bootstrap.sql
#   * it still asserts its own post-reset state before trusting any scenario
#
# Run it with:  bash supabase/tests/db008_storage_replay_guard.harness.sh
# or through the single entry point:  bash supabase/tests/db008_run_all.sh
# ---------------------------------------------------------------------------
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
HARNESS="$(cd "$(dirname "$0")" && pwd)"
ROOT="${DB_ROOT:-$(cd "$HARNESS/../.." && pwd)}"
REPLAY_ROLE=tourify_replay

if [ ! -x "$PGBIN/initdb" ]; then
  echo "SKIP no local PostgreSQL at $PGBIN (set PGBIN to a PostgreSQL 16 bin dir)"
  exit 0
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db008-storageguard.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"
export PATH="$PGBIN:$PATH"
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

echo "db008 storage replay-safety harness (local emulation, not a hosted target)"
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { echo "FAIL initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p 55433 -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { echo "FAIL pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
echo "  throwaway PostgreSQL $(psql -h "$SOCK" -p 55433 -U postgres -d postgres -X -Atc 'show server_version' | head -1) cluster started"
psql -h "$SOCK" -p 55433 -U postgres -d postgres -X -q -c "create database replaytest" >/dev/null 2>&1

PSQL="psql -h $SOCK -p 55433 -U postgres -d replaytest -X -q -v ON_ERROR_STOP=1"
BOOTSTRAP="$HARNESS/db008_storage_replay_bootstrap.sql"

# The ten CP-059 guarded storage-owning migrations. Listed here rather than
# discovered so that a migration being added to or removed from the guarded set is
# a visible edit to this file, and so the manifest is reproducible without a
# previous run having written one.
GUARDED_TAGS="20250115000001 20250122000000 20250816141000 20260413000000 20260413300002 20260414130000 20260625020000 20260630211500 20260717194541 20260825130000"
EXTRACT="$HARNESS/db008_storage_replay_extract.mjs"
EXTRACT_OUT="$TMP/extract"
mkdir -p "$EXTRACT_OUT"
: >"$TMP/taglist"
for t in $GUARDED_TAGS; do
  # A tag is the migration's 14-digit version prefix, not its filename; the
  # extract script appends `.sql` itself. Resolve the prefix to the real filename
  # so the scenario set is named here and verified here, rather than living in a
  # manifest nobody committed.
  hit=$(ls "$ROOT"/supabase/migrations/"$t"_*.sql 2>/dev/null | head -1)
  if [ -z "$hit" ]; then
    echo "FAIL: guarded migration version $t is missing; the tag list in this harness is stale" >&2
    exit 1
  fi
  echo "$t" >>"$TMP/taglist"
done
# The extract script takes the migration FILENAME stem, not the 14-digit version.
: >"$TMP/filelist"
for t in $GUARDED_TAGS; do
  hit=$(ls "$ROOT"/supabase/migrations/"$t"_*.sql 2>/dev/null | head -1)
  b=$(basename "$hit" .sql)
  echo "$b" >>"$TMP/filelist"
done
if ! (cd "$ROOT" && node "$EXTRACT" "$ROOT" "$EXTRACT_OUT" $(cat "$TMP/filelist") >"$TMP/extract.log" 2>&1); then
  echo "FAIL: could not extract the storage DDL for the guarded migrations" >&2
  cat "$TMP/extract.log" >&2
  exit 1
fi
MANIFEST="$EXTRACT_OUT/manifest.json"
extracted=$(node -e "console.log(require('$MANIFEST').length)")
echo "  scenario manifest generated: $MANIFEST ($extracted migrations)"
[ "$extracted" -gt 0 ] || { echo "FAIL: the generated manifest has zero scenarios" >&2; exit 1; }
[ -f "$BOOTSTRAP" ] || { echo "FAIL: committed bootstrap fixture missing: $BOOTSTRAP" >&2; exit 1; }

reset_cluster() {
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "drop schema if exists storage cascade; drop schema if exists auth cascade;" >/dev/null
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "revoke all on schema public from $REPLAY_ROLE;" >/dev/null 2>&1
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "drop owned by $REPLAY_ROLE;" >/dev/null 2>&1
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "drop role if exists $REPLAY_ROLE;" >/dev/null 2>&1
  $PSQL -f "$BOOTSTRAP" >/dev/null
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='$REPLAY_ROLE') then create role $REPLAY_ROLE login bypassrls; end if; end \$\$;" >/dev/null
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -q -c "grant usage on schema public, storage, auth to $REPLAY_ROLE; grant all on all tables in schema storage to $REPLAY_ROLE; grant all on all functions in schema storage, auth to $REPLAY_ROLE;" >/dev/null
  # The replay role is deliberately NOT a member of supabase_storage_admin and is
  # not a superuser, so pg_class_ownercheck must refuse it. BYPASSRLS is granted
  # because the real Supabase layout lets the migration role write storage.buckets
  # (it is a superuser there); BYPASSRLS does not affect pg_class_ownercheck,
  # which is about table OWNERSHIP, so the ownership test stays intact.
  #
  # Post-condition: a scenario that silently failed to rebuild the emulation
  # would make every assertion below vacuously true, so prove the harness state
  # before trusting any result.
  local state
  state=$(psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -Atc \
    "select (select count(*) from pg_tables where schemaname='storage') || '/' || (select count(*) from pg_policies where schemaname='storage') || '/' || (select pg_get_userbyid(relowner) from pg_class where oid='storage.objects'::regclass) || '/' || (select rolsuper::text from pg_roles where rolname='$REPLAY_ROLE');")
  if [ "$state" != "2/0/supabase_storage_admin/false" ]; then
    echo "HARNESS STATE INVALID: $state (expected 2/0/supabase_storage_admin/false)" >&2
    exit 99
  fi
}

run_as() {  # $1 = role, $2 = file
  if [ "$1" = "owner" ]; then
    $PSQL -f "$2" 2>&1
  else
    $PSQL -c "set role $1;" -f "$2" 2>&1
  fi
}

policy_snapshot() {
  psql -h "$SOCK" -p 55433 -U postgres -d replaytest -X -Atc \
    "select policyname || '|' || coalesce(cmd,'') || '|' || coalesce(roles::text,'') from pg_policies where schemaname='storage' and tablename='objects' order by policyname;"
}

pass=0; fail=0
for tag in $(node -e "for(const m of require('$MANIFEST'))console.log(m.tag)"); do
  orig="$EXTRACT_OUT/$tag.owner.sql"
  grd="$EXTRACT_OUT/$tag.guarded.sql"

  reset_cluster
  out_orig=$(run_as "$REPLAY_ROLE" "$orig"); rc_orig=$?
  reset_cluster
  out_grd=$(run_as "$REPLAY_ROLE" "$grd"); rc_grd=$?
  reset_cluster
  out_owner_orig=$(run_as owner "$orig" 2>&1); rc_owner_orig=$?; snap_orig=$(policy_snapshot)
  [ -n "$out_owner_orig" ] && echo "    [debug] owner-apply(original) said: $(printf '%s' "$out_owner_orig" | head -3 | tr '\n' ' ')"
  reset_cluster
  out_owner_grd=$(run_as owner "$grd" 2>&1); snap_grd=$(policy_snapshot)
  [ -n "$out_owner_grd" ] && echo "    [debug] owner-apply(guarded) said: $(printf '%s' "$out_owner_grd" | head -3 | tr '\n' ' ')"
  reset_cluster
  run_as owner "$grd" >/dev/null 2>&1; run_as owner "$grd" >/dev/null 2>&1; run_as owner "$grd" >/dev/null 2>&1; rc_idem=$?
  snap_idem=$(policy_snapshot)

  echo "=== $tag"
  echo "    replay-role original : rc=$rc_orig  $( [ $rc_orig -ne 0 ] && echo 'ABORTS (the PR #14 failure mode)' || echo 'succeeds' )"
  echo "    replay-role guarded  : rc=$rc_grd  warnings=$(printf '%s' "$out_grd" | grep -ci 'WARNING' || true)"
  if [ $rc_grd -ne 0 ]; then echo "    FAIL: guarded form still aborts"; echo "$out_grd" | head -5; fail=$((fail+1)); continue; fi
  if [ $rc_orig -ne 0 ] && [ "$(printf '%s' "$out_grd" | grep -ci 'WARNING' || true)" -eq 0 ]; then
    echo "    FAIL: original aborted but guarded form emitted no warning (silent divergence)"; fail=$((fail+1)); continue
  fi
  if [ "$snap_orig" != "$snap_grd" ]; then
    # A migration whose original guard compared relowner = current_user and
    # reported with `raise notice` (suppressed by client_min_messages = warning)
    # created NOTHING under an owner. That silent loss is the defect, so a
    # guarded superset is the expected, recorded outcome rather than a failure.
    if [ -z "$snap_orig" ] && [ -n "$snap_grd" ] && [ $rc_owner_orig -eq 0 ]; then
      echo "    PASS: original SILENTLY created 0 policies (relowner guard + suppressed notice);"
      echo "          guarded form creates $(printf '%s' "$snap_grd" | grep -c . ) - documented silent-loss repair"
      pass=$((pass+1)); continue
    fi
    echo "    FAIL: owner-applied policy set differs from the original"; diff <(printf '%s' "$snap_orig") <(printf '%s' "$snap_grd") | head -10; fail=$((fail+1)); continue
  fi
  if [ $rc_idem -ne 0 ] || [ "$snap_idem" != "$snap_grd" ]; then
    echo "    FAIL: not idempotent over three applies"; fail=$((fail+1)); continue
  fi
  echo "    PASS: policies=$(printf '%s' "$snap_grd" | grep -c . || true) identical to original, idempotent, replay-safe"
  pass=$((pass+1))
done
echo
# A harness that ran zero scenarios and exited 0 is a FALSE GREEN, and this one
# did exactly that: the scenario manifest and the 00-bootstrap fixture it needs
# were never committed, so `for tag in ...` iterated zero times and
# `[ $fail -eq 0 ]` reported success. Wave 34 found this by running the harness
# and reading the count rather than the exit code. Zero scenarios is now a hard
# failure, and the missing prerequisites are named instead of silently skipped.
if [ "$pass" -eq 0 ] && [ "$fail" -eq 0 ]; then
  echo "replay-safety: 0 scenarios executed - THIS IS A FAILURE, not a pass"
  echo "  scenario manifest: $MANIFEST"
  echo "  bootstrap fixture: $BOOTSTRAP"
  echo "  The manifest and fixture are generated and committed respectively, so a zero"
  echo "  here means the extraction produced nothing, not that the harness is dormant."
  exit 1
fi
echo "replay-safety: $pass passed, $fail failed"
[ $fail -eq 0 ]
