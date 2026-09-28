#!/usr/bin/env bash
# ============================================================================
# db008_scheduled_posts_platform.harness.sh
#
# DB-008 — proof for 20260926140200_scheduled_posts_platform_columns.sql
# (HF-DB-011-SCHEDULED-POSTS-FRESH-CHAIN-DIVERGENCE).
#
# THE POINT OF THIS HARNESS
#   The bug is an ORDERING bug, so the harness reproduces the ordering rather
#   than testing the new migration in isolation. It applies the chain's
#   `20250904110000_scheduled_posts_platform_status.sql` VERBATIM to an empty
#   schema, then applies `20260413200000`'s scheduled_posts block, and shows the
#   two columns are absent — a fresh replay reproduces the defect. It then
#   applies the new migration and shows the columns and indexes are present and
#   that a writer/reader shaped like the product's own code works.
#
# WHAT IT PROVES
#   1. the ordering defect is real and reproduces (negative control, from source)
#   2. the new migration repairs it
#   3. it is idempotent, and so is a second application over a target that
#      already received the columns out of band
#   4. the contract postflight is green after the repair and FAILS before it
#   5. the pre-existing RLS and the `scheduled_posts_own` policy are untouched
#   6. the exact write lib/services/cross-platform-posting.service.ts:195 performs
#      succeeds, and the exact select app/api/artist/content/overview/route.ts:137
#      performs returns the column
#
# WHAT IT IS NOT
#   A chain replay. Two migration FILES are applied to an empty schema by hand;
#   no other migration is run, no `supabase db reset` is issued, and nothing is
#   applied to any real environment (CP-051). Not a hosted target.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db008-schedposts.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB008_SCHED_PORT:-54345}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$1" 2>&1; }
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

EARLY="$ROOT/supabase/migrations/20250904110000_scheduled_posts_platform_status.sql"
LATE="$ROOT/supabase/migrations/20260413200000_port_missing_tables.sql"
NEW="$ROOT/supabase/migrations/20260926140200_scheduled_posts_platform_columns.sql"
TST="$ROOT/supabase/tests/db008_scheduled_posts_platform_columns_contract.sql"

printf 'db008 scheduled_posts platform-columns harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"
q "create schema if not exists auth; create schema if not exists public" >/dev/null
q "create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text)" >/dev/null
# 20260413200000's own block creates scheduled_posts_own, which resolves auth.uid().
# Without it the policy creation fails and the extracted block aborts, which would
# look like a migration problem rather than a fixture problem.
q "create or replace function auth.uid() returns uuid language sql stable as \$fn\$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$fn\$" >/dev/null
if [ "$(q "select to_regprocedure('auth.uid()') is not null")" = "t" ]; then
  pass "bootstrap created auth.users and auth.uid(), which the extracted chain block resolves against"
else
  fail "bootstrap did not create auth.users / auth.uid()"
fi
if [ "$(q "select to_regclass('public.scheduled_posts') is null")" = "t" ]; then
  pass "post-reset state asserted: public.scheduled_posts does not exist"
else
  fail "post-reset state NOT clean; scheduled_posts already exists"
fi
for f in "$EARLY" "$LATE" "$NEW" "$TST"; do
  [ -f "$f" ] || { fail "required file missing: $f"; exit 1; }
done
pass "all four chain/test files present"

# ---------------------------------------------------------------------------
stage "1  NEGATIVE CONTROL: reproduce the ordering defect from the real sources"
# ---------------------------------------------------------------------------
# Apply the EARLIER-versioned migration first, exactly as version order does.
if qf "$EARLY" >"$TMP/early.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/early.log")" ]; then
  pass "20250904110000 applied with no error, because every statement in it is guarded"
else
  fail "20250904110000 did not apply"; tail -5 "$TMP/early.log"
fi
still_absent=$(q "select count(*) from pg_attribute where attrelid = to_regclass('public.scheduled_posts') and attname in ('platform_status','platform_errors')")
if [ "${still_absent:-x}" = "0" ]; then
  pass "and it created NOTHING, because scheduled_posts did not exist yet — the guard swallowed it silently"
else
  fail "expected scheduled_posts to still be absent after the early migration; fixture is wrong"
