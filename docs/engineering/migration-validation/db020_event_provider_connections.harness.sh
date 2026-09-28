#!/usr/bin/env bash
# ============================================================================
# db020_event_provider_connections.harness.sh
#
# DB-020 — behavioural proof for 20260927140000_event_provider_connections.sql
# (HF-DB019-EVENT-PROVIDER-CONNECTIONS, received from INTG-010).
#
# WHAT IT PROVES
#   1. the BEFORE state: the two reachable routes' exact query shapes fail with
#      SQLSTATE 42P01 against the absent relation, which is what PostgREST turns
#      into the 500 the handoff reports
#   2. the migration applies THREE TIMES consecutively, exit 0 each time
#   3. the AFTER state: the same two query shapes return rows instead of 42P01,
#      as the caller identity the status route uses and as the service role the
#      disconnect route uses
#   4. own-rows-only is real: user A reads A's connection and reads ZERO of B's
#   5. anon holds nothing, and `authenticated` holds SELECT and NOTHING else
#   6. the service-role policy is a real rescue and not decoration: with
#      BYPASSRLS removed from service_role the disconnect route still works
#   7. the post-condition is ABLE TO FAIL, twelve ways, each fired and reported
#   8. a second apply preserves seeded rows (the `if not exists` guard does not
#      turn into a data loss)
#
# WHAT IT IS NOT
#   A local emulation: PostgreSQL 16.15, a throwaway cluster in a temp dir, and a
#   minimal auth/roles bootstrap. Not Supabase, not a hosted project, not a chain
#   replay, no `supabase db reset`, no `db push --include-all` (CP-051). The
#   migration itself was NOT applied to any environment by this harness; the
#   operator's reviewed manual apply is the gate.
#
# WHY IT LIVES HERE AND NOT IN supabase/tests/
#   `supabase/tests/**` is outside DB-020's working set, and
#   `docs/engineering/migration-validation/**` is inside it. Moving this into
#   `supabase/tests/` and wiring it into `npm run check:db008-harness` needs a
#   working-set amendment plus `package.json` and `.github/workflows/ci.yml`,
#   which are other lanes'. Recorded in the DB-020 task record.
#
# POSTURE, taken from four prior waves in this repository
#   * every fixture stage asserts its OWN post-state before the next stage runs,
#     because a harness that silently failed to build has shipped a false green
#     four times in this repository's recent history;
#   * every negative control is paired with a precondition assertion that the
#     defect really was injected, because a control that exercised nothing is
#     worse than no control;
#   * the negative controls for a post-condition are BREAKAGES, never removals of
#     surface: removing surface can never fail a check that asks "is it absent".
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db020-epc.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB020_EPC_PORT:-54341}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -f "$1" 2>&1; }
# The operator applies this migration as ONE transaction (psql -1 / `supabase
# migration up`). The harness does the same, because without it a failing
# post-condition leaves the grants installed and every later assertion measures a
# half-applied fixture -- which is exactly what the first revision of this harness
# did, and it produced 19 passes against a file that had not applied.
qmig() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -1 -f "$MIG" 2>&1; }
# A DDL statement whose exit code is asserted, so an `alter role` that silently
# failed cannot leave a "precondition" reading the value it was supposed to have
# changed. The first revision of this harness asserted a role had lost BYPASSRLS
# without checking that the ALTER succeeded, so the rescue test that followed was
# vacuous.
qddl() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" >/dev/null 2>&1; }
# One session for setup, query and teardown: a separate invocation silently
# discards `set role` and the JWT claim, which would measure an anonymous session
# instead of the identity under test.
qs() {
  local setup="$1" query="$2" teardown="$3"
  psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "$setup" -c "$query" -c "$teardown" 2>&1
}
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

MIG="$ROOT/supabase/migrations/20260927140000_event_provider_connections.sql"
MIGNAME="20260927140000_event_provider_connections.sql"

printf 'db020 event_provider_connections harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"

