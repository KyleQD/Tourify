# Mobile Rollback Playbooks (iOS)

## Scope

This document defines iOS rollback procedures for both delivery lanes:

- OTA JavaScript/content updates (Expo Updates)
- Native iOS binary releases (TestFlight/App Store)

## Ownership

- Release owner: executes rollback actions
- Mobile owner: validates app behavior after rollback
- API owner: verifies backend compatibility for rolled-back clients
- Support owner: posts customer-facing status updates

## Common rollback triggers

- Crash-free sessions drop below 98%
- Auth failure rate increases by more than 5% versus baseline
- Booking or checkout completion drops by more than 30% versus baseline
- Launch-blocking App Review or compliance defect

## OTA rollback playbook

Use this when the issue was introduced by OTA code/content only and no native runtime change is required.

1. Identify last known-good update group in EAS dashboard.
2. Republish the last stable commit to the same branch/channel:

```bash
cd apps/mobile
npx eas update --branch production --message "rollback:<sha> restore last known good"
```

3. Confirm fresh sessions receive the rollback update.
4. Verify critical flows:
   - `tourify://callback` auth return
   - connect claim + confirm
   - booking checkout redirect to `tourify://bookings`
5. Publish incident note with rollback commit and impacted versions.

## Native iOS rollback playbook

Use this for runtime/plugin/dependency/native changes that cannot be corrected by OTA alone.

1. Pause phased release in App Store Connect immediately.
2. Keep last stable version available to existing users.
3. Cut a hotfix branch and run native release workflow:

```bash
npm run mobile:ios:build:production
npm run mobile:ios:submit:production
```

4. Submit expedited review request if user-facing outage is severe.
5. Resume phased rollout only after:
   - crash-free sessions are back to baseline
   - no P0/P1 regressions in auth/connect/checkout

## Verification checklist after rollback

- Confirm release tags in logs include expected `appVersion`, `runtimeVersion`, and `releaseChannel`
- Confirm API error rates and auth/checkout success return to baseline
- Confirm support inbox trends stabilize within 2 hours
- Record root cause and preventive action in launch retrospective
