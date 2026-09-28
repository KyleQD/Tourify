#!/usr/bin/env bash
# ============================================================================
# db021_event_sync_jobs.harness.sh
#
# DB-021 — behavioural proof for 20260927140100_event_sync_jobs.sql
# (the co-dependency DB-020 routed in its own `assumptions[8]`).
#
# WHAT IT PROVES
#   1. the BEFORE state: all three consumers' exact query shapes fail with
#      SQLSTATE 42P01 against the absent relation
#   2. the migration applies FOUR TIMES consecutively, exit 0 each time, and the
#      FOURTH is against a POPULATED table whose rows are preserved
#   3. the AFTER state: the same statements succeed as `service_role`
#   4. the grant matrix as real identities: anon and authenticated hold nothing
#      at all (permission errors, not empty lists), service_role holds
#      select/insert/update and NOT delete
#   5. the service-role policy is a real rescue and not decoration: with
#      BYPASSRLS removed from service_role the worker still reads and writes
#   6. THE FINDING: the connect route's `onConflict: "dedupe_key"` upsert fails
#      with SQLSTATE 42P10 against the archived PARTIAL unique index, while the
#      same statement with the index predicate as an arbiter WHERE succeeds —
#      so the transcribed index is correct and the ROUTE's statement is the
#      defect, and a full unique index (the tempting schema-side "fix") would
#      break re-enqueue. Measured, not asserted.
#   7. the post-condition is ABLE TO FAIL, twelve ways as refusals and four as
#      repairs, each fired, each reported by name, and each with its fixture
#      restored AND ASSERTED
#   8. the final state is re-asserted after all controls, so a control that left
#      the fixture wrong cannot hide behind a green summary
#   9. BOTH failure directions are reported in ONE message. The migration's first
#      draft raised on the ABSENT pass first, so a REPLACEMENT defect (a
#      re-typed column, an added foreign key) could only ever be reported as
#      "MISSING" and the "what is actually there now" half was unreachable. The
#      controls that found this are kept and now assert the UNEXPECTED half.
#
# WHAT IT IS NOT
#   A local emulation: PostgreSQL 16.15, a throwaway cluster in a temp dir
#   created and destroyed by this lane, and a minimal auth/roles/`private`
#   bootstrap. NOT Supabase, NOT a hosted project, NOT a chain replay, no
#   `supabase db reset`, no `db push --include-all` (CP-051). The migration
#   itself was NOT applied to any environment by this harness; the operator's
#   reviewed manual apply is the gate.
#
# WHY IT LIVES HERE AND NOT IN supabase/tests/
#   `supabase/tests/**` is outside DB-021's working set, which names exactly
#   `supabase/migrations/20260927140100_event_sync_jobs.sql` and
#   `docs/engineering/migration-validation/**`. Moving this into
#   `supabase/tests/` and wiring it into `npm run check:db008-harness` needs a
#   working-set amendment plus `package.json` and `.github/workflows/ci.yml`,
#   which are other lanes'. CONSEQUENCE, NOT HIDDEN: `npm run check:db008-harness`
#   does NOT run this file, so nothing in CI executes this proof. It is
#   reproducible by hand with
#     bash docs/engineering/migration-validation/db021_event_sync_jobs.harness.sh
#   and by nobody's behalf until the wiring is granted.
#
# POSTURE, taken from five prior records in this repository
#   * every stage asserts its OWN post-state, because a harness whose fixture
#     silently failed to build has shipped a false green four times here;
#   * every negative control is paired with a precondition assertion that the
#     defect really was injected, because a control that exercised nothing is
#     worse than no control;
#   * every negative control is paired with a RESTORE whose exit code is checked
#     AND whose effect is re-read from the catalog, because a control with no
#     restore contaminated the five controls after it in DB-020's first
#     revision;
#   * the summary line is computed from the counters and cross-checked against
#     them, because DB-020's first revision reported 12/12 controls fired when
#     all 12 had failed;
#   * the negative controls are BREAKAGES or SURFACE, never removals of surface:
#     removing surface can never fail a check that asks "is it absent".
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db021-esj.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB021_ESJ_PORT:-54343}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -f "$1" 2>&1; }
# The operator applies this migration as ONE transaction. The harness does the
# same, because without it a failing post-condition leaves the grants installed
# and every later assertion measures a half-applied fixture.
qmig() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -1 -f "$MIG" 2>&1; }
# A DDL statement whose exit code is asserted, so an `alter role` that silently
# failed cannot leave a "precondition" reading the value it was supposed to have
# changed. DB-020's first revision did exactly that and its rescue probe was
# vacuous.
qddl() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" >/dev/null 2>&1; }
# One session for setup, query and teardown: a separate invocation silently
# discards `set role`, which would measure an anonymous session instead of the
# identity under test.
qs() {
  local setup="$1" query="$2" teardown="$3"
  psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "$setup" -c "$query" -c "$teardown" 2>&1
}
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

MIG="$ROOT/supabase/migrations/20260927140100_event_sync_jobs.sql"
CONNECT_ROUTE="$ROOT/app/api/integrations/bandsintown/connect/route.ts"
CRON_ROUTE="$ROOT/app/api/cron/events/sync/route.ts"
ADMIN_ROUTE="$ROOT/app/api/admin/event-sync/route.ts"
WORKER_ID="cron-local-1756320000000"
CONN="aaaaaaaa-0000-0000-0000-000000000001"
JOB1="bbbbbbbb-0000-0000-0000-000000000001"
JOB2="bbbbbbbb-0000-0000-0000-000000000002"

printf 'db021 event_sync_jobs harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 \
  || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 \
  || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"

# ---------------------------------------------------------------------------
stage "1  Supabase-shaped bootstrap, and its own post-state asserted"
# ---------------------------------------------------------------------------
# `auth.users` and `auth.uid()` are the only things the sibling migration resolved
# against outside `public`; THIS migration has no foreign key and no policy that
# names auth.uid(), so auth.users is not strictly required — it is created
# anyway, because one negative control adds a foreign key to it, and a control
# whose fixture target is missing measures nothing. Mirrors
# supabase/tests/db011_emulation_bootstrap.sql, plus `service_role` with BYPASSRLS
# as Supabase has it.
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
   && [ "$(q "select to_regnamespace('private') is not null")" = "t" ]; then
  pass "bootstrap asserted: 3 roles, service_role BYPASSRLS=t, auth.users and the private schema present"
else
  fail "bootstrap incomplete: roles=$roles bypass=$bypass"
  cat "$TMP/boot.log"
  exit 1