# ---------------------------------------------------------------------------
stage "1  Supabase-shaped bootstrap, and its own post-state asserted"
# ---------------------------------------------------------------------------
# auth.users and auth.uid() are the only two things the migration resolves
# against outside `public`, and the three roles are the only ones its grants and
# policies name. Mirrors supabase/tests/db011_emulation_bootstrap.sql, plus
# `service_role` with BYPASSRLS as Supabase has it.
cat >"$TMP/boot.sql" <<'BOOT'
create schema if not exists auth;
create schema if not exists private;   -- a real Supabase schema, and the 20260821025543 precedent
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable
  as $fn$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
BOOT
qf "$TMP/boot.sql" >"$TMP/boot.log" 2>&1
roles=$(q "select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')")
bypass=$(q "select rolbypassrls from pg_roles where rolname = 'service_role'")
if [ "$roles" = "3" ] && [ "$bypass" = "t" ] \
   && [ "$(q "select to_regclass('auth.users') is not null")" = "t" ] \
   && [ "$(q "select to_regprocedure('auth.uid()') is not null")" = "t" ]; then
  pass "bootstrap asserted: 3 roles, service_role BYPASSRLS=t, auth.users and auth.uid() present"
else
  fail "bootstrap incomplete: roles=$roles bypass=$bypass"
  cat "$TMP/boot.log"
  exit 1
fi

# ---------------------------------------------------------------------------
stage "2  the two routes' query shapes are transcribed from the live files"
# ---------------------------------------------------------------------------
# A transcription in a harness drifts. These assertions fail the run if the
# route files stop containing the exact column list asserted below.
STATUS_ROUTE="$ROOT/app/api/integrations/bandsintown/status/route.ts"
DISCONNECT_ROUTE="$ROOT/app/api/integrations/bandsintown/disconnect/route.ts"
STATUS_COLUMNS='id, owner_type, owner_id, external_identity, display_name, status, connection_mode, last_synced_at, last_error_code'
if grep -Fq "$STATUS_COLUMNS" "$STATUS_ROUTE"; then
  pass "status route still selects the transcribed 9 columns (app/api/integrations/bandsintown/status/route.ts:17)"
else
  fail "status route's select list changed; the transcription in this harness is stale"
fi
if grep -Fq 'select("id, created_by, provider")' "$DISCONNECT_ROUTE" \
   && grep -Fq 'status: "disconnected", next_sync_at: null' "$DISCONNECT_ROUTE"; then
  pass "disconnect route still selects and updates the transcribed 3 columns / 3 fields"
else
  fail "disconnect route's query changed; the transcription in this harness is stale"
fi

# The exact SQL PostgREST generates for the two builders, as the caller identity
# and as the service role respectively.
STATUS_SQL="select id, owner_type, owner_id, external_identity, display_name, status, connection_mode, last_synced_at, last_error_code from public.event_provider_connections where provider = 'bandsintown' and created_by = '11111111-1111-1111-1111-111111111111' order by created_at desc"
DISCONNECT_SELECT_SQL="select id, created_by, provider from public.event_provider_connections where id = 'aaaaaaaa-0000-0000-0000-000000000001'"
DISCONNECT_UPDATE_SQL="update public.event_provider_connections set status = 'disconnected', next_sync_at = null, updated_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001'"

# ---------------------------------------------------------------------------
stage "3  BEFORE: the relation is absent, so both routes fail"
# ---------------------------------------------------------------------------
if [ "$(q "select to_regclass('public.event_provider_connections') is null")" = "t" ]; then
  pass "BEFORE state asserted: public.event_provider_connections does not exist"
else
  fail "BEFORE state is wrong: the relation already exists, so this proves nothing"
  exit 1
fi
status_before=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "$STATUS_SQL" "reset role;")
disconnect_before=$(qs "set role service_role;" "$DISCONNECT_SELECT_SQL" "reset role;")
if printf '%s' "$status_before" | grep -q 'does not exist'; then
  pass "BEFORE: bandsintown/status's query fails with 42P01 ($(printf '%s' "$status_before" | grep -o 'relation .* does not exist' | head -1)) — PostgREST surfaces this as the 500"
else
  fail "BEFORE: expected a 42P01 from the status query, got: $status_before"
fi
if printf '%s' "$disconnect_before" | grep -q 'does not exist'; then
  pass "BEFORE: bandsintown/disconnect's query fails with 42P01 as service_role too"
