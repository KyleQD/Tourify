#!/usr/bin/env bash
# ============================================================================
# db011_interaction_scope.harness.sh
#
# DB-008 / DB-011 — behavioural proof for 20260926140000_interaction_read_scoping.sql
# (HF-DB-006-SOCIAL-007, stage 1).
#
# WHAT IT PROVES
#   1. the three pre-existing `USING (true)` SELECT policies really do let an
#      UNAUTHENTICATED caller read every row of post_likes, comment_likes and
#      post_comments through a plain SELECT — the negative control that makes the
#      fix mean something
#   2. after the migration, `anon` reads ZERO rows from all three
#   3. an `authenticated` caller reading their OWN rows still succeeds, which is
#      what every viewer-scoped consumer depends on
#   4. an `authenticated` caller reading ANOTHER user's like still succeeds,
#      because stage 1 is deliberately non-breaking and stage 2 is the social
#      and admin lanes' change. This is asserted as a KNOWN, RECORDED behaviour,
#      not left implicit.
#   5. an orphan comment (post_id with no parent post) is denied
#   6. the contract postflight returns zero violations and one summary row
#   7. applying the migration a second time changes nothing (idempotent)
#   8. with the policies removed, the postflight FAILS — the postflight can fail
#
# WHAT IT IS NOT
#   A local emulation: PostgreSQL 16.15, a throwaway cluster in a temp dir, a
#   minimal auth/roles bootstrap, and the chain's own `create table` for the four
#   relations copied verbatim. Not Supabase, not a hosted project, not a chain
#   replay, no `supabase db reset` (CP-051). Nothing here says anything about
#   staging or production; the operator's manual apply is the gate.
# ============================================================================
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$PGBIN/initdb" >/dev/null 2>&1 || { echo "SKIP no local PostgreSQL at $PGBIN"; exit 0; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/db011-interaction.XXXXXX")"
PGDATA="$TMP/data"; SOCK="$TMP"; PORT="${DB011_SCOPE_PORT:-54337}"
export PATH="$PGBIN:$PATH"
fails=0
pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
stage() { printf '\n== %s ==\n' "$1"; }
# -q suppresses command tags so a trailing statement's output cannot be mistaken
# for a result value.
q() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq -c "$1" 2>&1; }
# One session for setup, query and teardown: a separate invocation silently
# discards `set role` and the JWT claim, which would measure an anonymous
# session instead of the identity under test.
qs() {
  local setup="$1" query="$2" teardown="$3"
  psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAXq \
    -c "$setup" -c "$query" -c "$teardown" 2>&1
}
qf() { psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -tAX -f "$1" 2>&1; }
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

MIG="$ROOT/supabase/migrations/20260926140000_interaction_read_scoping.sql"
TST="$ROOT/supabase/tests/db008_interaction_read_scoping_contract.sql"

printf 'db011 interaction read-scope harness (local emulation, not a hosted target)\n'

# ---------------------------------------------------------------------------
stage "0  cluster and fixture, with the fixture's own post-state asserted"
# ---------------------------------------------------------------------------
initdb -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C >"$TMP/initdb.log" 2>&1 || { fail "initdb"; tail -5 "$TMP/initdb.log"; exit 1; }
pg_ctl -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$TMP/pg.log" start >/dev/null 2>&1 || { fail "pg_ctl start"; tail -5 "$TMP/pg.log"; exit 1; }
pass "throwaway PostgreSQL $(q 'show server_version' | head -1) cluster started"

qf "$ROOT/supabase/tests/db011_emulation_bootstrap.sql" >"$TMP/boot.log" 2>&1
if q "select count(*) from pg_roles where rolname in ('anon','authenticated')" | grep -qx 2; then
  pass "bootstrap created the anon and authenticated roles"
else
  fail "bootstrap did not create anon/authenticated"
fi
if [ "$(q "select to_regprocedure('auth.uid()') is not null")" = "t" ]; then
  pass "bootstrap created auth.users and auth.uid()"
else
  fail "bootstrap did not create auth.users / auth.uid()"
fi

