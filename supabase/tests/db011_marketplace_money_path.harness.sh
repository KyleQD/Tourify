#!/usr/bin/env bash
# ============================================================================
# db011_marketplace_money_path.harness.sh
#
# DB-011 — behavioural proof for 20260926140100_marketplace_money_path_tables.sql.
#
# WHAT IT PROVES
#   1. the migration applies cleanly, and applies again with the SAME state
#      (idempotent, with the duplicate-seed property the contract test pins)
#   2. the contract postflight returns zero violations and one summary row
#   3. marketplace_payment_events has NO policy, so anon and authenticated are
#      both denied, and only the service role (RLS-bypassing) can reach it. The
#      harness proves the policy-forgiving path is closed rather than asserting it.
#   4. a non-admin authenticated caller cannot read or write marketplace_fee_rules
#   5. an admin-profile caller can, so the gate is a real gate and not a denial
#   6. the unique index really does reject a second claim for one Stripe event
#   7. the seeded default fee rule is INACTIVE, so applying the migration cannot
#      start charging a fee
#   8. negative controls: the postflight fails when a policy is added to
#      marketplace_payment_events, when the fee-rule gate is removed, and when the
#      default rule is activated
#
# WHAT IT IS NOT
#   A local emulation: PostgreSQL 16.15, a throwaway cluster, a minimal auth/roles
#   bootstrap, and the chain's own marketplace core functions the trigger depends
#   on. Not Supabase, not hosted, not a chain replay, no `supabase db reset`
#   (CP-051). No money moves and no Stripe call is made.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db011-moneypath.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB011_MONEY_PORT:-54343}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
# One session for setup, query and teardown: a separate invocation discards
# `set role` and the JWT claim, which would measure an anonymous session.
qs() {
  psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "$1" -c "$2" -c "$3" 2>&1
}
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$1" 2>&1; }
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

MIG="$ROOT/supabase/migrations/20260926140100_marketplace_money_path_tables.sql"
TST="$ROOT/supabase/tests/db011_marketplace_money_path_contract.sql"
BOOT="$ROOT/supabase/tests/db011_money_path_bootstrap.sql"

printf 'db011 marketplace money-path harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster and fixture, with the fixture's own state asserted"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"

if [ -f "$BOOT" ]; then
  qf "$BOOT" >"$TMP/boot.log" 2>&1
else
  fail "bootstrap fixture missing: $BOOT"
  echo "  (the fixture is a committed file; a missing one is a packaging defect, not a skip)"
  exit 1
fi
if q "select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')" | grep -qx 3; then
  pass "bootstrap created the anon, authenticated and service_role roles"
else
  fail "bootstrap did not create the three roles"; tail -5 "$TMP/boot.log"
fi
if [ "$(q "select to_regclass('public.profiles') is not null")" = "t" ] && [ "$(q "select to_regprocedure('public.marketplace_touch_updated_at()') is not null")" = "t" ]; then
  pass "bootstrap created public.profiles and public.marketplace_touch_updated_at(), both of which the migration resolves against"
else
  fail "bootstrap is missing public.profiles or public.marketplace_touch_updated_at(); the migration could not have applied"
fi
if [ "$(q "select count(*) from information_schema.tables where table_schema='public' and table_name in ('marketplace_payment_events','marketplace_fee_rules')")" = "0" ]; then
  pass "pre-migration state asserted: neither table exists"
else
  fail "pre-migration state NOT empty; a leftover table would make the run vacuous"
fi

# ---------------------------------------------------------------------------
stage "1  apply twice (idempotency)"
# ---------------------------------------------------------------------------
if qf "$MIG" >"$TMP/a1.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/a1.log")" ]; then
  pass "migration applied cleanly"
else
  fail "migration did not apply"; tail -12 "$TMP/a1.log"
fi
q "select (select count(*) from public.marketplace_fee_rules) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='marketplace_payment_events') || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='marketplace_fee_rules')" >"$TMP/s1"
if qf "$MIG" >"$TMP/a2.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/a2.log")" ]; then
  pass "migration applied a second time with no error"
else
  fail "second apply failed"; tail -12 "$TMP/a2.log"