else
  fail "BEFORE: expected a 42P01 from the disconnect query, got: $disconnect_before"
fi

# ---------------------------------------------------------------------------
stage "4  apply THREE times consecutively"
# ---------------------------------------------------------------------------
for i in 1 2 3; do
  out=$(qmig 2>&1); rc=$?
  if [ "$rc" -ne 0 ]; then
    fail "apply #$i exited $rc"
    printf '%s\n' "$out" | head -8
    break
  fi
  if printf '%s' "$out" | grep -qi 'error'; then
    fail "apply #$i printed an error"
    printf '%s\n' "$out" | head -8
    break
  fi
  state=$(q "select (select count(*) from pg_attribute where attrelid='public.event_provider_connections'::regclass and attnum>0 and not attisdropped) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='event_provider_connections')")
  if [ "$state" != "17/4" ]; then
    fail "apply #$i left the wrong state: $state (expected 17/4)"
    break
  fi
  pass "apply #$i exit 0, state 17 columns / 4 policies"
done

# ---------------------------------------------------------------------------
stage "5  seed, then the AFTER state for the two reachable routes"
# ---------------------------------------------------------------------------
q "insert into auth.users (id, email) values
     ('11111111-1111-1111-1111-111111111111','a@example.test'),
     ('22222222-2222-2222-2222-222222222222','b@example.test');
   insert into public.event_provider_connections
     (id, owner_type, owner_id, provider, external_identity, display_name, status, connection_mode, secret_reference, scopes, created_by, next_sync_at)
   values
     ('aaaaaaaa-0000-0000-0000-000000000001','artist','bbbbbbbb-0000-0000-0000-000000000001','bandsintown','bit-artist-1','Artist One','active','artist_owned_key','vault://provider/1',array['events:read'],'11111111-1111-1111-1111-111111111111', now()),
     ('aaaaaaaa-0000-0000-0000-000000000002','venue','cccccccc-0000-0000-0000-000000000001','bandsintown','bit-venue-1','Venue One','pending','partner','vault://provider/2',null,'22222222-2222-2222-2222-222222222222',null);
   " >"$TMP/seed.log" 2>&1
if [ "$(q "select count(*) from public.event_provider_connections")" = "2" ]; then
  pass "seed asserted: 2 connections, one per user"
else
  fail "seed failed"
  cat "$TMP/seed.log"
  exit 1
fi

status_after=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "$STATUS_SQL" "reset role;")
if printf '%s' "$status_after" | grep -q 'aaaaaaaa-0000-0000-0000-000000000001' \
   && ! printf '%s' "$status_after" | grep -q 'does not exist'; then
  pass "AFTER: bandsintown/status returns its row instead of 42P01 — $(printf '%s' "$status_after" | tr '|' ' ' | head -1)"
else
  fail "AFTER: the status query did not return the caller's own row: $status_after"
fi
rows_after=$(printf '%s' "$status_after" | grep -c 'aaaaaaaa-')
if [ "$rows_after" = "1" ]; then
  pass "AFTER: exactly 1 row for the caller — the other user's connection is not returned"
else
  fail "AFTER: expected exactly 1 row for user A, got $rows_after"
fi

disconnect_sel=$(qs "set role service_role;" "$DISCONNECT_SELECT_SQL" "reset role;")
if printf '%s' "$disconnect_sel" | grep -q '11111111-1111-1111-1111-111111111111'; then
  pass "AFTER: bandsintown/disconnect's select returns the row instead of 42P01"
else
  fail "AFTER: the disconnect select did not return the row: $disconnect_sel"
fi
qs "set role service_role;" "$DISCONNECT_UPDATE_SQL" "reset role;" >/dev/null
if [ "$(q "select status from public.event_provider_connections where id = 'aaaaaaaa-0000-0000-0000-000000000001'")" = "disconnected" ]; then
  pass "AFTER: bandsintown/disconnect's update lands (status = disconnected)"
else
  fail "AFTER: the disconnect update did not land"
fi