fi
# And the migration file itself must be present and non-empty, or every later
# "apply exited 0" is a claim about nothing.
if [ -s "$MIG" ]; then
  pass "migration file present and non-empty: ${MIG#$ROOT/}"
else
  fail "migration file missing or empty: $MIG"
  exit 1
fi

# ---------------------------------------------------------------------------
stage "2  the three consumers' shapes are transcribed from the LIVE files"
# ---------------------------------------------------------------------------
# A transcription in a harness drifts. These assertions FAIL THE RUN if the
# route files stop containing the exact literals the SQL below was written
# from, so the proof cannot silently drift away from the code it is about.
transcribe() { # label, file, literal...
  local label="$1" file="$2"; shift 2
  local lit
  for lit in "$@"; do
    if grep -Fq "$lit" "$file"; then
      pass "$label still contains: $lit"
    else
      fail "$label no longer contains: $lit — this harness's transcription is stale"
    fi
  done
}
transcribe "connect route" "$CONNECT_ROUTE" \
  'onConflict: "dedupe_key"' \
  'job_type: "verify_connection"' \
  'dedupe_key: `bandsintown:verify:${connection.id}`' \
  'priority: 50' \
  'payload: { connectionId: connection.id }'
transcribe "cron/events/sync route" "$CRON_ROUTE" \
  '.from("event_sync_jobs")' \
  '.lt("locked_at"' \
  '.lte("run_after"' \
  '.order("priority")' \
  '.order("id")' \
  'attempt_count, max_attempts' \
  'last_error_summary: errorSummary' \
  'LOCK_STALE_AFTER_MS = 5 * 60 * 1000' \
  'locked_by: WORKER_ID'
transcribe "admin/event-sync route" "$ADMIN_ROUTE" \
  'select("id, provider, job_type, status, attempt_count, run_after, last_error_code")' \
  '.in("status", ["queued", "running", "dead"])'

# The exact SQL PostgREST generates for each builder. The worker's `client` is a
# service-role client, so EVERY statement below runs as `service_role`.
WORKER_STALE_LOCK_SQL="update public.event_sync_jobs set status = 'queued', locked_at = null, locked_by = null where status = 'running' and locked_at < now() - interval '5 minutes'"
WORKER_CLAIM_SELECT_SQL="select id from public.event_sync_jobs where status = 'queued' and run_after <= now() order by priority, id limit 1"
WORKER_CAS_SQL="update public.event_sync_jobs set status = 'running', locked_at = now(), locked_by = '$WORKER_ID' where id = '$JOB1' and status = 'queued' returning id, provider, job_type, payload, attempt_count, max_attempts"
WORKER_FAIL_SQL="update public.event_sync_jobs set status = 'queued', run_after = now() + interval '1 minute', attempt_count = 1, locked_at = null, locked_by = null, last_error_code = 'UPSTREAM_ERROR', last_error_summary = 'UPSTREAM_ERROR: probe', updated_at = now() where id = '$JOB1'"
WORKER_OK_SQL="update public.event_sync_jobs set status = 'succeeded', locked_at = null, locked_by = null, updated_at = now() where id = '$JOB1'"
ADMIN_SELECT_SQL="select id, provider, job_type, status, attempt_count, run_after, last_error_code from public.event_sync_jobs where status in ('queued', 'running', 'dead') order by run_after limit 100"
# The connect route's upsert, exactly as the Data API renders it: `onConflict`
# becomes a bare `ON CONFLICT (dedupe_key)` with NO arbiter WHERE. `PROBE_KEY` is
# a marker this stage OWNS — no seeded row carries it, so every probe row is
# identifiable and removable without reasoning about what the earlier stages left
# behind. The first revision of this stage reused the seeded rows' own
# dedupe_key and then counted rows against a stale expectation, which is how a
# probe silently contaminates the four stages after it.
PROBE_KEY="probe:bandsintown:verify:00000000-0000-0000-0000-00000000dead"
CONNECT_UPSERT_SQL="insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status, priority, updated_at) values ('bandsintown', 'verify_connection', '$PROBE_KEY', '{\"connectionId\": \"$CONN\"}'::jsonb, 'queued', 50, now()) on conflict (dedupe_key) do update set updated_at = excluded.updated_at returning id, status"
# And the same statement with the index predicate supplied as an arbiter WHERE,
# which is the shape PostgreSQL will infer a partial unique index from.
CONNECT_UPSERT_ARBITER_SQL="insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status, priority, updated_at) values ('bandsintown', 'verify_connection', '$PROBE_KEY', '{\"connectionId\": \"$CONN\"}'::jsonb, 'queued', 50, now()) on conflict (dedupe_key) where status in ('queued', 'running') and dedupe_key is not null do update set updated_at = excluded.updated_at returning id, status"

# ---------------------------------------------------------------------------
stage "3  BEFORE: the relation is absent, so all three consumers fail"
# ---------------------------------------------------------------------------
if [ "$(q "select to_regclass('public.event_sync_jobs') is null")" = "t" ]; then
  pass "BEFORE state asserted: public.event_sync_jobs does not exist"
else
  fail "BEFORE state is wrong: the relation already exists, so this proves nothing"
  exit 1
fi
before_fail=0
for pair in \
  "connect upsert|$CONNECT_UPSERT_SQL" \
  "worker stale-lock recovery|$WORKER_STALE_LOCK_SQL" \
  "worker claim select|$WORKER_CLAIM_SELECT_SQL" \
  "worker compare-and-set|$WORKER_CAS_SQL" \
  "admin event-sync select|$ADMIN_SELECT_SQL"; do
  label="${pair%%|*}"; sql="${pair#*|}"
  out=$(qs "set role service_role;" "$sql" "reset role;")
  if printf '%s' "$out" | grep -q 'does not exist'; then
    before_fail=$((before_fail + 1))
  else
    fail "BEFORE: $label did not fail with 42P01: $out"
  fi
done
if [ "$before_fail" = "5" ]; then
  pass "BEFORE: all 5 route-shaped statements fail with 42P01 as service_role — PostgREST surfaces this as a 500"
else
  fail "BEFORE: only $before_fail of 5 route-shaped statements failed; the count must never be greener than the parts"
fi
# The route that reads the SECOND absent relation from the same archived file is
# measured here too, so "this file alone does not make the route work" is a
# measurement rather than an assertion in prose.
out=$(qs "set role service_role;" "select id, provider, started_at from public.event_sync_runs order by started_at desc limit 50;" "reset role;")
if printf '%s' "$out" | grep -q 'does not exist'; then
  pass "HONEST SCOPE: admin/event-sync's other table, event_sync_runs (archived :129-147, out of this working set), is STILL absent after this file"
