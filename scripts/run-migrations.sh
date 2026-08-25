#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# run-migrations.sh — apply program SQL to a Supabase project.
#
# Reads ONE of these credential shapes from .env.supabase.local
# (repo root, gitignored — never paste tokens into chat):
#
#   SUPABASE_ACCESS_TOKEN=sbp_...
#   SUPABASE_PROJECT_REF=abcdefghijklmnopqrst
#
#   — or —
#
#   SUPABASE_DB_URL=postgresql://postgres:PASSWORD@aws-0-...pooler.supabase.com:6543/postgres
#
# Usage:  bash scripts/run-migrations.sh [--dry-run]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env.supabase.local"
MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"
DRY_RUN="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

FILES=(
  "$MIGRATIONS_DIR"/20260823010000_venue_identity_bridge.sql
  "$MIGRATIONS_DIR"/20260823020000_venue_slug_repair.sql
  "$MIGRATIONS_DIR"/20260823030000_rpc_authorization_hardening.sql
  "$MIGRATIONS_DIR"/20260823031000_integration_token_vault.sql
  "$MIGRATIONS_DIR"/20260823040000_venue_public_flag_unification.sql
  "$MIGRATIONS_DIR"/20260823050000_venue_rbac_adoption.sql
  "$MIGRATIONS_DIR"/20260823060000_ticketing_grant_collapse_fix.sql
  "$MIGRATIONS_DIR"/20260823070000_staff_members_canonical_roster.sql
  "$MIGRATIONS_DIR"/20260823071000_staff_shifts_backfill.sql
  "$MIGRATIONS_DIR"/20260823072000_shift_rls_hardening.sql
  "$MIGRATIONS_DIR"/20260823073000_workforce_permission_granularity.sql
  "$MIGRATIONS_DIR"/20260823080000_contact_reconciliation.sql
  "$MIGRATIONS_DIR"/20260823090000_canonical_location_and_amenities.sql
  "$MIGRATIONS_DIR"/20260823100000_slug_rename_history.sql
  "$MIGRATIONS_DIR"/20260823110000_public_venue_search_rpc.sql
  "$MIGRATIONS_DIR"/20260823120000_venue_account_lifecycle.sql
  "$MIGRATIONS_DIR"/20260823130000_booking_lifecycle.sql
  "$MIGRATIONS_DIR"/20260823140000_reservation_conflict_engine.sql
  "$MIGRATIONS_DIR"/20260823150000_booking_requester_identity.sql
  "$MIGRATIONS_DIR"/20260823160000_messaging_isolation.sql
)
echo "Found ${#FILES[@]} migration files:"
printf '  %s\n' "${FILES[@]##*/}"

run_via_api() {
  local sql_file="$1"
  echo "── Applying $(basename "$sql_file") via Management API…"
  # Escape the SQL into a JSON string payload using node.
  local payload
  payload=$(node -e '
    const fs = require("fs");
    process.stdout.write(JSON.stringify({ query: fs.readFileSync(process.argv[1], "utf8") }));
  ' "$sql_file")
  local http_code
  http_code=$(curl -sS -o /tmp/supabase_query_response.json -w "%{http_code}" \
    -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload")
  if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
    echo "FAILED (HTTP $http_code):" >&2
    cat /tmp/supabase_query_response.json >&2
    exit 1
  fi
  echo "   OK"
}

echo
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  MODE="api"
  echo "Mode: Management API → project ref ${SUPABASE_PROJECT_REF}"
  curl -sS -o /dev/null -w "Target project name: " \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}" >/dev/null 2>&1 || true
elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  MODE="psql"
  command -v psql >/dev/null || { echo "ERROR: psql not installed (brew install libpq)"; exit 1; }
  echo "Mode: psql direct connection"
else
  echo "ERROR: no recognizable credentials in $ENV_FILE" >&2
  exit 1
fi

for f in "${FILES[@]}"; do
  if [[ "$MODE" == "api" ]]; then
    [[ "$DRY_RUN" == "--dry-run" ]] && { echo "[dry-run] would apply $(basename "$f")"; continue; }
    run_via_api "$f"
  else
    [[ "$DRY_RUN" == "--dry-run" ]] && { echo "[dry-run] would apply $(basename "$f")"; continue; }
    echo "── Applying $(basename "$f") via psql…"
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  fi
done

echo
echo "✅ All migrations applied. Re-run the validation quick-checks from"
echo "   supabase/RUN_ALL_PROGRAM_MIGRATIONS.sql (bottom of file) and share"
echo "   the NOTICE output for tracker reconciliation."