# ---------------------------------------------------------------------------
stage "6  own-rows-only, and the grant set, as real identities"
# ---------------------------------------------------------------------------
# PRECONDITION, measured on a DIFFERENT principal than the assertion below. The
# first revision of this harness ran the precondition and the test as the SAME
# statement for the SAME identity, which made the precondition unable to fail and
# the test unable to mean anything.
other_total=$(q "select count(*) from public.event_provider_connections")
if [ "$other_total" = "2" ]; then
  pass "PRECONDITION asserted: the table holds 2 rows, so an RLS-filtered count of 0 is a filter and not an empty table"
else
  fail "precondition wrong: expected 2 seeded rows, saw $other_total"
fi
other_filtered=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" \
  "select count(*) from public.event_provider_connections where created_by <> auth.uid();" "reset role;")
if [ "$other_filtered" = "0" ]; then
  pass "RLS: user A's SELECT of another user's connection is filtered to 0 rows by the policy, not by the route"
else
  fail "RLS: user A can see another user's connection ($other_filtered rows)"
fi
own_kept=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" \
  "select count(*) from public.event_provider_connections where created_by = auth.uid();" "reset role;")
if [ "$own_kept" = "1" ]; then
  pass "RLS: and the SAME caller still reads their own 1 row, so the zero above is a scope and not a denial"
else
  fail "RLS: the caller cannot read their own row ($own_kept) — that is a functional false-denial, not a scope"
fi
anon_sel=$(qs "set role anon;" "select count(*) from public.event_provider_connections;" "reset role;")
if printf '%s' "$anon_sel" | grep -q 'permission denied'; then
  pass "GRANT: anon SELECT is a permission error, not a silent empty list"
else
  fail "GRANT: anon was able to read the table: $anon_sel"
fi
for priv in insert update delete; do
  out=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" \
    "$priv into public.event_provider_connections (owner_type, owner_id, provider, external_identity, created_by) values ('artist','dddddddd-0000-0000-0000-000000000001','bandsintown','x','11111111-1111-1111-1111-111111111111');" "reset role;")
  if [ "$priv" = "update" ]; then
    out=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" \
      "update public.event_provider_connections set display_name = 'hijacked';" "reset role;")
  elif [ "$priv" = "delete" ]; then
    out=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" \
      "delete from public.event_provider_connections;" "reset role;")
  fi
  if printf '%s' "$out" | grep -q 'permission denied'; then
    pass "GRANT: authenticated $priv is denied (the archive granted insert+update; this file grants SELECT only)"
  else
    fail "GRANT: authenticated $priv was NOT denied: $out"
  fi
done
svc_del=$(q "select has_table_privilege('service_role','public.event_provider_connections','delete')")
if [ "$svc_del" = "f" ]; then
  pass "GRANT: service_role holds NO delete, matching the absence of a consumer and of a DELETE policy"
else
  fail "GRANT: service_role holds delete (has_table_privilege=$svc_del)"
fi
anon_priv=$(q "select has_table_privilege('anon','public.event_provider_connections','select,insert,update,delete')")
if [ "$anon_priv" = "f" ]; then
  pass "GRANT: anon holds no privilege at all"
else
  fail "GRANT: anon holds a privilege ($anon_priv)"
fi

# The service_role policy measured as a rescue rather than as decoration.
if qddl "alter role service_role nobypassrls;"; then
  pass "service_role BYPASSRLS removed (the ALTER's exit code was asserted, not ignored)"
else
  fail "could not remove BYPASSRLS from service_role, so the rescue probe below would be vacuous"
fi
nobypass=$(q "select rolbypassrls from pg_roles where rolname='service_role'")
if [ "$nobypass" = "f" ]; then
  pass "PRECONDITION asserted: the catalog really reports service_role BYPASSRLS=f, so the next probe is not vacuous"
else
  fail "precondition wrong: service_role still reports BYPASSRLS=$nobypass"
fi
nobypass_read=$(qs "set role service_role;" \
  "select count(*) from public.event_provider_connections;" "reset role;")
if [ "$nobypass_read" = "2" ]; then
  pass "RLS: with BYPASSRLS removed, the service-role policy alone carries the 4 service-role consumers (2 rows)"
else
  fail "RLS: the service_role policy does not carry the read without BYPASSRLS: $nobypass_read"