else
  fail "SCOPE: event_sync_runs unexpectedly exists here, so the recorded residual is wrong: $out"
fi

# ---------------------------------------------------------------------------
stage "4  apply FOUR times consecutively (the 4th against a populated table)"
# ---------------------------------------------------------------------------
applied=0
for i in 1 2 3; do
  out=$(qmig); rc=$?
  if [ "$rc" -ne 0 ]; then
    fail "apply #$i exited $rc"
    printf '%s\n' "$out" | head -6
    break
  fi
  state=$(q "select (select count(*) from pg_attribute where attrelid='public.event_sync_jobs'::regclass and attnum>0 and not attisdropped) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='event_sync_jobs') || '/' || (select count(*) from pg_index i where i.indrelid='public.event_sync_jobs'::regclass and not exists (select 1 from pg_constraint k where k.conindid=i.indexrelid))")
  if [ "$state" != "16/1/3" ]; then
    fail "apply #$i left the wrong state: $state (expected 16 columns / 1 policy / 3 non-constraint indexes)"
    break
  fi
  applied=$((applied + 1))
  pass "apply #$i exit 0, state asserted at 16 columns / 1 policy / 3 indexes"
done
if [ "$applied" -ne 3 ]; then
  fail "only $applied of the first 3 applies succeeded; later stages would measure a half-applied fixture"
  exit 1
fi

# ---------------------------------------------------------------------------
stage "5  seed, then the AFTER state for all three consumers, as service_role"
# ---------------------------------------------------------------------------
q "insert into public.event_sync_jobs (id, provider, job_type, dedupe_key, payload, status, priority, attempt_count, max_attempts, run_after, created_at, updated_at) values
     ('$JOB1','bandsintown','verify_connection','bandsintown:verify:$CONN','{\"connectionId\": \"$CONN\"}'::jsonb,'queued',50,0,5,now(),now(),now()),
     ('$JOB2','ticketmaster','market_sync',null,'{\"city\": \"Las Vegas\"}'::jsonb,'running',100,1,5,now() - interval '1 hour',now() - interval '10 minutes',now() - interval '10 minutes');
   update public.event_sync_jobs set locked_at = now() - interval '30 minutes', locked_by = '$WORKER_ID' where id = '$JOB2';
   " >"$TMP/seed.log" 2>&1
if [ "$(q "select count(*) from public.event_sync_jobs")" = "2" ] \
   && [ "$(q "select status from public.event_sync_jobs where id = '$JOB2'")" = "running" ]; then
  pass "seed asserted: 2 jobs — one queued with a dedupe_key, one RUNNING with a 30-minute-old lock (the stale-lock case)"
else
  fail "seed failed"
  cat "$TMP/seed.log"
  exit 1
fi

after_ok=0
out=$(qs "set role service_role;" "$WORKER_STALE_LOCK_SQL" "reset role;")
if [ "$(q "select status from public.event_sync_jobs where id = '$JOB2'")" = "queued" ] \
   && [ "$(q "select coalesce(locked_at::text,'NULL') from public.event_sync_jobs where id = '$JOB2'")" = "NULL" ] \
   && [ "$(q "select coalesce(locked_by,'NULL') from public.event_sync_jobs where id = '$JOB2'")" = "NULL" ]; then
  after_ok=$((after_ok + 1))
  pass "AFTER: cron/events/sync's stale-lock recovery UPDATE lands (running -> queued, lock cleared)"
else
  fail "AFTER: the stale-lock recovery did not land: $out"
fi
out=$(qs "set role service_role;" "$WORKER_CLAIM_SELECT_SQL" "reset role;")
if printf '%s' "$out" | grep -q "$JOB1"; then
  after_ok=$((after_ok + 1))
  pass "AFTER: the claim SELECT returns a candidate row instead of 42P01 — $(printf '%s' "$out" | tr '|' ' ' | head -1)"
else
  fail "AFTER: the claim select returned nothing: $out"
fi
out=$(qs "set role service_role;" "$WORKER_CAS_SQL" "reset role;")
if printf '%s' "$out" | grep -q "$JOB1" \
   && [ "$(q "select locked_by from public.event_sync_jobs where id = '$JOB1'")" = "$WORKER_ID" ]; then
  after_ok=$((after_ok + 1))
  pass "AFTER: the compare-and-set claim lands and returns all 6 projected columns"
else
  fail "AFTER: the compare-and-set claim did not land: $out"
fi
out=$(qs "set role service_role;" "$WORKER_FAIL_SQL" "reset role;")
if [ "$(q "select status from public.event_sync_jobs where id = '$JOB1'")" = "queued" ] \
   && [ "$(q "select attempt_count from public.event_sync_jobs where id = '$JOB1'")" = "1" ] \
   && [ "$(q "select last_error_code from public.event_sync_jobs where id = '$JOB1'")" = "UPSTREAM_ERROR" ]; then
  after_ok=$((after_ok + 1))
  pass "AFTER: the failure UPDATE lands (status, attempt_count, last_error_code, backoff run_after)"
else
  fail "AFTER: the failure update did not land: $out"
fi
out=$(qs "set role service_role;" "$ADMIN_SELECT_SQL" "reset role;")
if printf '%s' "$out" | grep -q "$JOB1"; then
  after_ok=$((after_ok + 1))
  pass "AFTER: admin/event-sync's job SELECT returns rows instead of 42P01 ($(printf '%s' "$out" | wc -l | tr -d ' ') of the 2 seeded jobs match the queued/running/dead filter)"
else
  fail "AFTER: the admin select returned nothing: $out"
fi
if [ "$after_ok" = "5" ]; then
  pass "AFTER: 5 of 5 route-shaped statements succeed as service_role"
else
  fail "AFTER: only $after_ok of 5 route-shaped statements succeeded; the count must never be greener than the parts"
fi

# The terminal update, applied last so it does not disturb the count above.
qs "set role service_role;" "$WORKER_OK_SQL" "reset role;" >/dev/null
if [ "$(q "select status from public.event_sync_jobs where id = '$JOB1'")" = "succeeded" ]; then
  pass "AFTER: the terminal 'succeeded' UPDATE lands and clears the lock"
else
  fail "AFTER: the terminal update did not land"
fi

