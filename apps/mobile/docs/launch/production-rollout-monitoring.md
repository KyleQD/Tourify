# Production Rollout Monitoring

This checklist is used after store release submission is approved and rollout starts.

## Rollout Strategy

- Release iOS to production after TestFlight validation and App Store approval.
- Use phased release in App Store Connect (start at the lowest rollout percentage available).
- Hold for at least 6 hours before increasing rollout exposure.

## Required Owners

- Release owner: executes rollout controls
- API owner: watches critical route errors
- Support owner: triages user-reported launch issues

## Monitoring Windows

### 0-2 Hours

- Verify crash-free sessions are at least 99% (Sentry release health).
- Verify auth sign-in completion does not regress from baseline.
- Verify password-reset deep link completion (no spike in reset-password errors).
- Verify event checkout **verification** success (not browser-open alone).
- Verify push notification open → in-app navigation works.
- Verify venue booking-requests API list/approve path for venue accounts.
- Verify connect claim + confirm flows succeed in production telemetry.

### 2-6 Hours

- Verify checkout API error rates remain within baseline:
  - `/api/marketplace/checkout`
  - `/api/music/share`
  - `/api/music/library`
- Verify no spike in `401` / `403` for connect and music routes.
- Review 1-star and 2-star reviews for launch-critical defects.

### 6-24 Hours

- Increase staged rollout only if no P0/P1 defects are open.
- Confirm push notification delivery and open rates are stable.
- Confirm support inbox SLA is maintained.

### 24-72 Hours

- Compare retention and conversion against pre-launch forecast.
- Ship metadata-only hotfixes if store listing corrections are needed.
- Decide whether to move to 100% rollout.
- Architecture checkpoint: with two production cycles of crash/startup telemetry, reassess Expo SDK upgrade only if hard native blockers appear.

## Rollback Triggers

- Crash-free sessions under 98%.
- Auth failure rate exceeds baseline by more than 5%.
- Booking/checkout success drops by more than 30% from baseline.
- Confirmed compliance issue reported by store review teams.

If any trigger is hit, pause rollout immediately and escalate to on-call.

## Rollback Execution

- For OTA regressions, follow `rollback-playbooks.md` and republish last known-good update to `production` branch.
- For native regressions, pause phased release in App Store Connect and ship a hotfix binary via the iOS native release workflow.