fi
nobypass_write=$(qs "set role service_role;" \
  "update public.event_provider_connections set last_error_code = 'probe' where id = 'aaaaaaaa-0000-0000-0000-000000000002'; select last_error_code from public.event_provider_connections where id = 'aaaaaaaa-0000-0000-0000-000000000002';" "reset role;")
if printf '%s' "$nobypass_write" | grep -q '^probe$'; then
  pass "RLS: with BYPASSRLS removed, the service-role policy alone carries the disconnect/cron UPDATE too"
else
  fail "RLS: the service_role policy does not carry the write without BYPASSRLS: $nobypass_write"
fi
# Restore, and re-prove the own-row policies still hold with it restored.
if qddl "alter role service_role bypassrls;" \
   && [ "$(q "select rolbypassrls from pg_roles where rolname='service_role'")" = "t" ]; then
  pass "service_role BYPASSRLS restored and confirmed from the catalog"
else
  fail "could not restore service_role BYPASSRLS"
fi

# ---------------------------------------------------------------------------
stage "7  re-apply preserves data, and the contract still holds"
# ---------------------------------------------------------------------------
before_rows=$(q "select count(*) from public.event_provider_connections")
before_b=$(q "select external_identity from public.event_provider_connections where id = 'aaaaaaaa-0000-0000-0000-000000000002'")
out=$(qmig 2>&1); rc=$?
after_rows=$(q "select count(*) from public.event_provider_connections")
if [ "$rc" -eq 0 ] && [ "$before_rows" = "$after_rows" ] && [ "$before_b" = "bit-venue-1" ]; then
  pass "4th apply exit 0 with $after_rows rows preserved — the \`if not exists\` guard is idempotency, not data loss"
else
  fail "4th apply: rc=$rc rows $before_rows -> $after_rows"
fi
if q "select 1 from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.event_provider_connections'::regclass and c.relname='idx_event_provider_connections_due'" | grep -q 1; then
  pass "the due index is still exactly one after four applies"
else
  fail "the due index did not survive four applies"
fi

# ---------------------------------------------------------------------------
stage "8  the post-condition can FAIL — and two of these are REPAIRS, not refusals"
# ---------------------------------------------------------------------------
# The distinction is not cosmetic and getting it wrong is how a control passes for
# the wrong reason. This migration RE-ISSUES `alter table ... force row level
# security`, `revoke all ... from anon` and the grants, so a target where those
# were changed out of band is REPAIRED by the apply and the post-condition never
# sees the defect. For those the meaningful control is "the defect is gone after
# the apply", which is a stronger claim than a refusal. The other nine are
# statements the migration does not re-issue, so the post-condition is the only
# thing standing between them and a silent success.
#
# Every control restores what it broke and then asserts the restore, because the
# first revision of this stage had a control with no restore step and the five
# controls after it were measured against a contaminated fixture.
refusals=0; refusals_fired=0; repairs=0; repairs_ok=0
refusal() {
  local name="$1" inject="$2" expect="$3" restore="$4"
  local ierr
  ierr=$(q "$inject" 2>&1)
  if printf '%s' "$ierr" | grep -qi 'error'; then
    fail "refusal [$name]: the INJECTION itself failed, so the control measured nothing: $(printf '%s' "$ierr" | grep -i error | head -1 | cut -c1-150)"
    q "$restore" >/dev/null 2>&1
    return
  fi
  refusals=$((refusals + 1))
  local o r
  o=$(qmig 2>&1); r=$?
  if [ "$r" -eq 0 ]; then
    fail "control [$name]: the migration still applied cleanly, so the post-condition CANNOT detect this defect"
  elif printf '%s' "$o" | grep -q "$expect"; then
    refusals_fired=$((refusals_fired + 1))
    pass "refusal [$name] fired: $(printf '%s' "$o" | grep -o 'DB-020:.*' | head -1 | cut -c1-120)"
  else
    fail "refusal [$name]: exited $r but did not report '$expect'; got: $(printf '%s' "$o" | grep -i 'error' | head -1 | cut -c1-160)"
  fi
  if ! q "$restore" >/dev/null 2>&1; then
    fail "control [$name]: the RESTORE failed, so every later control is measured against a contaminated fixture"
  fi
}
repair() {
  local name="$1" inject="$2" probe="$3" want="$4"
  local ierr
  ierr=$(q "$inject" 2>&1)
  if printf '%s' "$ierr" | grep -qi 'error'; then
    fail "repair [$name]: the INJECTION itself failed, so the control measured nothing: $(printf '%s' "$ierr" | grep -i error | head -1 | cut -c1-150)"
    return
  fi
  local before
  before=$(q "$probe")
  if [ "$before" = "$want" ]; then
    fail "repair [$name]: PRECONDITION wrong — the catalog already reads '$want', so this repair proves nothing"
    return
  fi
  repairs=$((repairs + 1))
  local o r
  o=$(qmig 2>&1); r=$?
  local after
  after=$(q "$probe")
  if [ "$r" -eq 0 ] && [ "$after" = "$want" ]; then
    repairs_ok=$((repairs_ok + 1))
    pass "repair [$name]: drifted to '$before', and the apply restored it to '$after'"
  else
    fail "repair [$name]: rc=$r, catalog reads '$after', expected '$after' to be restored from '$before'"
  fi
}