# ---------------------------------------------------------------------------
stage "6  THE 42P10 FINDING: the archived index is right, the ROUTE is wrong"
# ---------------------------------------------------------------------------
# This is measured, not asserted from documentation. It is the reason the
# migration does NOT add a full unique index on `dedupe_key`, which is the only
# schema change that would make the route's bare `onConflict` resolve.
out=$(qs "set role service_role;" "$CONNECT_UPSERT_SQL" "reset role;")
if printf '%s' "$out" | grep -q 'there is no unique or exclusion constraint matching the ON CONFLICT specification'; then
  pass "FINDING: the connect route's exact upsert fails with 42P10 — idx_event_sync_jobs_dedupe_active is PARTIAL and a partial unique index is not an ON CONFLICT arbiter"
else
  fail "FINDING: expected 42P10 from the connect upsert, got: $out"
fi
if [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key = '$PROBE_KEY'")" = "0" ]; then
  pass "FINDING: the 42P10 upsert wrote nothing — a failed statement, not a partial one"
else
  fail "FINDING: the failed 42P10 upsert left a row behind"
fi
# The POSTCONDITION of that finding: the very same statement succeeds once the
# index predicate is supplied as the arbiter WHERE. If it did NOT, the index would
# be wrong too and the finding would be misattributed to the route.
out=$(qs "set role service_role;" "$CONNECT_UPSERT_ARBITER_SQL" "reset role;")
if printf '%s' "$out" | grep -q '|' \
   && ! printf '%s' "$out" | grep -qi 'error' \
   && [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key = '$PROBE_KEY'")" = "1" ]; then
  pass "FINDING: the SAME statement with the index predicate as the arbiter WHERE resolves and returns a row — so the index is correct and only the route's statement form is wrong"
else
  fail "FINDING: the arbiter-WHERE form did not resolve, so the index may be at fault too: $out"
fi
# A repeat of the arbiter form must UPDATE, not insert, when the key is active.
out=$(qs "set role service_role;" "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status, priority) values ('bandsintown','verify_connection','$PROBE_KEY','{}'::jsonb,'queued',50) on conflict (dedupe_key) where status in ('queued','running') and dedupe_key is not null do update set updated_at = now() returning id;" "reset role;")
if ! printf '%s' "$out" | grep -qi 'error' \
   && [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key = '$PROBE_KEY'")" = "1" ]; then
  pass "FINDING: a repeat on an ACTIVE key updates in place (still exactly 1 row), which is the archived 'one active job per dedupe key' intent"
else
  fail "FINDING: the repeat on an active key did not update in place: $out"
fi
# And the reason a FULL unique index is the wrong fix: after the job leaves
# `queued`/`running` the key must become reusable, or a connection could never be
# re-verified and a `dead` job could never be re-enqueued.
q "update public.event_sync_jobs set status = 'succeeded' where dedupe_key = '$PROBE_KEY';" >/dev/null
out=$(q "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status, priority) values ('bandsintown','verify_connection','$PROBE_KEY','{}'::jsonb,'queued',50);" 2>&1)
if ! printf '%s' "$out" | grep -qi 'error' \
   && [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key = '$PROBE_KEY'")" = "2" ]; then
  pass "FINDING: the same dedupe_key IS reusable once the job left queued/running (2 rows on that key) — so a full unique index on dedupe_key would destroy re-verification, and is therefore NOT added"
else
  fail "FINDING: the dedupe key was not reusable after the job finished: $out"
fi
# Remove every probe row, then assert BOTH that the probes are gone and that the
# seeded rows are untouched. A count alone cannot tell those apart.
q "delete from public.event_sync_jobs where dedupe_key = '$PROBE_KEY';" >/dev/null
if [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key like 'probe:%'")" = "0" ]; then
  pass "no probe row from the 42P10 stage survives"
else
  fail "the 42P10 stage left $(q "select count(*) from public.event_sync_jobs where dedupe_key like 'probe:%'") probe rows behind"
fi
if [ "$(q "select count(*) from public.event_sync_jobs")" = "2" ] \
   && [ "$(q "select count(*) from public.event_sync_jobs where id in ('$JOB1','$JOB2')")" = "2" ]; then
  pass "the seeded rows are intact: exactly $JOB1 and $JOB2, so the 42P10 stage did not contaminate the fixture"
else
  fail "the 42P10 stage changed the seeded rows: $(q "select id from public.event_sync_jobs order by id" | tr '\n' ' ')"
fi
# Two more properties of the archived partial index, asserted so a later
# migration cannot quietly break them. Both use their own marker keys.
out=$(q "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status) values ('ticketmaster','market_sync','probe:dup-active', '{}'::jsonb,'queued');" 2>&1)
out2=$(q "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status) values ('ticketmaster','market_sync','probe:dup-active', '{}'::jsonb,'queued');" 2>&1)
q "delete from public.event_sync_jobs where dedupe_key = 'probe:dup-active';" >/dev/null
if [ -z "$out" ] && printf '%s' "$out2" | grep -q 'duplicate key value violates unique constraint "idx_event_sync_jobs_dedupe_active"'; then
  pass "the archived dedupe index accepts the first ACTIVE job on a key and rejects the SECOND with 23505 on idx_event_sync_jobs_dedupe_active"
else
  fail "the archived dedupe index did not reject a duplicate active key: first=[$out] second=[$out2]"
fi
# The same key is accepted again once the first job is no longer active.
out=$(q "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status) values ('ticketmaster','market_sync','probe:reuse', '{}'::jsonb,'succeeded'); insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload, status) values ('ticketmaster','market_sync','probe:reuse', '{}'::jsonb,'queued'); select count(*) from public.event_sync_jobs where dedupe_key = 'probe:reuse';" 2>&1)
q "delete from public.event_sync_jobs where dedupe_key = 'probe:reuse';" >/dev/null
if [ "$(printf '%s' "$out" | tail -1)" = "2" ]; then
  pass "a SUCCEEDED row does not block a new ACTIVE job on the same key — the \`where status in ('queued','running')\` predicate is doing the work a full unique index cannot"
else
  fail "a finished job blocked re-enqueue on the same key: $out"
fi
# NULLS are uncollided, which is why the archive carries
# `and dedupe_key is not null` and why the ticketing lane's identical index on
# `ticket_analytics_events` does the same. Measured as a DELTA, because the
# seeded JOB2 already has a NULL dedupe_key and counting absolutely made the
# first revision of this case read 4 instead of 3.
pre_nulls=$(q "select count(*) from public.event_sync_jobs where dedupe_key is null")
q "insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload) values ('ticketmaster','market_sync',null,'{}'::jsonb),('ticketmaster','market_sync',null,'{}'::jsonb),('ticketmaster','market_sync',null,'{}'::jsonb);" >/dev/null
post_nulls=$(q "select count(*) from public.event_sync_jobs where dedupe_key is null")
q "delete from public.event_sync_jobs where dedupe_key is null and id <> '$JOB2';" >/dev/null
if [ "$post_nulls" = "$((pre_nulls + 3))" ] \
   && [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key is null")" = "$pre_nulls" ]; then
  pass "three dedupe_key IS NULL jobs are all storable ($pre_nulls -> $post_nulls) and the probe rows were removed, so NULLS are uncollided"