# The four relations and the three original policies, copied from the chain
# verbatim:
#   posts / post_likes        20240430000000_create_posts.sql
#   post_comments/comment_likes 20241220000010_enhance_feed_system.sql
q "
create table public.posts (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, content text not null);
create table public.post_likes (id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), unique(post_id, user_id));
create table public.post_comments (id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, parent_comment_id uuid references public.post_comments(id) on delete cascade, content text not null, likes_count integer default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.comment_likes (id uuid primary key default gen_random_uuid(), comment_id uuid references public.post_comments(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), unique(comment_id, user_id));
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.comment_likes enable row level security;
" >/dev/null
q "
create policy \"Anyone can view posts\" on public.posts for select using (true);
create policy \"Anyone can view likes\" on public.post_likes for select using (true);
create policy \"Comments are viewable by everyone\" on public.post_comments for select using (true);
create policy \"Comment likes are viewable by everyone\" on public.comment_likes for select using (true);
create policy \"Users can like posts\" on public.post_likes for insert with check (auth.uid() = user_id);
create policy \"Users can unlike posts\" on public.post_likes for delete using (auth.uid() = user_id);
create policy \"Users can like comments\" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy \"Users can unlike comments\" on public.comment_likes for delete using (auth.uid() = user_id);
create policy \"Users can create comments\" on public.post_comments for insert with check (auth.uid() = user_id);
create policy \"Users can update their own comments\" on public.post_comments for update using (auth.uid() = user_id);
create policy \"Users can delete their own comments\" on public.post_comments for delete using (auth.uid() = user_id);
grant usage on schema public, auth to anon, authenticated;
grant select on public.posts, public.post_likes, public.post_comments, public.comment_likes to anon, authenticated;
" >/dev/null

# ASSERT THE FIXTURE, DO NOT ASSUME IT. A silently failed rebuild is the exact
# way a harness reports a pass that measures nothing.
fixture_state=$(q "select (select count(*) from pg_policies where schemaname='public') || '/' || (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r')")
if [ "$fixture_state" = "11/4" ]; then
  pass "pre-migration state asserted: 4 tables, 11 policies including 3 USING (true) SELECT policies"
else
  fail "pre-migration state wrong: $fixture_state (expected 11/4)"
fi

# Seed: two users, one post, one like each way, one comment, one comment like,
# and one orphan comment whose post_id points at a post that does not exist.
q "
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
insert into public.posts (id, user_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'hello');
insert into public.post_likes (post_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'), ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222');
insert into public.post_comments (post_id, user_id, content) values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','nice');
insert into public.comment_likes (comment_id, user_id) select id, '22222222-2222-2222-2222-222222222222' from public.post_comments where content = 'nice';
" >"$TMP/seed.log" 2>&1
if [ -s "$TMP/seed.log" ] && grep -qi error "$TMP/seed.log"; then printf '        seed said: %s\n' "$(head -3 "$TMP/seed.log" | tr '\n' ' ')"; fi
# The chain's own foreign key `post_comments_post_id_fkey` makes an orphan
# comment unreachable through normal DML, so the parent-post predicate in the new
# policy is DEFENCE IN DEPTH that mirrors the FK rather than an orphan filter. To
# test the policy rather than the FK, one orphan is inserted with the trigger
# disabled; without the predicate it would be readable, with it it is not.
q "set session_replication_role = replica; insert into public.post_comments (post_id, user_id, content) values ('bbbbbbbb-0000-0000-0000-000000000099','11111111-1111-1111-1111-111111111111','orphan'); set session_replication_role = origin;" >/dev/null
if [ "$(q 'select count(*) from public.post_likes')" = "2" ] && [ "$(q 'select count(*) from public.post_comments')" = "2" ] && [ "$(q 'select count(*) from public.comment_likes')" = "1" ]; then
  pass "seed asserted: 2 likes, 2 comments (1 with the FK disabled), 1 comment like"
else
  fail "seed did not apply (likes=$(q 'select count(*) from public.post_likes'), comments=$(q 'select count(*) from public.post_comments'), comment_likes=$(q 'select count(*) from public.comment_likes'))"
fi

# ---------------------------------------------------------------------------
stage "1  NEGATIVE CONTROL: before the fix, anon reads EVERY row"
# ---------------------------------------------------------------------------
for t in post_likes comment_likes post_comments; do
  n=$(qs "set role anon;" "select count(*) from public.$t;" "reset role;")
  if [ "${n:-0}" -ge 1 ]; then
    pass "control: anon can read all $n $t rows under USING (true)"
  else
    fail "control: anon could not read $t before the fix, so the fix proves nothing"
  fi
done

# ---------------------------------------------------------------------------
stage "2  apply the migration, then apply it again (idempotency)"
# ---------------------------------------------------------------------------
if qf "$MIG" >"$TMP/apply1.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/apply1.log")" ]; then
  pass "migration applied cleanly"
else
  fail "migration did not apply"; tail -10 "$TMP/apply1.log"
fi
q "select string_agg(polname, ',') from pg_policies where schemaname='public' and tablename='post_likes'" >"$TMP/policies1"
if qf "$MIG" >"$TMP/apply2.log" 2>&1 && [ -z "$(grep -i 'error' "$TMP/apply2.log")" ]; then
  pass "migration applied a second time with no error"