# 1. The CP-104 shape: a permissive SELECT policy alongside the own-row one.
refusal "extra permissive USING (true) SELECT policy" \
  "create policy event_provider_connections_public_read on public.event_provider_connections for select using (true);" \
  "UNEXPECTED state this file does not claim: policy:{event_provider_connections_public_read}" \
  "drop policy if exists event_provider_connections_public_read on public.event_provider_connections;"

# 2. A DELETE policy. No consumer deletes a connection; disconnect preserves the
#    row and its history.
refusal "a DELETE policy exists" \
  "create policy event_provider_connections_owner_delete on public.event_provider_connections for delete using (auth.uid() = created_by);" \
  "UNEXPECTED state this file does not claim: policy:{event_provider_connections_owner_delete}" \
  "drop policy if exists event_provider_connections_owner_delete on public.event_provider_connections;"

# 3. A write privilege handed to authenticated — the archive's own grant, and the
#    one this file deliberately did not carry.
refusal "authenticated granted INSERT" \
  "grant insert on public.event_provider_connections to authenticated;" \
  "MISSING contract entries: grant:{authenticated}:any=false" \
  "revoke insert on public.event_provider_connections from authenticated;"

# 4. DELETE granted to service_role.
refusal "service_role granted DELETE" \
  "grant delete on public.event_provider_connections to service_role;" \
  "MISSING contract entries: grant:{service_role}:delete=false" \
  "revoke delete on public.event_provider_connections from service_role;"

# 5. The due index de-predicated. This is the control for the real cost of the
#    `create index if not exists` guard: a same-named FULL index is kept by the
#    guard, so only the post-condition can tell the two apart.
refusal "the due index is full, not partial" \
  "drop index if exists public.idx_event_provider_connections_due;
   create index idx_event_provider_connections_due on public.event_provider_connections (provider, next_sync_at);" \
  "MISSING contract entries: index:{idx_event_provider_connections_due}" \
  "drop index if exists public.idx_event_provider_connections_due;
   create index idx_event_provider_connections_due on public.event_provider_connections (provider, next_sync_at) where status = 'active';"

# 6. A column re-typed. The post-condition asserts the whole contract by name and
#    type rather than by count, precisely so this is caught.
refusal "secret_reference retyped to bytea" \
  "alter table public.event_provider_connections alter column secret_reference type bytea using secret_reference::bytea;" \
  "MISSING contract entries: secret_reference|text|nullable" \
  "alter table public.event_provider_connections alter column secret_reference type text using secret_reference::text;"

# 7. A NOT NULL dropped from owner_id.
refusal "owner_id made nullable" \
  "alter table public.event_provider_connections alter column owner_id drop not null;" \
  "MISSING contract entries: owner_id|uuid|not null" \
  "alter table public.event_provider_connections alter column owner_id set not null;"