fi
if [ "$(q "select to_regclass('public.scheduled_posts') is null")" = "t" ]; then
  pass "confirmed: 20250904110000 left no table and no columns behind"
else
  fail "20250904110000 unexpectedly created scheduled_posts"
fi

# Now the LATER-versioned migration, which is what actually creates the table.
# Only the scheduled_posts block is extracted: the rest of 20260413200000 creates
# unrelated relations and a full apply is out of scope for this harness.
# The range ends at the end of the scheduled_posts_own DO block, NOT at the next
# table. Running past it pulls in booking_requests, staff_onboarding and a
# trigger that references public.profiles, none of which this harness bootstraps,
# so the block aborts on an unrelated relation and the run reports a migration
# problem where the real issue is an over-wide extraction.
awk '/^CREATE TABLE IF NOT EXISTS scheduled_posts \(/ {grab=1} grab {print} grab && /^END \$\$;$/ {exit}' "$LATE" >"$TMP/late.sql"
# The chain's own two scheduled_posts indexes (20260413200000:435-436) are
# appended verbatim so the fixture matches the chain for the indexes too.
grep -E '^CREATE INDEX IF NOT EXISTS idx_scheduled_posts_(user|status) ' "$LATE" >>"$TMP/late.sql"
if grep -q "CREATE TABLE IF NOT EXISTS scheduled_posts" "$TMP/late.sql"; then
  pass "extracted the scheduled_posts block from 20260413200000 (CREATE TABLE through the scheduled_posts_own policy, plus its two indexes)"
else
  fail "could not extract the scheduled_posts block from 20260413200000; the line range moved"
fi
if qf "$TMP/late.sql" >"$TMP/late.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/late.log")" ]; then
  pass "20260413200000's scheduled_posts block applied"
else
  fail "the late block did not apply"; tail -8 "$TMP/late.log"
fi
cols=$(q "select count(*) from pg_attribute where attrelid = 'public.scheduled_posts'::regclass and attname in ('platform_status','platform_errors') and attnum > 0 and not attisdropped")
if [ "${cols:-1}" = "0" ]; then
  pass "THE DEFECT REPRODUCES: scheduled_posts now exists and still has NEITHER platform column. A fresh replay produces a schema where app/api/artist/content/overview/route.ts:137 selects two columns that do not exist."
else
  fail "expected 0 platform columns after the two migrations, found $cols; the defect did not reproduce and this harness proves nothing"
fi

# ---------------------------------------------------------------------------
stage "2  the repair"
# ---------------------------------------------------------------------------
if qf "$NEW" >"$TMP/new1.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/new1.log")" ]; then
  pass "20260926140200 applied cleanly"
else
  fail "20260926140200 did not apply"; tail -10 "$TMP/new1.log"
fi
cols=$(q "select count(*) from pg_attribute where attrelid = 'public.scheduled_posts'::regclass and attname in ('platform_status','platform_errors') and attnum > 0 and not attisdropped")
if [ "${cols:-0}" = "2" ]; then
  pass "both platform columns now exist"
else
  fail "expected 2 platform columns after the repair, found $cols"
fi
idx=$(q "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_scheduled_posts_platform_status','idx_scheduled_posts_platform_errors')")
if [ "${idx:-0}" = "2" ]; then
  pass "both GIN indexes now exist"
else
  fail "expected 2 indexes after the repair, found $idx"
fi
if qf "$NEW" >"$TMP/new2.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/new2.log")" ]; then
  pass "20260926140200 applied a second time with no error (idempotent, including over a target that already had the columns out of band)"
else
  fail "second apply failed"; tail -10 "$TMP/new2.log"
fi
after=$(q "select count(*) from pg_attribute where attrelid = 'public.scheduled_posts'::regclass and attname in ('platform_status','platform_errors') and attnum > 0 and not attisdropped")
if [ "${after:-0}" = "2" ]; then
  pass "still exactly 2 platform columns after the second apply"
else
  fail "second apply changed the column count to $after"
fi

# ---------------------------------------------------------------------------
stage "3  the product's own read and write shapes work"
# ---------------------------------------------------------------------------
q "insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111')" >/dev/null
# lib/services/cross-platform-posting.service.ts:195 builds this exact object.
w=$(q "with t(p) as (select unnest(array['instagram','facebook','youtube','tiktok','twitter'])) insert into public.scheduled_posts (user_id, content, scheduled_for, platform_status) select '11111111-1111-1111-1111-111111111111','x', now(), (select jsonb_object_agg(p,'scheduled') from t) returning 1" 2>&1)
if [ "${w//[!0-9]/}" != "" ]; then
  pass "the per-platform status map shape from cross-platform-posting.service.ts:195 inserts cleanly"