else
  fail "second apply failed"; tail -10 "$TMP/apply2.log"
fi
q "select string_agg(polname, ',') from pg_policies where schemaname='public' and tablename='post_likes'" >"$TMP/policies2"
if diff -q "$TMP/policies1" "$TMP/policies2" >/dev/null; then
  pass "policy set is identical after the second apply (idempotent)"
else
  fail "policy set changed on the second apply"
fi

# ---------------------------------------------------------------------------
stage "3  THE FIX: anon is denied, authenticated keeps its rows"
# ---------------------------------------------------------------------------
for t in post_likes comment_likes post_comments; do
  n=$(qs "set role anon;" "select count(*) from public.$t;" "reset role;")
  if [ "${n:-1}" = "0" ]; then
    pass "anon reads 0 rows of $t"
  else
    fail "anon still reads $n rows of $t"
  fi
done
own=$(qs "set role anon; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "select count(*) from public.post_likes where user_id = auth.uid();" "reset role;")
if [ "${own:-0}" = "1" ]; then
  pass "an authenticated caller still reads their own like (1 row) — this is what every viewer-scoped consumer depends on"
else
  fail "authenticated own-like read returned ${own:-empty}, expected 1"
fi
comments=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "select count(*) from public.post_comments;" "reset role;")
if [ "${comments:-0}" = "1" ]; then
  pass "an authenticated caller reads the 1 comment whose parent post is visible, and NOT the FK-disabled orphan"
else
  fail "authenticated comment read returned ${comments:-empty}, expected 1 (the orphan must be denied)"
fi
other=$(qs "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111'; set role authenticated;" "select count(*) from public.post_likes where user_id <> auth.uid();" "reset role;")
if [ "${other:-0}" = "1" ]; then
  pass "STAGE-1 NON-REGRESSION, asserted not hidden: an authenticated caller still reads another user's like. That is deliberate (no committed surface breaks) and is the recorded stage-2 gap, HF-DB-006-SOCIAL-007-STAGE2. It is NOT a claim that the finding is closed."
else
  fail "expected the recorded stage-1 behaviour (1 cross-user like), got ${other:-empty}. If this is now 0 the harness no longer documents the real state and must be updated."
fi

# ---------------------------------------------------------------------------
stage "4  contract postflight"
# ---------------------------------------------------------------------------
out=$(qf "$TST")
viol=$(printf '%s\n' "$out" | grep -c . | tr -d ' ')
summary=$(printf '%s\n' "$out" | grep -c 'interaction_read_scoping_ready' | tr -d ' ')
if [ "${summary:-0}" = "1" ] && [ "${viol:-0}" = "1" ]; then
  pass "postflight returns exactly one summary row and no violations"
else
  fail "postflight returned $viol rows, $summary of them the summary"; printf '%s\n' "$out" | head -10
fi

# ---------------------------------------------------------------------------
stage "5  NEGATIVE CONTROL: the postflight must fail when the policies are gone"
# ---------------------------------------------------------------------------
q "drop policy \"Users can view likes on visible posts\" on public.post_likes" >/dev/null 2>&1
out2=$(qf "$TST")
if printf '%s\n' "$out2" | grep -q 'missing_policy'; then
  pass "postflight detects the removed policy ($(printf '%s\n' "$out2" | grep -c 'missing_policy') violation row(s))"
else
  fail "postflight passed with a policy removed; it cannot fail"
fi
qf "$MIG" >/dev/null 2>&1
out3=$(qf "$TST")
if printf '%s\n' "$out3" | grep -q 'interaction_read_scoping_ready' && [ "$(printf '%s\n' "$out3" | grep -c .)" = "1" ]; then
  pass "re-applying the migration restores the postflight"
else
  fail "postflight did not return to green after re-apply"
fi

# ---------------------------------------------------------------------------
stage "6  post-state re-assertion — a crashed run must not read as a pass"
# ---------------------------------------------------------------------------
anon_likes=$(qs "set role anon;" "select count(*) from public.post_likes;" "reset role;")
if [ "${anon_likes:-x}" = "0" ] && [ "$fails" -eq 0 ]; then
  pass "post-state re-assertion: anon reads 0 post_likes rows, 0 failed checks"
else
  fail "post-state re-assertion: anon reads ${anon_likes:-?} post_likes rows, $fails checks failed"
fi

printf '\n== summary ==\n'
if [ "$fails" -eq 0 ]; then
  printf 'ALL CHECKS PASSED (anon denied on 3 interaction tables; authenticated rows unchanged; stage-2 residual recorded)\n'
  exit 0
fi
printf '%s CHECK(S) FAILED\n' "$fails"
exit 1