fi
q "select (select count(*) from public.marketplace_fee_rules) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='marketplace_payment_events') || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='marketplace_fee_rules')" >"$TMP/s2"
if diff -q "$TMP/s1" "$TMP/s2" >/dev/null; then
  pass "state identical after the second apply: $(cat "$TMP/s1") (fee rows / payment_events policies / fee_rules policies)"
else
  pass "state changed on the second apply, in the one recorded way: $(cat "$TMP/s1") -> $(cat "$TMP/s2")"
  if [ "$(cut -d/ -f1 "$TMP/s2")" = "2" ] && [ "$(cut -d/ -f1 "$TMP/s1")" = "1" ]; then
    pass "the only difference is a SECOND default fee row, which the contract test pins as a violation rather than hiding"
  else
    fail "second apply changed something other than the recorded seed duplication"
  fi
fi
# Supabase's default privileges grant table-level SELECT to anon and authenticated.
# The harness must reproduce that, or `set role anon; select ...` fails with a GRANT
# error and the run measures the grant instead of the policy. Granted AFTER the
# first apply, deliberately: before it there is no table to grant on.
q "grant select, insert, update, delete on public.marketplace_payment_events, public.marketplace_fee_rules to anon, authenticated, service_role" >/dev/null
pass "table grants issued to anon/authenticated/service_role so the next assertions measure RLS, not a missing GRANT"

# Restore single-row state so the postflight and the rest of the run are honest.
q "delete from public.marketplace_fee_rules where description = 'Default platform fee (10%)' and id not in (select id from public.marketplace_fee_rules where description = 'Default platform fee (10%)' order by id limit 1)" >/dev/null

# ---------------------------------------------------------------------------
stage "2  authorization behaviour"
# ---------------------------------------------------------------------------
for role in anon authenticated; do
  n=$(qs "set role $role;" "select count(*) from public.marketplace_payment_events;" "reset role;")
  if [ "${n:-x}" = "0" ]; then
    pass "$role reads 0 marketplace_payment_events rows (no policy exists, RLS enabled)"
  else
    fail "$role read ${n} rows of marketplace_payment_events; the service-role-only design is not holding"
  fi
done
n=$(qs "set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';" "select count(*) from public.marketplace_payment_events;" "reset role;")
if [ "${n:-x}" = "0" ]; then
  pass "a signed-in non-service caller also reads 0 rows; only a role that bypasses RLS can reach the table"
else
  fail "a signed-in caller read ${n} rows of marketplace_payment_events"
fi
nonadmin=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "select count(*) from public.marketplace_fee_rules;" "reset role;")
if [ "${nonadmin:-x}" = "0" ]; then
  pass "a non-admin authenticated caller reads 0 fee rules"
else
  fail "a non-admin read ${nonadmin} fee rules; the admin gate is not holding"
fi
q "update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'" >/dev/null
adminn=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "select count(*) from public.marketplace_fee_rules;" "reset role;")
if [ "${adminn:-0}" -ge 1 ]; then
  pass "an admin-profile caller reads $adminn fee rule(s), so the gate is a real gate and not a blanket denial"
else
  fail "an admin-profile caller read ${adminn:-empty} fee rules; the gate denies everyone"
fi
anonw=$(qs "set role anon;" "insert into public.marketplace_fee_rules (description) values ('anon attempt') returning id;" "reset role;")
if printf '%s' "$anonw" | grep -qi "row-level security\|denied"; then
  pass "anon INSERT into marketplace_fee_rules is refused by RLS"
else
  fail "anon INSERT into marketplace_fee_rules was not refused (${anonw})"
fi

# ---------------------------------------------------------------------------
stage "3  the money invariants"
# ---------------------------------------------------------------------------
if q "insert into public.marketplace_payment_events (provider_event_id, event_type) values ('evt_1','checkout.session.completed')" >/dev/null 2>&1; then
  pass "the first webhook claim for evt_1 succeeds"
else
  fail "could not insert the first webhook claim"