else
  fail "NULL dedupe_key rows collided ($pre_nulls -> $post_nulls, expected +3)"
fi
if [ "$(q "select count(*) from public.event_sync_jobs")" = "2" ]; then
  pass "the dedupe-index probes left the fixture at exactly 2 rows"
else
  fail "row count drifted to $(q 'select count(*) from public.event_sync_jobs')"
fi

# ---------------------------------------------------------------------------
stage "7  the grant matrix, as real identities"
# ---------------------------------------------------------------------------
# AC-3, MEASURED. There is no caller-client consumer of this table, so BOTH
# `anon` and `authenticated` must be permission errors on EVERY operation, not
# merely on the ones the three routes happen to use. A single granted SELECT
# would be a client-readable provider payload queue.
for role in anon authenticated; do
  for op in "select count(*) from public.event_sync_jobs" \
             "insert into public.event_sync_jobs (provider, job_type) values ('x','y')" \
             "update public.event_sync_jobs set status = 'queued'" \
             "delete from public.event_sync_jobs"; do
    out=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role $role;" "$op;" "reset role;")
    if printf '%s' "$out" | grep -q 'permission denied'; then
      pass "GRANT: $role is denied: ${op%% *}"
    else
      fail "GRANT: $role was NOT denied: ${op%% *} -> $out"
    fi
  done
done
svc_matrix=$(q "select (case when has_table_privilege('service_role','public.event_sync_jobs','select') then 't' else 'f' end) || '/' || (case when has_table_privilege('service_role','public.event_sync_jobs','insert') then 't' else 'f' end) || '/' || (case when has_table_privilege('service_role','public.event_sync_jobs','update') then 't' else 'f' end) || '/' || (case when has_table_privilege('service_role','public.event_sync_jobs','delete') then 't' else 'f' end)")
if [ "$svc_matrix" = "t/t/t/f" ]; then
  pass "GRANT: service_role holds select/insert/update and NOT delete — the exact union of what the three consumers do, with no consumer deleting a job"
else
  fail "GRANT: service_role matrix is $svc_matrix, expected t/t/t/f"
fi
# The ACL is the thing the post-condition actually compares, so it is measured
# here too rather than only inside the migration. One key per (grantee,
# privilege) pair, which is the shape the migration emits.
acl=$(q "select coalesce(string_agg(coalesce(r.rolname,'public')||':'||lower(a.privilege_type), ' ' order by coalesce(r.rolname,'public'), a.privilege_type), '<none>') from pg_class c cross join lateral aclexplode(c.relacl) a left join pg_roles r on r.oid = a.grantee where c.oid = 'public.event_sync_jobs'::regclass and a.grantee <> c.relowner")
if [ "$acl" = "service_role:insert service_role:select service_role:update" ]; then
  pass "GRANT: the rendered ACL is exactly {service_role: insert, select, update} — no PUBLIC entry, no anon, no authenticated, no DELETE"
else
  fail "GRANT: the rendered ACL is [$acl], expected [service_role:insert service_role:select service_role:update]"
fi

# The service_role policy measured as a rescue rather than as decoration. The
# read probe is given a row that is definitely in the filter: the first revision
# of this stage reused a row an earlier stage had already driven to 'succeeded',
# so the probe measured an empty result and reported the RLS arm as broken when
# the arm was fine and the FIXTURE was wrong.
q "update public.event_sync_jobs set status = 'queued' where id = '$JOB1';" >/dev/null
if [ "$(q "select count(*) from public.event_sync_jobs where status in ('queued','running','dead')")" = "2" ]; then
  pass "PRECONDITION asserted for the RLS probes: 2 rows are in the admin filter, so an empty result would be a policy defect and not a fixture defect"
else
  fail "precondition wrong: the RLS read probe has nothing to find"
fi
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
out=$(qs "set role service_role;" "$ADMIN_SELECT_SQL" "reset role;")
if printf '%s' "$out" | grep -q "$JOB1"; then
  pass "RLS: with BYPASSRLS removed, the service-role policy alone carries admin/event-sync's SELECT"
else
  fail "RLS: the service_role policy does not carry the read without BYPASSRLS: $out"
fi
out=$(qs "set role service_role;" "$WORKER_CAS_SQL" "reset role;")
if printf '%s' "$out" | grep -q "$JOB1" \
   && [ "$(q "select locked_by from public.event_sync_jobs where id = '$JOB1'")" = "$WORKER_ID" ]; then
  pass "RLS: with BYPASSRLS removed, the service-role policy alone carries the worker's compare-and-set UPDATE and its RETURNING clause"
else
  fail "RLS: the service_role policy does not carry the write without BYPASSRLS: $out"
fi
# The upsert arm too, because ON CONFLICT DO UPDATE is the connect route's only
# write and it needs SELECT, INSERT and UPDATE all at once.
out=$(qs "set role service_role;" "$CONNECT_UPSERT_ARBITER_SQL" "reset role;")
if ! printf '%s' "$out" | grep -qi 'error' \
   && [ "$(q "select count(*) from public.event_sync_jobs where dedupe_key = '$PROBE_KEY'")" = "1" ]; then
  pass "RLS: with BYPASSRLS removed, the service-role policy alone carries the connect route's upsert"
else
  fail "RLS: the service_role policy does not carry the upsert without BYPASSRLS: $out"
fi
q "delete from public.event_sync_jobs where dedupe_key = '$PROBE_KEY';" >/dev/null
if qddl "alter role service_role bypassrls;" \
   && [ "$(q "select rolbypassrls from pg_roles where rolname='service_role'")" = "t" ]; then
  pass "service_role BYPASSRLS restored and confirmed from the catalog"
else
  fail "could not restore service_role BYPASSRLS; every later stage is measuring a contaminated role"
fi

