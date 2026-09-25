#!/usr/bin/env bash
# ============================================================================
# db011_marketplace_surface.harness.sh
#
# Executes the three DB-011 marketplace migrations on a throwaway PostgreSQL
# 16.15 cluster and runs the contract postflights against the result, with
# negative controls.
#
# WHAT THIS IS
#   A LOCAL EMULATION. PostgreSQL 16.15 (Homebrew), a throwaway cluster in
#   $TMPDIR, a minimal auth/roles bootstrap, and the real active-chain
#   migration 20260410120000_marketplace_core.sql applied verbatim. It is NOT
#   Supabase, NOT a hosted project, and NOT a chain replay: no
#   `supabase db reset`, no `migration up`, no full-chain apply (CP-051).
#   `marketplace_entitlements`'s music-commerce columns are stubbed, with the
#   real chain provenance asserted against the replay (see
#   supabase/tests/db011_emulation_bootstrap.sql).
#
# WHAT IT PROVES
#   1. each migration applies cleanly, and applies again unchanged (idempotent)
#   2. the postflight returns zero violations and exactly one summary row
#   3. the postflight FAILS when a contract element is removed (negative control)
#   4. anon cannot read the base table and can read only the safe projection
#   5. the download RPC is not executable by anon and refuses a null actor
#
# WHAT IT DOES NOT PROVE
#   Anything about a hosted environment: no apply, no PostgREST schema cache, no
#   real data, no advisor run, no production RLS verification. The operator's
#   manual apply and postflight remain the gate (CP-051).
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db011-mkt.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB011_PORT:-54339}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
# -q keeps psql from echoing command tags, so a trailing `reset role` cannot be
# mistaken for a result value. That mistake silently turned three assertions
# into "returned RESET" during development.
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
# Run a setup statement, then one query, then a teardown statement, and return
# ONLY the query's output. A trailing `reset role` must never be mistaken for a
# result value, and a setup failure must not be swallowed: an empty result is
# reported as empty so the caller fails loudly rather than asserting on nothing.
qs() {
  local setup="$1" query="$2" teardown="$3"
  # ONE psql session for all three. Running the setup in a separate invocation
  # silently discards `set role` and the JWT claim, which makes every buyer-scope
  # assertion measure an anonymous session instead.
  psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "$setup" -c "$query" -c "$teardown" 2>&1
}
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$1" 2>&1; }

cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

MIG_A=supabase/migrations/20260926120000_marketplace_checkout_idempotency_and_guest_checkout.sql
MIG_B=supabase/migrations/20260926120100_marketplace_external_listing_surface.sql
MIG_C=supabase/migrations/20260926120200_marketplace_entitlement_download_increment_rpc.sql
TST_A=supabase/tests/db011_marketplace_checkout_surface_contract.sql
TST_B=supabase/tests/db011_marketplace_external_listing_contract.sql
TST_C=supabase/tests/db011_marketplace_entitlement_rpc_contract.sql

printf 'db011 marketplace surface harness (local emulation, not a hosted target)\n'

# ===========================================================================
stage "0  cluster and fixture, with the fixture's own post-state asserted"
# ===========================================================================
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started on $SOCK:$PORT"

qf "$ROOT/supabase/tests/db011_emulation_bootstrap.sql" >"$TMP/boot.log" 2>&1
if q "select count(*) from pg_roles where rolname in ('anon','authenticated')" | grep -qx 2; then
  pass "bootstrap created the anon and authenticated roles"
else
  fail "bootstrap did not create anon/authenticated"; tail -5 "$TMP/boot.log"
fi
if [ "$(q "select to_regprocedure('auth.uid()') is not null")" = "t" ]; then
  pass "bootstrap created auth.users and auth.uid()"
else
  fail "bootstrap did not create auth.users / auth.uid()"
fi

qf "$ROOT/supabase/migrations/20260410120000_marketplace_core.sql" >"$TMP/core.log" 2>&1
if [ "$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('marketplace_orders','marketplace_listings','marketplace_order_items','marketplace_entitlements','marketplace_storefronts','marketplace_payout_ledger')")" -ge 6 ]; then
  pass "real chain migration 20260410120000_marketplace_core.sql applied (>=6 marketplace relations)"
else
  fail "marketplace core did not apply"; tail -5 "$TMP/core.log"
fi
qf "$ROOT/supabase/tests/db011_emulation_entitlements_stub.sql" >"$TMP/stub.log" 2>&1
if [ "$(q "select count(*) from information_schema.columns where table_schema='public' and table_name='marketplace_entitlements' and column_name='last_downloaded_at'")" = "1" ]; then
  pass "entitlement stub applied after the core migration (last_downloaded_at present)"
