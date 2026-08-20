# Test Matrix

| Area | Required cases | Release evidence |
| --- | --- | --- |
| Worker access | Direct URL, changed assignment/publication/shift/site-map ID, removed permission, stale browser session | Two-worker persona test with no cross-worker rows or documents visible |
| Lifecycle | No work, pending application, offer response, multiple assignments, cancelled assignment, history | Server read-model response and responsive-web smoke test |
| Schedule | Pending, published, changed, timezone, DST, overnight | Correct event-local labels and no invented times |
| Publications | Not published, current version, new version resets acknowledgement, document and map access | Assignment-scoped acknowledgement rows only |
| Attendance | Too early, valid check-in, double tap, denied permission, offline, checkout | Append-only rows, duplicate constraint, clear client state; no offline write success |
| Reliability | Cached snapshot, refresh on focus, manual refresh, Realtime connected/disconnected | Cache contains only server read data; subscriptions change only the active worker/event view |
| Accessibility/mobile | Keyboard, visible focus, screen-reader status, 44px targets, narrow viewport | Manual keyboard/screen-reader and mobile-device checklist |
| Performance | Work Hub/Work Mode initial load and mutation latency | Production-like telemetry against agreed release budget |

2026-08-19 local verification: `/work` and `/work/today` loaded without a framework overlay or console errors. Work Mode rendered at a 390px viewport, and its simulated offline state clearly withheld attendance actions. Authenticated worker personas, screen-reader use, and production-like performance telemetry remain launch gates.