# ---------------------------------------------------------------------------
stage "8  re-apply #4 against a POPULATED table, rows preserved"
# ---------------------------------------------------------------------------
before_rows=$(q "select count(*) from public.event_sync_jobs")
before_key=$(q "select dedupe_key from public.event_sync_jobs where id = '$JOB1'")
before_payload=$(q "select payload->>'connectionId' from public.event_sync_jobs where id = '$JOB1'")
out=$(qmig); rc=$?
after_rows=$(q "select count(*) from public.event_sync_jobs")
if [ "$rc" -eq 0 ] && [ "$before_rows" = "$after_rows" ] && [ "$after_rows" = "2" ] \
   && [ "$(q "select dedupe_key from public.event_sync_jobs where id = '$JOB1'")" = "$before_key" ] \
   && [ "$(q "select payload->>'connectionId' from public.event_sync_jobs where id = '$JOB1'")" = "$before_payload" ]; then
  pass "apply #4 exit 0 against a POPULATED table: $after_rows rows preserved, dedupe_key and payload intact — the \`if not exists\` guards are idempotency, not data loss"
else
  fail "apply #4: rc=$rc rows $before_rows -> $after_rows"
fi
if [ "$(q "select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.event_sync_jobs'::regclass and c.relname='idx_event_sync_jobs_dedupe_active'")" = "1" ]; then
  pass "exactly ONE idx_event_sync_jobs_dedupe_active exists after four applies"
else
  fail "the dedupe index is not unique after four applies"
fi
if [ "$(q "select count(*) from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid='public.event_sync_jobs'::regclass and not exists (select 1 from pg_constraint k where k.conindid=i.indexrelid)")" = "3" ]; then
  pass "exactly THREE non-constraint indexes after four applies"
else
  fail "the non-constraint index count changed after four applies"
fi

# ---------------------------------------------------------------------------
stage "9  the post-condition can FAIL — and three of these are REPAIRS"
# ---------------------------------------------------------------------------
# The distinction is not cosmetic and getting it wrong is how a control passes
# for the wrong reason. This migration RE-ISSUES `alter table ... force row level
# security`, the top-level `drop policy` + `create policy` pair, `revoke all` and
# the grant, so a target where those were changed out of band is REPAIRED by the
# apply and the post-condition is never reached with the defect present. For
# those the meaningful control is "the defect is gone after the apply", which is
# a STRONGER claim than a refusal. The other thirteen are statements the
# migration does not re-issue, so the post-condition is the only thing standing
# between them and a silent success.
#
# Every control restores what it broke AND asserts the restore, from the start —
# DB-020's first revision had a control with no restore step and the five controls
# after it were measured against a contaminated fixture.
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
  o=$(qmig); r=$?
  if [ "$r" -eq 0 ]; then
    fail "control [$name]: the migration still applied cleanly, so the post-condition CANNOT detect this defect"
  elif printf '%s' "$o" | grep -q "$expect"; then
    refusals_fired=$((refusals_fired + 1))
    pass "refusal [$name] fired: $(printf '%s' "$o" | grep -o 'DB-021:.*' | head -1 | cut -c1-118)"
  else
    fail "refusal [$name]: exited $r but did not report '$expect'; got: $(printf '%s' "$o" | grep -i 'error' | head -1 | cut -c1-160)"
  fi
  if ! q "$restore" >/dev/null 2>&1; then
    fail "control [$name]: the RESTORE failed, so every later control is measured against a contaminated fixture"
    return
  fi
  if ! qmig >/dev/null 2>&1; then
    fail "control [$name]: the migration did not re-apply cleanly after the restore, so the fixture is not back to the wanted state"
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
  local o r after
  o=$(qmig); r=$?
  after=$(q "$probe")
  if [ "$r" -eq 0 ] && [ "$after" = "$want" ]; then
    repairs_ok=$((repairs_ok + 1))
    pass "repair [$name]: drifted to '$before', and the apply restored it to '$after'"
  else
    fail "repair [$name]: rc=$r, catalog reads '$after', expected '$after' to be restored from '$before'"
  fi
}

# 1. The CP-104 shape, and the one that matters most here: a client-readable
#    policy on a payload-bearing queue.
refusal "a USING (true) SELECT policy scoped to authenticated" \
  "create policy event_sync_jobs_public_read on public.event_sync_jobs for select to authenticated using (true);" \
  "UNEXPECTED (in the catalog, not claimed here): policy:{event_sync_jobs_public_read}" \
  "drop policy if exists event_sync_jobs_public_read on public.event_sync_jobs;"

# 2. The same shape scoped to PUBLIC — grantee 0, which has no pg_roles row.
refusal "a USING (true) SELECT policy scoped to PUBLIC" \
  "create policy event_sync_jobs_anon_read on public.event_sync_jobs for select to public using (true);" \
  "UNEXPECTED (in the catalog, not claimed here): policy:{event_sync_jobs_anon_read}" \
  "drop policy if exists event_sync_jobs_anon_read on public.event_sync_jobs;"

# 3. A client DELETE policy. No consumer deletes a job; `cancelled` is the
#    soft-terminal state.
refusal "a DELETE policy scoped to authenticated" \
  "create policy event_sync_jobs_client_delete on public.event_sync_jobs for delete to authenticated using (true);" \
  "UNEXPECTED (in the catalog, not claimed here): policy:{event_sync_jobs_client_delete}" \
  "drop policy if exists event_sync_jobs_client_delete on public.event_sync_jobs;"

# 4, 5, 6. A privilege handed to a client role or to PUBLIC. These were WRITTEN
#     as refusals and MEASURED as repairs: the migration re-issues
#     `revoke all on public.event_sync_jobs from public, anon, authenticated`, so
#     the defect is gone before the post-condition is reached and the ACL
#     comparison is correct to find nothing. Asserting a refusal here would have
#     been a control that passes for the wrong reason — and the reason is not
#     subtle: these are the realistic defects on a Supabase target, where a
#     `postgres` role commonly carries `ALTER DEFAULT PRIVILEGES IN SCHEMA public
#     GRANT ALL ON TABLES TO … anon, authenticated, service_role`. The
#     meaningful claim is therefore that the drift is REPAIRED, which is stronger
#     than a refusal.
repair "authenticated granted SELECT out of band" \
  "grant select on public.event_sync_jobs to authenticated;" \
  "select has_table_privilege('authenticated','public.event_sync_jobs','select')" \
  "f"
repair "anon granted INSERT out of band" \
  "grant insert on public.event_sync_jobs to anon;" \
  "select has_table_privilege('anon','public.event_sync_jobs','insert')" \
  "f"
repair "a PUBLIC grant out of band" \
  "grant select on public.event_sync_jobs to public;" \
  "select count(*) from aclexplode((select relacl from pg_class where oid='public.event_sync_jobs'::regclass)) a where a.grantee = 0" \
  "0"

