#!/usr/bin/env bash
# Watches IONOS DNS + Resend domain verification, then enables Supabase Auth SMTP
# and re-sends stuck verification emails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="${TOURIFY_RESEND_WATCH_LOG:-/tmp/tourify-resend-watch.log}"

KEY="$(python3 -c "from pathlib import Path; print([l.split('=',1)[1].strip() for l in Path('.env').read_text().splitlines() if l.startswith('RESEND_API_KEY=')][0])")"
FROM_EMAIL="${RESEND_FROM_EMAIL:-no-reply@tourify.live}"

echo "watch start $(date -u)" | tee "$LOG"

dns_ready() {
  local dkim mx spf
  dkim="$(dig +short @ns1035.ui-dns.org TXT resend._domainkey.tourify.live | tr -d '" \n')"
  mx="$(dig +short @ns1035.ui-dns.org MX send.tourify.live | tr '\n' ' ')"
  spf="$(dig +short @ns1035.ui-dns.org TXT send.tourify.live | tr -d '"\n')"
  [[ -n "$dkim" && -n "$mx" && -n "$spf" ]]
}

resend_ready() {
  local resp
  resp="$(curl -s -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"Tourify <$FROM_EMAIL>\",\"to\":[\"kyle@tourify.live\"],\"subject\":\"Tourify domain verified\",\"text\":\"Domain verified. Enabling Auth SMTP.\"}")"
  echo "$resp" | tee -a "$LOG"
  echo "$resp" | grep -q '"id"'
}

enable_smtp_and_resend() {
  export RESEND_API_KEY="$KEY"
  export RESEND_FROM_EMAIL="$FROM_EMAIL"
  export SMTP_SENDER_NAME=Tourify
  export NEXT_PUBLIC_SITE_URL=https://demo.tourify.live

  echo "==> configure SMTP" | tee -a "$LOG"
  npx tsx scripts/configure-supabase-auth-smtp.ts 2>&1 | tee -a "$LOG"

  RAW="$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null || true)"
  if [[ "$RAW" == go-keyring-base64:* ]]; then
    TOKEN="$(echo "${RAW#go-keyring-base64:}" | base64 -d)"
    curl -s -X PATCH "https://api.supabase.com/v1/projects/auqddrodjezjlypkzfpi/config/auth" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"rate_limit_email_sent":60}' | tee -a "$LOG"
    echo | tee -a "$LOG"
  fi

  echo "==> smoke test" | tee -a "$LOG"
  npx tsx scripts/test-auth-email-delivery.ts 2>&1 | tee -a "$LOG"

  echo "==> resend stuck" | tee -a "$LOG"
  RESEND_DELAY_MS=1500 npx tsx scripts/resend-stuck-verifications.ts 2>&1 | tee -a "$LOG"
  echo DONE | tee -a "$LOG"
}

for i in $(seq 1 60); do
  ts="$(date -u +%H:%M:%S)"
  if dns_ready; then
    echo "[$ts] DNS live on IONOS" | tee -a "$LOG"
    for j in $(seq 1 20); do
      ts="$(date -u +%H:%M:%S)"
      echo "[$ts] Resend probe $j" | tee -a "$LOG"
      if resend_ready; then
        echo "[$ts] Resend accepts sends" | tee -a "$LOG"
        enable_smtp_and_resend
        exit 0
      fi
      sleep 20
    done
    echo "[$ts] DNS live but Resend still rejecting" | tee -a "$LOG"
  else
    echo "[$ts] poll $i/60 DNS empty" | tee -a "$LOG"
  fi
  sleep 45
done

echo TIMEOUT | tee -a "$LOG"
exit 1
