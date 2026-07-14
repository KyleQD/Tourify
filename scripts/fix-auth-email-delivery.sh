#!/usr/bin/env bash
# One-shot: configure Resend SMTP on Supabase Auth, smoke-test delivery, re-send stuck verifications.
#
# Prerequisites:
#   1. Resend account with API key (https://resend.com/api-keys)
#   2. Domain verified in Resend (https://resend.com/domains) — e.g. tourify.live
#   3. Logged-in Supabase CLI (`supabase login`) OR SUPABASE_ACCESS_TOKEN set
#
# Usage:
#   export RESEND_API_KEY=re_xxx
#   export RESEND_FROM_EMAIL=noreply@tourify.live
#   ./scripts/fix-auth-email-delivery.sh
#
# Optional:
#   TEST_INBOX=you@example.com  — keep a real signup so you can click the link
#   SKIP_RESEND_STUCK=1         — skip bulk re-send to unconfirmed users
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "Missing RESEND_API_KEY"
  exit 1
fi

if [[ -z "${RESEND_FROM_EMAIL:-}" ]]; then
  echo "Missing RESEND_FROM_EMAIL (verified sender on your Resend domain)"
  exit 1
fi

echo "==> Configure Supabase Auth SMTP"
npx tsx scripts/configure-supabase-auth-smtp.ts

echo
echo "==> Smoke-test signup email queue"
npx tsx scripts/test-auth-email-delivery.ts

if [[ "${SKIP_RESEND_STUCK:-}" == "1" ]]; then
  echo
  echo "Skipping stuck-user re-send (SKIP_RESEND_STUCK=1)"
else
  echo
  echo "==> Re-send verification emails to unconfirmed users"
  npx tsx scripts/resend-stuck-verifications.ts
fi

echo
echo "Done. Confirm a test email arrives in Resend → Emails, then click the link."
