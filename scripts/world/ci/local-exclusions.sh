#!/usr/bin/env bash
# Local replay helper for the registry-owned migration exclusions.
#   scripts/world/ci/local-exclusions.sh apply    # before local supabase start/db reset
#   scripts/world/ci/local-exclusions.sh restore  # ALWAYS run before committing
# Mirrors exactly what world-ci.yml does; keeps local runs consistent with CI.
set -euo pipefail
cd "$(dirname "$0")/../../.."

REG=scripts/world/ci/migration-exclusions.txt

case "${1:-}" in
  apply)
    while IFS= read -r line; do
      case "$line" in ""|\#*) continue ;; esac
      f="supabase/migrations/$line"
      if [ ! -f "$f" ]; then echo "registered exclusion missing: $line" >&2; exit 1; fi
      mv "$f" "$f.excluded"
      echo "excluded: $line"
    done < "$REG"
    ;;
  restore)
    find supabase/migrations -name "*.excluded" | while read -r f; do
      mv "$f" "${f%.excluded}"
      echo "restored: ${f%.excluded}"
    done
    # Hard guard: the registry entries must exist as tracked originals.
    while IFS= read -r line; do
      case "$line" in ""|\#*) continue ;; esac
      if [ ! -f "supabase/migrations/$line" ]; then
        echo "FATAL: $line missing after restore — commit would break CI." >&2
        exit 1
      fi
    done < "$REG"
    ;;
  *)
    echo "usage: $0 apply|restore" >&2
    exit 1
    ;;
esac
