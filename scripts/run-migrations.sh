#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# run-migrations.sh — apply the authoritative Supabase migration chain.
#
# Reads one of these credential shapes from .env.supabase.local
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
DRY_RUN="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi
set -a; source "$ENV_FILE"; set +a

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  ARGS=(db push --db-url "$SUPABASE_DB_URL")
elif [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  ARGS=(db push --project-ref "$SUPABASE_PROJECT_REF")
else
  echo "ERROR: provide SUPABASE_DB_URL or SUPABASE_PROJECT_REF so Supabase can consult migration history." >&2
  exit 1
fi

[[ "$DRY_RUN" == "--dry-run" ]] && ARGS+=(--dry-run)

echo "Applying the active migration chain through Supabase migration history"
supabase "${ARGS[@]}"