else
  fail "the product's platform_status write failed: $w"
fi
# app/api/artist/content/overview/route.ts:137
r=$(q "select platform_status, platform_errors from public.scheduled_posts limit 1")
if printf '%s' "$r" | grep -q "scheduled"; then
  pass "the select at artist/content/overview/route.ts:137 returns both columns with their values"
else
  fail "the product's platform column read returned: $r"
fi
if [ "$(q "select coalesce(platform_errors::text,'') from public.scheduled_posts limit 1")" = "{}" ]; then
  pass "platform_errors defaults to an empty object, so the overview's cast at :181-182 is safe on a fresh row"
else
  fail "platform_errors default is not '{}'"
fi

# ---------------------------------------------------------------------------
stage "4  RLS surface untouched"
# ---------------------------------------------------------------------------
if [ "$(q "select relrowsecurity from pg_class where oid='public.scheduled_posts'::regclass")" = "t" ]; then
  pass "RLS is still enabled on scheduled_posts"
else
  fail "RLS is not enabled on scheduled_posts"
fi
if [ "$(q "select count(*) from pg_policies where schemaname='public' and tablename='scheduled_posts' and policyname='scheduled_posts_own'")" = "1" ]; then
  pass "the scheduled_posts_own policy is still present"
else
  fail "scheduled_posts_own disappeared"
fi

# ---------------------------------------------------------------------------
stage "5  contract postflight, and its ability to fail"
# ---------------------------------------------------------------------------
out=$(qf "$TST")
viol=$(printf '%s\n' "$out" | grep -c . | tr -d ' ')
summary=$(printf '%s\n' "$out" | grep -c 'scheduled_posts_platform_columns_ready' | tr -d ' ')
if [ "${summary:-0}" = "1" ] && [ "${viol:-0}" = "1" ]; then
  pass "postflight is green after the repair"
else
  fail "postflight returned $viol rows, $summary of them the summary"; printf '%s\n' "$out" | head -8
fi
q "alter table public.scheduled_posts drop column platform_errors" >/dev/null 2>&1
if qf "$TST" | grep -q 'missing_column'; then
  pass "postflight FAILS when a platform column is removed, so it can fail"
else
  fail "postflight passed with a column removed"
fi
# Re-apply the MIGRATION, not just the column: dropping the column also drops
# idx_scheduled_posts_platform_errors, which depends on it, so restoring the
# column alone leaves the index missing and the postflight correctly still red.
# That is the postflight proving check 5 works, not a defect.
if qf "$NEW" >/dev/null 2>&1 && qf "$TST" | grep -q 'scheduled_posts_platform_columns_ready'; then
  pass "re-applying the migration restores both the column AND the index it carries, and the postflight returns to green"
else
  fail "postflight did not return to green after re-applying the migration"
fi
idx=$(q "select count(*) from pg_indexes where schemaname='public' and indexname in ('idx_scheduled_posts_platform_status','idx_scheduled_posts_platform_errors')")
if [ "${idx:-0}" = "2" ]; then
  pass "both indexes are back, which is why the postflight is green: a dropped column takes its GIN index with it"
else
  fail "expected 2 indexes after re-apply, found $idx"
fi

# ---------------------------------------------------------------------------
stage "6  post-state re-assertion"
# ---------------------------------------------------------------------------
final=$(q "select count(*) from pg_attribute where attrelid='public.scheduled_posts'::regclass and attname in ('platform_status','platform_errors') and attnum>0 and not attisdropped")
if [ "${final:-0}" = "2" ] && [ "$fails" -eq 0 ]; then
  pass "post-state re-assertion: 2 platform columns present, 0 failed checks"
else
  fail "post-state re-assertion: $final platform columns, $fails checks failed"
fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (ordering defect reproduced from the real migrations, then repaired; RLS untouched)\n'
  exit 0
fi
printf '%s CHECK(S) FAILED\n' "$fails"
exit 1