# 8. The status CHECK weakened so 'disconnected' is no longer storable — the
#    value bandsintown/disconnect writes, so this is a reachable-route breakage
#    and not a cosmetic one.
refusal "status CHECK no longer allows disconnected" \
  "alter table public.event_provider_connections drop constraint event_provider_connections_status_check;
   alter table public.event_provider_connections add constraint event_provider_connections_status_check check (status in ('pending','active','error')) not valid;" \
  "MISSING contract entries: constraint:check:{status}:literals={active,disconnected,error,pending}" \
  "alter table public.event_provider_connections drop constraint event_provider_connections_status_check;
   alter table public.event_provider_connections add constraint event_provider_connections_status_check check (status in ('pending','active','error','disconnected'));"

# 9. The UNIQUE the connect route's onConflict depends on, dropped.
refusal "the connect onConflict UNIQUE dropped" \
  "alter table public.event_provider_connections drop constraint event_provider_connections_owner_type_owner_id_provider_ext_key;" \
  "MISSING contract entries: constraint:u:{external_identity,owner_id,owner_type,provider}" \
  "alter table public.event_provider_connections add constraint event_provider_connections_owner_type_owner_id_provider_ext_key unique (owner_type, owner_id, provider, external_identity);"

# 10. The relation in the wrong schema — the `private` precedent from
#     20260821025543, where `search_path = private, public` put a relation where
#     no public reader could see it. RECLASSIFIED from a refusal to a repair, and
#     the reclassification is the finding: the first revision asserted the
#     migration would REFUSE, and it does not. `create table if not exists
#     public.event_provider_connections` finds nothing in `public`, creates a
#     correct and EMPTY one, and the post-condition is satisfied. The stranded
#     rows stay stranded. So the guard repairs the public surface and silently
#     orphans the data — which is why "the relation exists" is a Layer 0 stop
#     condition in the manifest and not something this file can detect.
repair "the relation is stranded in \`private\`, not \`public\`" \
  "alter table public.event_provider_connections set schema private;" \
  "select to_regclass('public.event_provider_connections') is not null" \
  "t"
if [ "$(q "select count(*) from private.event_provider_connections")" = "2" ] \
   && [ "$(q "select count(*) from public.event_provider_connections")" = "0" ]; then
  pass "the stranded rows really are orphaned: 2 rows left in private, 0 in the freshly created public relation"
else
  fail "stranded-row assertion wrong: private=$(q "select count(*) from private.event_provider_connections") public=$(q "select count(*) from public.event_provider_connections")"
fi
if q "drop table if exists public.event_provider_connections;
      alter table private.event_provider_connections set schema public;" >/dev/null 2>&1; then
  pass "stranded relation restored to public"
else
  fail "could not restore the stranded relation; every later stage is measuring a contaminated fixture"
fi

# 11 & 12. Repairs, not refusals: the migration re-issues both statements, so
#     out-of-band drift is corrected by the apply and the post-condition is
#     never reached with the defect present.
repair "RLS enabled, NOT forced" \
  "alter table public.event_provider_connections no force row level security;" \
  "select relforcerowsecurity from pg_class where oid = 'public.event_provider_connections'::regclass" \
  "t"
repair "anon granted SELECT out of band" \
  "grant select on public.event_provider_connections to anon;" \
  "select has_table_privilege('anon','public.event_provider_connections','select')" \
  "f"

if [ "$refusals_fired" -eq "$refusals" ] && [ "$repairs_ok" -eq "$repairs" ]; then
  pass "all $refusals refusal controls fired and all $repairs repair controls restored; every control restored its own fixture"
else
  fail "$refusals_fired of $refusals refusals fired and $repairs_ok of $repairs repairs worked; the summary must never be greener than its parts"
fi
# ---------------------------------------------------------------------------
stage "9  the post-state is re-asserted after all twelve controls"
# ---------------------------------------------------------------------------
out=$(qmig 2>&1); rc=$?
final=$(q "select (select count(*) from pg_attribute where attrelid='public.event_provider_connections'::regclass and attnum>0 and not attisdropped) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='event_provider_connections') || '/' || (select relforcerowsecurity from pg_class where oid='public.event_provider_connections'::regclass) || '/' || (select count(*) from public.event_provider_connections)")
if [ "$rc" -eq 0 ] && [ "$final" = "17/4/true/2" ]; then
  pass "final state 17 columns / 4 policies / forced=t / 2 rows restored, and the migration is green again"
