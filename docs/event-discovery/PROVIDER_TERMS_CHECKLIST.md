# Provider Terms Checklist

Status legend: ⬜ not started · 🔶 needs business approval · ✅ implemented/satisfied

## Ticketmaster Discovery API

| Item | Status | Notes |
|---|---|---|
| API key obtained (developer portal) | 🔶 | Business must register; `TICKETMASTER_API_KEY` server-only |
| Attribution: "powered by Ticketmaster" / ticket links preserved | ⬜ | Phase 4 UI attribution on cards/detail |
| Rate limits confirmed from actual key + response headers | ⬜ | Default conservative (4 req/s shared); read quota headers at runtime |
| No uncontrolled crawl; market-scoped sync | ⬜ | Limited-market cells + on-demand stale refresh only |
| Raw payload retention bounded | ⬜ | Store normalized payload + hash only; raw retained ≤ 30 days for debug, flag-gated |
| Ticket purchase happens on provider checkout | ⬜ | `event_ticket_offers.url` links out; no resale/scraping |
| Cache/expiry honors terms | ⬜ | `expires_at` on source records; refresh after expiry |

## Bandsintown

| Item | Status | Notes |
|---|---|---|
| Platform-wide API use requires partnership | 🔶 | Default mode `disabled`; `artist_owned_key` and `partner` modes behind flags |
| Artist-owned keys authorized per artist | ⬜ | `event_provider_connections` with verified ownership; no cross-artist reads |
| No scraping bandsintown.com | ✅ | API only; no HTML scraping anywhere in plan |
| Attribution on artist-tour dates | ⬜ | Phase 7 |
| Data scoped to connected artist only | ⬜ | Active-artist-only scheduling; negative lookup cache |

## General

| Item | Status | Notes |
|---|---|---|
| No provider keys in client bundles/logs | ⬜ | Server-only env; secret scan in CI (`scan-for-secrets.sh`); bundle grep test Phase 4 |
| Location privacy: no precise device location stored by default | ⬜ | Session-only coords; saved location opt-in in `user_event_discovery_preferences` |
| Provider disable never hides native events | ⬜ | Flags gate only provider ingestion/display |
| Terms re-verified against current official docs before Phase 4/7 | ⬜ | See `18_OFFICIAL_REFERENCES.md`; verify at implementation time (docs change) |

## Items requiring Tourify business/provider approval

1. Ticketmaster developer account + API key issuance.
2. Bandsintown partnership application (for `partner` mode) — until approved, production mode stays `disabled`/`artist_owned_key` only.
3. Legal review of attribution/display requirements for both providers.