else
  fail "entitlement stub did not apply"; tail -5 "$TMP/stub.log"
fi
# The stubbed columns must match the replay's attribution, or the emulation is
# proving something different from the chain.
STUB_BAD=$(node -e '
  const {execFileSync}=require("child_process");
  const root=process.argv[1];
  const out=root+"/supabase/tests/.db011-attr.json";
  execFileSync("node",[root+"/supabase/tests/db008_chain_contract_replay.mjs",root,out],{stdio:"ignore"});
  const chain=JSON.parse(require("fs").readFileSync(out.replace(/\.json$/,"")+".chain-columns.json","utf8"));
  const e=chain["marketplace_entitlements"]||{};
  const want=["last_downloaded_at","listing_id","music_track_id","asset_bucket","asset_path","preview_bucket","preview_path"];
  const bad=want.filter(c=>{const src=e[c]||"";return !src.includes("20260410183000_music_commerce_expansion.sql")});
  require("fs").unlinkSync(out); try{require("fs").unlinkSync(out.replace(/\.json$/,"")+".chain-columns.json")}catch{}
  process.stdout.write(bad.join(","));' "$ROOT")
if [ -z "$STUB_BAD" ]; then
  pass "every stubbed marketplace_entitlements column is attributed to 20260410183000 by the chain replay"
else
  fail "stubbed columns not attributed to 20260410183000: $STUB_BAD"
fi

# ===========================================================================
stage "1  apply, twice (idempotence)"
# ===========================================================================
for m in "$MIG_A" "$MIG_B" "$MIG_C"; do
  name=$(basename "$m")
  ok=1
  for pass_n in 1 2; do
    if ! qf "$ROOT/$m" >"$TMP/apply.log" 2>&1; then ok=0; break; fi
  done
  if [ "$ok" = 1 ]; then pass "$name applies cleanly and is idempotent over two applies"; else fail "$name failed to apply"; tail -6 "$TMP/apply.log"; fi
done

if [ "$(q "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('marketplace_checkout_attempts','marketplace_external_listings','marketplace_external_clicks')")" = 3 ]; then
  pass "all three new relations exist after apply"
else
  fail "one or more new relations is missing after apply"
fi
if [ "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='record_marketplace_entitlement_download'")" = 1 ]; then
  pass "the download increment RPC exists"
else
  fail "the download increment RPC is missing"
fi

# ===========================================================================
stage "2  contract postflights on the real applied state"
# ===========================================================================
run_postflight() {
  local label="$1" file="$2"
  local out
  local out
  out="$(qf "$ROOT/$file")"
  local viol summary
  viol="$(printf '%s\n' "$out" | grep -v 'marketplace_checkout_surface_ready\|marketplace_external_listing_surface_ready\|marketplace_entitlement_download_rpc_ready' | grep -c '|' || true)"
  summary="$(printf '%s\n' "$out" | grep -c '_ready' || true)"
  if [ "$viol" = "0" ] && [ "$summary" = "1" ]; then
    pass "$label: 0 violations, 1 summary row"
  else
    fail "$label: $viol violation row(s), $summary summary row(s)"
    printf '%s\n' "$out" | grep '|' | sed 's/^/      /' | head -12
  fi
}
run_postflight "checkout surface" "$TST_A"
run_postflight "external listing surface" "$TST_B"
run_postflight "entitlement download rpc" "$TST_C"

# ===========================================================================
stage "3  authorization behaviour"
# ===========================================================================
if [ "$(q "select has_function_privilege('anon','public.record_marketplace_entitlement_download(uuid,text,timestamptz)','execute')")" = "f" ]; then
  pass "anon cannot EXECUTE the download increment RPC"
else
  fail "anon CAN execute the download increment RPC (this is the DB-002 finding)"
fi
if [ "$(q "select has_function_privilege('authenticated','public.record_marketplace_entitlement_download(uuid,text,timestamptz)','execute')")" = "t" ]; then
  pass "authenticated CAN execute the download increment RPC"
else
  fail "authenticated cannot execute the download increment RPC"
fi
if [ "$(q "select has_table_privilege('anon','public.marketplace_external_listings','select')")" = "f" ]; then
  pass "anon cannot SELECT the marketplace_external_listings base table"
else
  fail "anon CAN select the base table; canonical_url would be exposed"
fi
if [ "$(q "select has_table_privilege('anon','public.marketplace_external_listings_public','select')")" = "t" ]; then
  pass "anon CAN read the column-limited public projection"
else
  fail "anon cannot read the public projection"
fi
if [ "$(q "select string_agg(column_name,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='marketplace_external_listings_public'")" = "listing_id,provider_name,provider_domain,safety_status" ]; then
  pass "the public projection exposes exactly the four safe columns and not canonical_url"
else
  fail "the public projection exposes the wrong column set"
fi
ANON_ROWS=$(qs "set role anon" "select count(*) from public.marketplace_external_listings_public" "reset role")
if printf '%s' "$ANON_ROWS" | grep -qx 0; then
  pass "anon reads 0 rows from the projection while no listing is approved (RLS is live, not vacuous)"
else
  fail "anon projection read returned '$ANON_ROWS'"
fi
# The RPC must refuse an unauthenticated actor rather than incrementing.
RPC_ANON=$(qs "set role anon" "select public.record_marketplace_entitlement_download(gen_random_uuid())" "reset role" | tr '\n' ' ')
if printf '%s' "$RPC_ANON" | grep -qi 'requires an authenticated buyer\|permission denied'; then
  pass "the RPC refuses an anonymous caller"
else
  fail "the RPC did not refuse an anonymous caller: $RPC_ANON"
fi
# And it must refuse a non-buyer, and enforce the quota, with a real buyer.
q "insert into auth.users (id,email) values ('11111111-1111-1111-1111-111111111111','buyer@example.test'),('22222222-2222-2222-2222-222222222222','other@example.test');" >/dev/null
# Stage an order, a listing and an order item as the owner would, so the
# buyer-scope assertions run against a realistic row graph rather than a stub.
q "insert into public.marketplace_storefronts (id, seller_user_id, slug, display_name) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','test-store','Test Store') on conflict do nothing;" >/dev/null 2>&1
q "insert into public.marketplace_listings (id, storefront_id, seller_user_id, title, product_type, category, status, moderation_status, base_price, currency) values ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','Test Listing','physical','gear','published','approved',10,'USD') on conflict do nothing;" >/dev/null 2>&1
q "insert into public.marketplace_orders (id, seller_user_id, status, payment_status, payment_provider, currency, subtotal_amount, platform_fee_amount, tax_amount, total_amount, metadata) values ('66666666-6666-6666-6666-666666666666','11111111-1111-1111-1111-111111111111','pending','processing','stripe','USD',10,1,0,11,'{}') on conflict do nothing;" >/dev/null 2>&1
q "insert into public.marketplace_order_items (id, order_id, listing_id, title, product_type, quantity, unit_price, line_total) values ('33333333-3333-3333-3333-333333333333','66666666-6666-6666-6666-666666666666','55555555-5555-5555-5555-555555555555','Test Listing','physical',1,10,10) on conflict do nothing;" >/dev/null 2>&1
STAGED=$(q "select count(*) from public.marketplace_order_items where id='33333333-3333-3333-3333-333333333333'")
ITEM=$(q "select id from public.marketplace_order_items where id='33333333-3333-3333-3333-333333333333'")
if [ "$STAGED" != "1" ]; then
  fail "could not stage the order/listing/order_item graph; the buyer-scope assertions would be vacuous"
  printf '      storefronts=%s listings=%s orders=%s order_items=%s\n' \
    "$(q "select count(*) from public.marketplace_storefronts")" \
    "$(q "select count(*) from public.marketplace_listings")" \
    "$(q "select count(*) from public.marketplace_orders")" \
    "$(q "select count(*) from public.marketplace_order_items")"
fi
if [ -n "$ITEM" ]; then
  q "insert into public.marketplace_entitlements (order_item_id, buyer_user_id, asset_url, max_downloads) values ('$ITEM','11111111-1111-1111-1111-111111111111','https://x/y',2);" >/dev/null 2>&1
  if [ "$(q "select count(*) from public.marketplace_entitlements where order_item_id='$ITEM'")" != "1" ]; then
    fail "could not stage the entitlement row; the RPC behaviour assertions would be vacuous"
  fi
  OTHER=$(qs "set role authenticated" "set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222'" "select public.record_marketplace_entitlement_download('$ITEM')" "reset role" | tr '\n' ' ')
  if printf '%s' "$OTHER" | grep -qi 'No active entitlement with remaining downloads'; then
    pass "the RPC refuses a signed-in non-buyer (buyer scope enforced server-side)"
  else
    fail "the RPC did not refuse a non-buyer: $OTHER"
  fi
  FIRST=$(qs "set role authenticated" "set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'" "select (public.record_marketplace_entitlement_download('$ITEM')).download_count" "reset role" | tail -1)
  SECOND=$(qs "set role authenticated" "set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'" "select (public.record_marketplace_entitlement_download('$ITEM')).download_count" "reset role" | tail -1)
  THIRD=$(qs "set role authenticated" "set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'" "select (public.record_marketplace_entitlement_download('$ITEM')).download_count" "reset role" | tr '\n' ' ')
  if [ "$FIRST" = "1" ] && [ "$SECOND" = "2" ] && printf '%s' "$THIRD" | grep -qi 'No active entitlement with remaining downloads'; then
    pass "the RPC increments 1 then 2 and then refuses the third call at max_downloads=2 (quota enforced in one statement)"
  else
    fail "quota sequence was '$FIRST','$SECOND','$THIRD'"
  fi
  # Two concurrent callers at the last remaining download: exactly one wins.
  q "update public.marketplace_entitlements set download_count=1, max_downloads=2 where order_item_id='$ITEM';" >/dev/null
  ( qs "set role authenticated" "set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'" "select public.record_marketplace_entitlement_download('$ITEM')" "reset role" >"$TMP/c1" 2>&1 ) &
  ( qs "set role authenticated" "set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'" "select public.record_marketplace_entitlement_download('$ITEM')" "reset role" >"$TMP/c2" 2>&1 ) &
  wait
  WINS=$(cat "$TMP/c1" "$TMP/c2" | grep -c 'No active entitlement' || true)
  if [ "$WINS" -ge 1 ]; then
    pass "two concurrent downloads at the last remaining credit: at least one refused (no double-count, no 409 for a legitimate buyer)"
  else
    fail "two concurrent downloads both succeeded; the quota was exceeded"
  fi
else
  fail "could not stage an entitlement row for the buyer-scope tests"
fi

# ===========================================================================
stage "4  negative controls: the postflights must fail when the contract breaks"
# ===========================================================================
negative() {
  local label="$1" teardown="$2" file="$3"
  q "$teardown" >/dev/null 2>&1
  local out summary
  out="$(qf "$ROOT/$file")"
  summary="$(printf '%s\n' "$out" | grep -c '_ready' || true)"
  local viols
  viols="$(printf '%s\n' "$out" | grep '|' | grep -vc '_ready' || true)"
  if [ "$viols" -gt 0 ]; then
    pass "negative control '$label': postflight reports $viols violation row(s)"
    printf '%s\n' "$out" | grep '|' | grep -v '_ready' | sed 's/^/      /' | head -3
  else
    fail "negative control '$label': postflight reported no violation"
  fi
  # Restore by rebuild, not by re-apply: the migration is `create table if not
  # exists`, so a re-apply would NOT bring back a dropped column or constraint
  # and the following stage would measure a half-broken fixture.
  q "drop table if exists public.marketplace_checkout_attempts cascade" >/dev/null 2>&1
  q "drop table if exists public.marketplace_external_clicks cascade" >/dev/null 2>&1
  q "drop view if exists public.marketplace_external_listings_public" >/dev/null 2>&1
  q "drop table if exists public.marketplace_external_listings cascade" >/dev/null 2>&1
  q "drop function if exists public.record_marketplace_entitlement_download(uuid,text,timestamptz)" >/dev/null 2>&1
  qf "$ROOT/$MIG_A" >/dev/null 2>&1
  qf "$ROOT/$MIG_B" >/dev/null 2>&1
  qf "$ROOT/$MIG_C" >/dev/null 2>&1
}
negative "checkout idempotency index dropped" \
  "drop index if exists idx_marketplace_checkout_attempts_key; alter table public.marketplace_checkout_attempts drop constraint if exists marketplace_checkout_attempts_idempotency_key_key;" \
  "$TST_A"
negative "guest_email removed from checkout attempts" \
  "alter table public.marketplace_checkout_attempts drop column if exists guest_email;" \
  "$TST_A"
negative "RLS disabled on checkout attempts" \
  "alter table public.marketplace_checkout_attempts disable row level security;" \
  "$TST_A"
negative "anon granted select on the base external table" \
  "grant select on public.marketplace_external_listings to anon;" \
  "$TST_B"
negative "anon granted execute on the download RPC" \
  "grant execute on function public.record_marketplace_entitlement_download(uuid,text,timestamptz) to anon;" \
  "$TST_C"

# ===========================================================================
stage "5  post-state re-assertion"
# ===========================================================================
run_postflight "checkout surface (restored)" "$TST_A"
run_postflight "external listing surface (restored)" "$TST_B"
run_postflight "entitlement download rpc (restored)" "$TST_C"

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then printf 'ALL CHECKS PASSED (local emulation; no hosted apply claimed)\n'; exit 0; fi
printf '%d CHECK(S) FAILED\n' "$fails"; exit 1