# 7. One extra privilege for the service role, which the migration does NOT
#    revoke (it only re-issues its own grant), so the post-condition is the only
#    thing standing between this and a silent success. Reported UNEXPECTED, not
#    MISSING, because the ACL is compared one key per (grantee, privilege) — that
#    direction is the migration's, and this control is what proves it.
refusal "service_role granted DELETE" \
  "grant delete on public.event_sync_jobs to service_role;" \
  "UNEXPECTED (in the catalog, not claimed here): acl:{service_role}:delete" \
  "revoke all on public.event_sync_jobs from service_role;
   grant select, insert, update on public.event_sync_jobs to service_role;"

# 8. The dedupe arbiter de-uniqued. `create unique index if not exists` KEEPS a
#    same-named non-unique index, silently removing the "one active job per
#    dedupe key" guarantee while reporting success. This is the control that
#    proves the whole-definition comparison is doing work.
refusal "the dedupe index is not unique" \
  "drop index if exists public.idx_event_sync_jobs_dedupe_active;
   create index idx_event_sync_jobs_dedupe_active on public.event_sync_jobs (dedupe_key) where status in ('queued', 'running') and dedupe_key is not null;" \
  "MISSING (claimed here, not in the catalog): index:{idx_event_sync_jobs_dedupe_active}" \
  "drop index if exists public.idx_event_sync_jobs_dedupe_active;
   create unique index idx_event_sync_jobs_dedupe_active on public.event_sync_jobs (dedupe_key) where status in ('queued', 'running') and dedupe_key is not null;"

# 9. The claim index de-predicated: an index that answers "due work" over rows
#    that can never be claimed.
refusal "the claim index is full, not partial" \
  "drop index if exists public.idx_event_sync_jobs_claim;
   create index idx_event_sync_jobs_claim on public.event_sync_jobs (status, run_after, priority, id);" \
  "MISSING (claimed here, not in the catalog): index:{idx_event_sync_jobs_claim}" \
  "drop index if exists public.idx_event_sync_jobs_claim;
   create index idx_event_sync_jobs_claim on public.event_sync_jobs (status, run_after, priority, id) where status = 'queued';"

# 10. The stale-lock index de-predicated.
refusal "the stale-lock index is full, not partial" \
  "drop index if exists public.idx_event_sync_jobs_stale_locks;
   create index idx_event_sync_jobs_stale_locks on public.event_sync_jobs (locked_at);" \
  "MISSING (claimed here, not in the catalog): index:{idx_event_sync_jobs_stale_locks}" \
  "drop index if exists public.idx_event_sync_jobs_stale_locks;
   create index idx_event_sync_jobs_stale_locks on public.event_sync_jobs (locked_at) where status = 'running';"

# 11 & 12. A column re-typed and a NOT NULL dropped. The post-condition asserts
#     the whole contract by name and type rather than by count, precisely so
#     these are caught.
# `provider`, not `locked_by`: the seeded rows hold a worker id in `locked_by`,
# which is not valid JSON, so the first revision of this control FAILED AT THE
# INJECTION and measured nothing. A control that cannot inject is not a control.
refusal "provider retyped from text to varchar" \
  "alter table public.event_sync_jobs alter column provider type varchar using provider::varchar;" \
  "MISSING (claimed here, not in the catalog): provider|text|not null" \
  "alter table public.event_sync_jobs alter column provider type text using provider::text;"
refusal "payload made nullable" \
  "alter table public.event_sync_jobs alter column payload drop not null;" \
  "UNEXPECTED (in the catalog, not claimed here): payload|jsonb|nullable|'{}'::jsonb" \
  "alter table public.event_sync_jobs alter column payload set not null;"

# 13. An extra column, i.e. an invention.
refusal "an extra column exists" \
  "alter table public.event_sync_jobs add column invented_col text;" \
  "UNEXPECTED (in the catalog, not claimed here): invented_col|text|nullable" \
  "alter table public.event_sync_jobs drop column invented_col;"

# 14. A foreign key added. This relation has NO foreign key in the archived
#     contract; an invented dependency is exactly what this lane refuses to add.
refusal "an invented foreign key exists" \
  "alter table public.event_sync_jobs add constraint event_sync_jobs_invented_fk foreign key (id) references auth.users(id) on delete cascade not valid;" \
  "UNEXPECTED (in the catalog, not claimed here): constraint:fk:count=1" \
  "alter table public.event_sync_jobs drop constraint if exists event_sync_jobs_invented_fk;"

# 15. The status CHECK narrowed to the five values in reachable use, dropping
#     `cancelled` — the soft-terminal state with no surface that issues it today.
#     The archived set is asserted in full, so tidying it is reported.
refusal "the status CHECK no longer admits cancelled" \
  "alter table public.event_sync_jobs drop constraint event_sync_jobs_status_check;
   alter table public.event_sync_jobs add constraint event_sync_jobs_status_check check (status in ('queued','running','succeeded','failed','dead')) not valid;" \
  "MISSING (claimed here, not in the catalog): constraint:check:{status}:literals={cancelled,dead,failed,queued,running,succeeded}" \
  "alter table public.event_sync_jobs drop constraint event_sync_jobs_status_check;
   alter table public.event_sync_jobs add constraint event_sync_jobs_status_check check (status in ('queued','running','succeeded','failed','dead','cancelled'));"

# 18. The service-role policy silently narrowed to FOR SELECT. RECLASSIFIED as a
#     repair: the top-level `drop policy if exists` + `create policy` pair
#     re-issues it, so the post-condition is never reached with the defect
#     present. Classifying this as a refusal would be how a control passes for
#     the wrong reason.
repair "the service-role policy narrowed to FOR SELECT" \
  "drop policy event_sync_jobs_service_role_all on public.event_sync_jobs;
   create policy event_sync_jobs_service_role_all on public.event_sync_jobs for select to service_role using (true);" \
  "select (select polcmd from pg_policy where polrelid='public.event_sync_jobs'::regclass and polname='event_sync_jobs_service_role_all')" \
  "*"

# 19 & 20. Repairs, not refusals: the migration re-issues the FORCE statement,
#     the revokes and the grant.
repair "RLS enabled, NOT forced" \
  "alter table public.event_sync_jobs no force row level security;" \
  "select relforcerowsecurity from pg_class where oid = 'public.event_sync_jobs'::regclass" \
  "t"
repair "anon granted SELECT out of band" \
  "grant select on public.event_sync_jobs to anon;" \
  "select has_table_privilege('anon','public.event_sync_jobs','select')" \
  "f"