else
  fail "final state wrong: rc=$rc state=$final"
  printf '%s\n' "$out" | head -5
fi

# ---------------------------------------------------------------------------
stage "10  the CHECK constraints really are the archived ones, behaviourally"
# ---------------------------------------------------------------------------
for case in "owner_type:'dj'" "connection_mode:'platform_owned'"; do
  col="${case%%:*}"; val="${case##*:}"
  out=$(q "insert into public.event_provider_connections (owner_type,owner_id,provider,external_identity,created_by) values ('artist', gen_random_uuid(),'bandsintown','probe-$col','11111111-1111-1111-1111-111111111111');" 2>&1)
  case "$col" in
    owner_type)
      out=$(q "update public.event_provider_connections set owner_type = $val;" 2>&1)
      label="owner_type = $val";;
    connection_mode)
      out=$(q "update public.event_provider_connections set connection_mode = $val;" 2>&1)
      label="connection_mode = $val";;
  esac
  if printf '%s' "$out" | grep -q 'violates check constraint'; then
    pass "CHECK: $label is rejected by the archived constraint"
  else
    fail "CHECK: $label was accepted: $out"
  fi
done
# The two probe rows the CHECK loop inserts are VALID rows, so each UPDATE above
# is really testing the CHECK and not an insert failure. They must be removed or
# the final row count is not the count this stage claims to be measuring.
q "delete from public.event_provider_connections where external_identity in ('probe-owner_type','probe-connection_mode');" >/dev/null

# A genuine UNIQUE collision, using the exact onConflict key the connect route
# upserts on. The first revision of this case used a key that collided with
# nothing and therefore "passed" for the wrong reason.
out=$(q "insert into public.event_provider_connections (owner_type,owner_id,provider,external_identity,created_by) values ('artist','bbbbbbbb-0000-0000-0000-000000000001','bandsintown','bit-artist-1','11111111-1111-1111-1111-111111111111');" 2>&1)
if printf '%s' "$out" | grep -q 'duplicate key value violates unique constraint'; then
  pass "UNIQUE: a second connect on (owner_type,owner_id,provider,external_identity) is rejected, so the route's onConflict is real"
else
  fail "UNIQUE: the onConflict key did not reject a duplicate: $out"
fi
# The key is the full four columns, so the same external_identity under a
# different owner is a DIFFERENT connection and must be storable. Asserting the
# opposite would be asserting a contract the archived DDL does not have: the
# first revision of this case asserted that and "passed" for the wrong reason.
out=$(q "insert into public.event_provider_connections (owner_type,owner_id,provider,external_identity,created_by) values ('venue','bbbbbbbb-0000-0000-0000-000000000001','bandsintown','bit-artist-1','11111111-1111-1111-1111-111111111111');" 2>&1)
if printf '%s' "$out" | grep -q 'ERROR'; then
  fail "UNIQUE: a different owner with the same external_identity was rejected, so the key is wider than the archived four columns: $out"
else
  pass "UNIQUE: a different owner with the same external_identity IS a different connection, as the archived four-column key implies"
fi
q "delete from public.event_provider_connections where owner_type = 'venue' and external_identity = 'bit-artist-1';" >/dev/null
out=$(q "update public.event_provider_connections set status = 'disconnected' where id = 'aaaaaaaa-0000-0000-0000-000000000002'; select status from public.event_provider_connections where id='aaaaaaaa-0000-0000-0000-000000000002';" 2>&1)
if printf '%s' "$out" | grep -q 'disconnected'; then
  pass "CHECK: status = 'disconnected' — the value bandsintown/disconnect writes — is storable"
else
  fail "CHECK: the archived status value 'disconnected' is not storable: $out"
fi
if [ "$(q "select count(*) from public.event_provider_connections")" = "2" ]; then
  pass "the four CHECK/UNIQUE rejections left the table at 2 rows — no partial write"
else
  fail "row count changed: $(q 'select count(*) from public.event_provider_connections')"
fi

# ---------------------------------------------------------------------------
printf '\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED, 0 FAIL\n'
  exit 0
fi
printf '%s FAIL\n' "$fails"
exit 1
