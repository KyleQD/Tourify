#!/usr/bin/env bash
# ============================================================================
# db008_run_all.sh — the single entry point for the database lane's executables.
#
# WHY THIS EXISTS
#   The Wave 33 storage-replay-guard harness and the Wave 34 reproducibility
#   harness were both committed as standalone shell scripts that nothing invoked.
#   The storage one exited 0 having run ZERO scenarios, because its scenario
#   manifest and its emulation bootstrap were never committed and nothing in the
#   repository called it. A proof that no gate runs is not a proof. This file is
#   the entry point so that "the database lane's harnesses pass" is a single
#   command a reviewer can run, and so a new harness cannot silently join the
#   dormant set.
#
# SCOPE AND LIMITS — read before quoting any result
#   * Every harness below runs against a THROWAWAY LOCAL PostgreSQL 16 cluster
#     created in a temp dir and destroyed on exit, or reads the repository
#     statically. None of them contacts Supabase, applies a migration to any
#     environment, or runs `supabase db reset` (CP-051).
#   * A pass here is evidence about the MIGRATION CHAIN and the GENERATED
#     CONTRACT. It is not evidence about staging, not evidence about
#     production, and not a substitute for the operator's manual apply.
#   * HARNESSES THAT NEED A LIVE TARGET are listed at the bottom and are NOT run
#     here. They are named so their absence is visible rather than implied.
#
# USAGE
#   bash supabase/tests/db008_run_all.sh            # all harnesses
#   bash supabase/tests/db008_run_all.sh view       # one harness by short name
#   bash supabase/tests/db008_run_all.sh --list
# ============================================================================
set -uo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HARNESS_DIR/../.." && pwd)"

# name|interpreter|script|what a pass does and does not prove
# A backtick in a description would be command-substituted by the unquoted heredoc
# below and would EXECUTE, so these strings are deliberately backtick-free.
HARNESSES="
storage-guard|bash|db008_storage_replay_guard.harness.sh|10 CP-059 guarded storage migrations: the unguarded form aborts as a non-owner replay role, the guarded form does not, the owner-applied policy set is identical, and the form is idempotent. Local emulation.
view-replay|bash|db008_view_column_replay.harness.sh|13 chain view relations: PostgreSQL resolves each view's real SELECT list and the resolved column set is compared with lib/database.types.ts in both directions. Replaces the weaker name-occurrence check. Local emulation.
reproducibility|bash|db008_contract_reproducibility.harness.sh|CP-016 safety gate: the active chain is a superset of the generated contract, so regeneration may only add coverage. Static.
marketplace|bash|db011_marketplace_surface.harness.sh|The three DB-011 marketplace checkout migrations apply twice, the postflights return zero violations, and 6 authorization behaviours plus 5 negative controls hold. Local emulation.
money-path|bash|db011_marketplace_money_path.harness.sh|The two DB-011 money-path marketplace tables apply twice: the Stripe webhook claim is service-role-only with a working unique constraint, the fee schedule is admin-gated with an inactive default rule, and 3 negative controls fire. Local emulation.
interaction-scope|bash|db011_interaction_scope.harness.sh|Stage 1 of HF-DB-006-SOCIAL-007: an unauthenticated caller reads 2 of 2 post_likes rows before the fix and 0 of 0 after it, on all three interaction tables, and the stage-2 residual is asserted rather than hidden. Local emulation.
scheduled-posts|bash|db008_scheduled_posts_platform.harness.sh|HF-DB-011-SCHEDULED-POSTS-FRESH-CHAIN-DIVERGENCE: the ordering defect is REPRODUCED from the two real chain files and then repaired, with the product's own read and write shapes run against the result. Local emulation.
view-delta|node|db008_linked_type_delta.mjs|Compares the committed contract against a supabase gen types payload from a named target. Skipped unless DB_LINKED_TYPES is set.
attribution|node|db008_contract_attribution_audit.mjs|Re-reads every contract column against the migration that claims to create it, requiring both relation and column to be named there. Static.
"

list() {
  printf 'harnesses:\n'
  printf '%s\n' "$HARNESSES" | while IFS='|' read -r name interp script desc; do
    [ -n "$name" ] || continue
    printf '  %-16s %-5s %s\n' "$name" "$interp" "$script"
  done
  cat <<'EOS'
not run here, because they need a live target and are therefore never silently
claimed:
  generate:database-types   SUPABASE_TYPE_SOURCE=local|linked|project-id
  check:database-types      the same source, drift gate
  supabase db lint --local  a running local stack
  hosted apply + postflight  the operator's manual apply (CP-051)
EOS
}

if [ "${1:-}" = "--list" ]; then list; exit 0; fi

wanted="${1:-}"
fails=0
ran=0
skipped=0

while IFS='|' read -r name interp script desc; do
  [ -n "$name" ] || continue
  [ -z "$wanted" ] || [ "$wanted" = "$name" ] || continue
  ran=$((ran + 1))
  printf '\n################## %s ##################\n' "$name"
  printf '# %s %s\n# %s\n\n' "$interp" "$script" "$desc"
  case "$name" in
    view-delta)
      if [ -z "${DB_LINKED_TYPES:-}" ] || [ ! -f "${DB_LINKED_TYPES:-}" ]; then
        printf 'SKIP view-delta: set DB_LINKED_TYPES=<path to a `supabase gen types typescript --schema public` payload>\n'
        skipped=$((skipped + 1))
        continue
      fi
      if node "$HARNESS_DIR/$script" "$DB_LINKED_TYPES" "$ROOT" >/dev/null; then
        printf 'PASS view-delta\n'
      else
        printf 'FAIL view-delta (the script exits non-zero only when it cannot parse its input; the delta itself is printed, not asserted)\n'
        fails=$((fails + 1))
      fi
      ;;
    *)
      if "$interp" "$HARNESS_DIR/$script" >/tmp/db008-run-all-"$name".log 2>&1; then
        tail -3 /tmp/db008-run-all-"$name".log | sed 's/^/  /'
        printf 'PASS %s\n' "$name"
      else
        tail -25 /tmp/db008-run-all-"$name".log | sed 's/^/  /'
        printf 'FAIL %s (full log: /tmp/db008-run-all-%s.log)\n' "$name" "$name"
        fails=$((fails + 1))
      fi
      ;;
  esac
done <<EOF
$HARNESSES
EOF

# A runner that executed nothing has proved nothing. Wave 34's storage harness
# passed with zero scenarios for exactly this reason, so the same condition is a
# failure here.
if [ "$ran" -eq 0 ]; then
  printf '\nNO HARNESS RAN. Unknown name "%s"? Use --list.\n' "$wanted"
  exit 1
fi

printf '\n== summary ==\n'
printf 'ran %s, skipped %s, failed %s\n' "$ran" "$skipped" "$fails"
[ "$fails" -eq 0 ] || exit 1
