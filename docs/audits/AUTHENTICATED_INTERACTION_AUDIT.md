# Authenticated multi-persona interaction audit

**Generated:** 2026-07-18T23:00:45.823Z  
**Base URL:** http://localhost:3000  
**Results:** 18 pass · 0 fail · 0 skip

| Step | Status | HTTP | Detail |
|------|--------|------|--------|
| Login QA A | pass |  | 97b9e178-b65f-47a3-910e-550864a4568a |
| Login QA B | pass |  | 8cc27429-930d-42e2-af06-3a92d10008ea |
| GET /api/accounts (A) | pass | 200 | general, organization, artist, venue, venue, venue, venue, venue, organization, organization |
| switch_account → general | pass | 200 | 97b9e178-b65f-47a3-910e-550864a4568a |
| switch_account → artist | pass | 200 | 3d3b9f30-882d-40d5-a336-f48bdc401c03 |
| switch_account → venue | pass | 200 | d4e1de76-616b-4e17-847d-81e3756bb9c3 |
| switch_account → organization | pass | 200 | 97b9e178-b65f-47a3-910e-550864a4568a-organizer-test-events-&-tours-llc |
| Artist A POST /api/feed/posts | pass | 200 | b9f579b9-0070-49b1-82f1-1d21bc19d219 |
| Band A POST /api/feed/posts | pass | 200 | 5f4faf75-ac7d-4d37-a16e-12dfadf02a0a |
| A → B POST /api/messages | pass | 200 | ff4f267c-0db7-45a2-a048-4a371c71beb5 |
| Artist A → Venue B booking-request | pass | 200 | created |
| B GET /api/messages | pass | 200 | conversations=2 |
| B GET /api/booking-requests | pass | 200 | count=ok |
| Probe A /dashboard | pass | 307 | status=307 loc=/login?redirectTo=%2Fdashboard (page auth is cookie-based; API steps are authoritative) |
| Probe A /artist | pass | 307 | status=307 loc=/login?redirectTo=%2Fartist (page auth is cookie-based; API steps are authoritative) |
| Probe A /venue/dashboard | pass | 307 | status=307 loc=/login?redirectTo=%2Fvenue%2Fdashboard (page auth is cookie-based; API steps are authoritative) |
| Probe A /admin/dashboard | pass | 307 | status=307 loc=/login?redirectTo=%2Fadmin%2Fdashboard (page auth is cookie-based; API steps are authoritative) |
| Probe B /dashboard | pass | 307 | status=307 loc=/login?redirectTo=%2Fdashboard (page auth is cookie-based; API steps are authoritative) |

## Credentials

Uses `QA_USER_A_*` / `QA_USER_B_*` from `.env.local`. Seed with `npm run qa:seed`.

## Notes

- API mutations use Bearer JWT + `x-acting-profile-id` / `x-acting-account-type`.
- HTML role-home probes may redirect without cookies; Playwright click-through covers browser session auth.