repair "authenticated granted INSERT out of band" \
  "grant insert on public.event_sync_jobs to authenticated;" \
  "select has_table_privilege('authenticated','public.event_sync_jobs','insert')" \
  "f"

# 21. The relation stranded in `private`, not `public` — the `20260821025543`
#     precedent, where `search_path = private, public` put
#     `ticketing_migration_issues` where no public reader could see it.
#     RECLASSIFIED from a refusal to a repair, and the reclassification is the
#     finding: the migration does NOT refuse this. `create table if not exists
#     public.event_sync_jobs` finds nothing in `public`, creates a correct and
#     EMPTY one, and the post-condition is satisfied. The stranded rows stay
#     stranded. So the guard repairs the public surface and silently orphans the
#     data — which is why "the relation exists in public" is a Layer 0 stop
#     condition in the manifest and not something this file can detect.
repair "the relation is stranded in \`private\`, not \`public\`" \
  "alter table public.event_sync_jobs set schema private;" \
  "select to_regclass('public.event_sync_jobs') is not null" \
  "t"
if [ "$(q "select count(*) from private.event_sync_jobs")" = "2" ] \
   && [ "$(q "select count(*) from public.event_sync_jobs")" = "0" ]; then
  pass "the stranded rows really are orphaned: 2 rows left in private, 0 in the freshly created public relation"
else
  fail "stranded-row assertion wrong: private=$(q "select count(*) from private.event_sync_jobs") public=$(q "select count(*) from public.event_sync_jobs")"
fi
if q "drop table if exists public.event_sync_jobs;
      alter table private.event_sync_jobs set schema public;" >/dev/null 2>&1 \
   && [ "$(q "select count(*) from public.event_sync_jobs")" = "2" ]; then
  pass "stranded relation restored to public with its 2 rows"
else
  fail "could not restore the stranded relation; every later stage is measuring a contaminated fixture"
  exit 1
fi

# The summary is computed FROM the counters, and the counters are incremented
# ONLY on a measured pass. DB-020's first revision reported 12/12 fired when all
# 12 had failed, so this line is cross-checked against $fails rather than trusted.
if [ "$refusals_fired" -eq "$refusals" ] && [ "$repairs_ok" -eq "$repairs" ] && [ "$refusals" -gt 0 ] && [ "$repairs" -gt 0 ]; then
  pass "all $refusals refusal controls fired and all $repairs repair controls restored; every control restored its own fixture and the migration re-applied after each restore"
else
  fail "$refusals_fired of $refusals refusals fired and $repairs_ok of $repairs repairs worked; the summary must never be greener than its parts"
fi

# ---------------------------------------------------------------------------
stage "10  the post-state is re-asserted after all controls"
# ---------------------------------------------------------------------------
out=$(qmig); rc=$?
final=$(q "select (select count(*) from pg_attribute where attrelid='public.event_sync_jobs'::regclass and attnum>0 and not attisdropped) || '/' || (select count(*) from pg_policies where schemaname='public' and tablename='event_sync_jobs') || '/' || (select count(*) from pg_index i where i.indrelid='public.event_sync_jobs'::regclass and not exists (select 1 from pg_constraint k where k.conindid=i.indexrelid)) || '/' || (select relforcerowsecurity from pg_class where oid='public.event_sync_jobs'::regclass) || '/' || (select count(*) from public.event_sync_jobs)")
if [ "$rc" -eq 0 ] && [ "$final" = "16/1/3/true/2" ]; then
  pass "final state 16 columns / 1 policy / 3 indexes / forced=t / 2 rows restored, and the migration is green again"
else
  fail "final state wrong: rc=$rc state=$final"
  printf '%s\n' "$out" | head -5
fi

# ---------------------------------------------------------------------------
stage "11  the CHECK vocabulary and the claim order, behaviourally"
# ---------------------------------------------------------------------------
# A status outside the archived six must be refused, and all SIX must be
# storable — including `cancelled`, which no reachable consumer writes and which
# is therefore exactly the value a "tidied" CHECK would have dropped.
# The probe rows carry a distinct provider so their cleanup cannot touch the
# seeded rows. The first revision cleaned up on `provider = 'ticketmaster'`, which
# is also what JOB2 carries, so the loop silently deleted a seeded row and the
# closing row-count assertion then failed for a reason that had nothing to do with
# the constraint under test.
for st in queued running succeeded failed dead cancelled; do
  out=$(q "insert into public.event_sync_jobs (provider, job_type, payload, status) values ('probe-status','probe-check','{}'::jsonb,'$st');" 2>&1)
  if printf '%s' "$out" | grep -qi 'error'; then
    fail "CHECK: the archived status '$st' is not storable: $out"
  else
    pass "CHECK: the archived status '$st' is storable"
  fi
  q "delete from public.event_sync_jobs where provider = 'probe-status';" >/dev/null
done
out=$(q "insert into public.event_sync_jobs (provider, job_type, payload, status) values ('probe-status','probe-check','{}'::jsonb,'paused');" 2>&1)
if printf '%s' "$out" | grep -q 'violates check constraint'; then
  pass "CHECK: a status outside the archived six is rejected by the archived constraint"
else
  fail "CHECK: 'paused' was accepted: $out"
fi
q "delete from public.event_sync_jobs where provider = 'probe-status';" >/dev/null
# The claim index's column order is the worker's order; assert it is usable as
# the claim query's access path rather than merely present in the definition.
# `enable_seqscan = off` because the question is whether the index CAN serve the
# claim query, not whether a 2-row table makes it cheaper. Asserting a planner
# choice on a fixture this small would be a vacuous control.
plan=$(qs "set enable_seqscan = off;" "explain (costs off) select id from public.event_sync_jobs where status = 'queued' and run_after <= now() order by priority, id limit 1;" "reset enable_seqscan;")
if printf '%s' "$plan" | grep -q 'idx_event_sync_jobs_claim'; then
  pass "the claim query's plan uses idx_event_sync_jobs_claim — $(printf '%s' "$plan" | grep -o 'idx_event_sync_jobs_claim' | head -1)"
else
  fail "the claim query did not use the archived index: $(printf '%s' "$plan" | tr '\n' ' ' | cut -c1-160)"
fi
if [ "$(q "select count(*) from public.event_sync_jobs")" = "2" ]; then
  pass "the CHECK probes left the table at 2 rows — no partial write"
else
  fail "row count changed to $(q 'select count(*) from public.event_sync_jobs')"
fi

# ---------------------------------------------------------------------------
printf '\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED, 0 FAIL\n'
  exit 0
fi
printf '%s FAIL\n' "$fails"
exit 1