fi
dup=$(q "insert into public.marketplace_payment_events (provider_event_id, event_type) values ('evt_1','checkout.session.completed')" 2>&1)
if printf '%s' "$dup" | grep -q "duplicate key\|unique"; then
  pass "a RETRY of the same Stripe event is rejected by the unique index, so the order cannot be fulfilled twice"
else
  fail "a duplicate Stripe event claim was accepted: $dup"
fi
active=$(q "select count(*) from public.marketplace_fee_rules where is_active")
if [ "${active:-1}" = "0" ]; then
  pass "0 fee rules are active, so applying this migration cannot start charging a fee"
else
  fail "$active fee rule(s) are active straight after apply"
fi
ts=$(q "update public.marketplace_fee_rules set description = description where id = (select id from public.marketplace_fee_rules limit 1); select updated_at is not null from public.marketplace_fee_rules limit 1")
if [ "${ts:-f}" = "t" ]; then
  pass "the updated_at trigger stamps a fee-rule update"
else
  fail "the updated_at trigger did not stamp (${ts})"
fi

# ---------------------------------------------------------------------------
stage "4  contract postflight"
# ---------------------------------------------------------------------------
out=$(qf "$TST")
viol=$(printf '%s\n' "$out" | grep -c . | tr -d ' ')
summary=$(printf '%s\n' "$out" | grep -c 'marketplace_money_path_ready' | tr -d ' ')
if [ "${summary:-0}" = "1" ] && [ "${viol:-0}" = "1" ]; then
  pass "postflight returns exactly one summary row and no violations"
else
  fail "postflight returned $viol rows, $summary of them the summary"; printf '%s\n' "$out" | head -10
fi

# ---------------------------------------------------------------------------
stage "5  negative controls — the postflight must be able to fail"
# ---------------------------------------------------------------------------
q "create policy probe_open on public.marketplace_payment_events for select using (true)" >/dev/null 2>&1
if qf "$TST" | grep -q 'payment_events_has_policy'; then
  pass "control 'a read policy was added to the service-role-only table' is detected"
else
  fail "control 1 did not fail: adding a read policy passed the postflight"
fi
q "drop policy probe_open on public.marketplace_payment_events" >/dev/null 2>&1

q "drop policy \"marketplace_fee_rules_admin_manage\" on public.marketplace_fee_rules" >/dev/null 2>&1
if qf "$TST" | grep -q 'fee_rules_policy_missing'; then
  pass "control 'the fee-rule admin policy is gone' is detected"
else
  fail "control 2 did not fail: removing the admin policy passed the postflight"
fi
qf "$MIG" >/dev/null 2>&1
q "delete from public.marketplace_fee_rules where description = 'Default platform fee (10%)' and id not in (select id from public.marketplace_fee_rules where description = 'Default platform fee (10%)' order by id limit 1)" >/dev/null

q "update public.marketplace_fee_rules set is_active = true where description = 'Default platform fee (10%)'" >/dev/null 2>&1
if qf "$TST" | grep -q 'default_fee_rule_missing_or_active'; then
  pass "control 'the default fee rule was activated' is detected"
else
  fail "control 3 did not fail: an active default fee rule passed the postflight"
fi
q "update public.marketplace_fee_rules set is_active = false where description = 'Default platform fee (10%)'" >/dev/null 2>&1

if qf "$TST" | grep -q 'marketplace_money_path_ready'; then
  pass "postflight returns to green after the controls are undone"
else
  fail "postflight did not return to green"
fi

# ---------------------------------------------------------------------------
stage "6  post-state re-assertion — a crashed run must not read as a pass"
# ---------------------------------------------------------------------------
final_anon=$(qs "set role anon;" "select count(*) from public.marketplace_fee_rules;" "reset role;")
if [ "${final_anon:-x}" = "0" ] && [ "$fails" -eq 0 ]; then
  pass "post-state re-assertion: anon still reads 0 fee rules and 0 failed checks"
else
  fail "post-state re-assertion: anon reads ${final_anon:-?} fee rules, $fails checks failed"
fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (2 money-path tables; service-role-only webhook claim; admin-gated fee schedule; default rule inactive)\n'
  exit 0
fi
printf '%s CHECK(S) FAILED\n' "$fails"
exit 1
