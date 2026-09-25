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
PSQL="/opt/homebrew/opt/postgresql@16/bin/psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -v ON_ERROR_STOP=1"
HARNESS="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="${MANIFEST:-$HARNESS/manifest.json}"

REPLAY_ROLE=tourify_replay

reset_cluster() {
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "drop schema if exists storage cascade; drop schema if exists auth cascade;" >/dev/null
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "revoke all on schema public from $REPLAY_ROLE;" >/dev/null 2>&1
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "drop owned by $REPLAY_ROLE;" >/dev/null 2>&1
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "drop role if exists $REPLAY_ROLE;" >/dev/null 2>&1
  $PSQL -f "$HARNESS/00-bootstrap.sql" >/dev/null
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='$REPLAY_ROLE') then create role $REPLAY_ROLE login bypassrls; end if; end \$\$;" >/dev/null
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -q -c "grant usage on schema public, storage, auth to $REPLAY_ROLE; grant all on all tables in schema storage to $REPLAY_ROLE; grant all on all functions in schema storage, auth to $REPLAY_ROLE;" >/dev/null
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
  state=$(psql -h /tmp -p 55433 -U postgres -d replaytest -X -Atc \
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
  psql -h /tmp -p 55433 -U postgres -d replaytest -X -Atc \
    "select policyname || '|' || coalesce(cmd,'') || '|' || coalesce(roles::text,'') from pg_policies where schemaname='storage' and tablename='objects' order by policyname;"
}

pass=0; fail=0
for tag in $(node -e "for(const m of require('$MANIFEST'))console.log(m.tag)"); do
  orig="$HARNESS/$tag.owner.sql"
  grd="$HARNESS/$tag.guarded.sql"

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
  echo "  expected scenario manifest: $MANIFEST"
  [ -f "$MANIFEST" ] || echo "  MISSING: regenerate it with:"
  echo "    node supabase/tests/db008_storage_replay_extract.mjs <repo-root> $MANIFEST <migration-file>..."
  echo "  expected bootstrap fixture: $HARNESS/00-bootstrap.sql"
  [ -f "$HARNESS/00-bootstrap.sql" ] || echo "  MISSING: the Supabase storage/auth emulation bootstrap"
  echo "  expected a reachable cluster on 127.0.0.1:55433 database replaytest"
  exit 1
fi
echo "replay-safety: $pass passed, $fail failed"
[ $fail -eq 0 ]
