# Ticketing questions for the product owner — TICKET-001 audit

Prioritized. P1 items determine the next build/fix tasks; P2 are sequencing/scope decisions; P3 are hardening/detail. Each question states the decision needed (build / fix / drop), the evidence behind it, and why it matters.

## P1 — top 5

1. **False-zero fallbacks: build truthfulness into read surfaces now?**
   Decision: fix. Evidence: `app/admin/dashboard/ticketing/page.tsx` `mapApiSocialPerformanceToUi` (`?? 0`), `lib/ticketing/guest-list.ts` `EventTicketingWorkspaceDto.metrics` (`?? 0`), `ticketing-financials-step.tsx` — all coalesce missing data to zero, contradicting TIX-001's "Missing/denied/error is unavailable, never zero" and TIX-002's "no zero fallback". Question: should every ticketing read surface (admin, venue, artist, workspace) represent unavailable/denied/error explicitly with freshness metadata now, or is that scoped to the TIX-507 reporting read model? What should the API contract look like (`null` vs `{state:"unavailable"}`)?

2. **Settlement mutates active allocations — version now or wait for finance?**
   Decision: fix. Evidence: `app/api/ticketing/settlements/route.ts` + `lib/ticketing/settlements.ts` delete/reinsert `ticket_revenue_allocations`/allocation rows on each settle (TIX-002: "settlement currently mutates active allocations… delete/reinsert allocation behavior retires at TIX-513"). Since tour/intent shows this is auditable settlement input, not a transient cache: should we make settlement movements append-only/versioned (build TIX-513 handoff contract) before the finance agent defines the receiving table, or is the delete/reinsert acceptable until finance handoff exists?

3. **Admin endpoints referencing undeployed/incompatible tables — where is the object-creation migration?**
   Decision: fix (investigate first). Evidence: `.agents/organization-ticketing/INVENTORY.md` verified drift ("several Admin endpoints reference undeployed tables or incompatible columns"); `supabase/migrations/20260720020254_admin_ticketing_security.sql` is a marker-only migration asserting `get_admin_ticketing_overview(uuid,uuid)` exists, but the object-creation migration is not in the active chain. Question: is there an unreviewed migration (e.g., in another branch) that creates these objects, and are the routes currently failing in deployed environments? Should I reconcile queries against the active chain (fix) or is a pending migration expected (drop/wait)?

4. **Ticket purchase auth gated by `isTicketingV2Enabled()` — what is the GA contract?**
   Decision: fix/decide. Evidence: `lib/ticketing/feature-flag.ts` + `app/api/ticketing/enhanced/route.ts` — the same flag toggles purchase paths AND whether login is required at all (audit main-findings: "flag-dependent auth requirements"; H7 idempotency, C3/C4 fixes live in the same gated code). Question: is purchase always authenticated once the flag is `enforce`? What is the plan to flip the flag per-org with reconciliation evidence (TIX-601), and who owns the rollout?

5. **Promo/referral abuse control: canonical governance (build), tighter clamps (fix), or disable self-service (drop)?**
   Decision: choose one. Evidence: C4 fix clamped discounts to a hard-coded $10 server-side cap at creation AND application (`app/api/ticketing/enhanced/route.ts`); usage counters are best-effort on the free path (audit C4); live promo/campaign UI (`components/ticketing/campaign-manager.tsx`) reads legacy `ticket_campaigns`/`promo_codes`/`ticket_referrals`/`ticket_shares`. TIX-505 canonical campaigns are not built. Question: for GA, do we (a) build governed campaigns (budget/approval/limits/fraud), (b) ratchet caps with audit + per-user/per-event budgets on the legacy stack, or (c) disable self-service promo/referral creation until TIX-505?

## P2

6. **Purchase quantity >1 and availability** — `purchaseTicketSchema.quantity` exists but the audit noted effective lock to quantity 1 and advisory availability checks; `reserve_ticket_inventory` RPC exists but is not used consistently. Decision: fix via reservation ledger (WS-0.5/DB Q4) or defer to TIX-502 inventory ledger? What max-per-order should the canonical builder enforce (config already has `max_per_order`/`max_per_user`)?

7. **`verify` endpoint PII** — `app/api/ticketing/verify/route.ts` returns buyer email/phone/name for any `session_id` via service role (by design for post-checkout). Decision: keep for checkout UX (mitigate with short-lived signed token), move to authenticated `wallet` read, or both?

8. **`event_ticket_types` dormant compatibility table** — SEC-108 made it authenticated read-only; TIX-002 classifies it "inactive legacy compatibility" with no runtime consumer. Decision: confirm deployed row count + telemetry, then retire policy/table at TIX-603; or keep as history export?

9. **Check-in limiter degraded mode** — in-memory Map fallback is per-instance when Redis is absent (`app/api/ticketing/check-in/route.ts`); audit H9 called the in-process limiter "useless across serverless". Decision: is per-instance fallback acceptable documented degradation, or must scans fail closed (`RATE_LIMIT_ENFORCE`)? What is the enforced production threshold (env `RATE_LIMIT_ENFORCE=true`)?

10. **Capacity defaults during event creation** — TIX-105 (explicit setup or "not ticketed", no silent GA/VIP defaults) not landed; `event_ticketing_config` currently may carry defaults. Decision: remove defaults now (TIX-105) or with TIX-501 setup workspace?

## P3

11. **Credential format timeline** — opaque token QR (`lib/ticketing/credentials.ts`) pending TIX-508 signed/rotatable format. When must signature+rotation land relative to public GA? Should QR generation move server-side (WS-1.2) before or with signing?

12. **Unified guest list default-on** — `UNIFIED_GUEST_LIST_ENABLED !== 'false'` (`lib/ticketing/guest-list.ts`); legacy guestlist route still live. Is default-on safe for GA, and does the canonical path need reconciliation counts against the legacy path before retirement?

13. **Dual-read command blocking** — TIX-104 panel exists but commands are not yet blocked on mismatch; per-org `admin_ticketing_canonical_v1` persistence not wired. Should mismatch block commands (fail-closed) before cutover?

14. **Cron invite expiry coverage** — single cron route (`app/api/cron/ticket-invite-expiry/route.ts`); add resend/revoke/expiry loops + failure coverage, and confirm cron authorization contract shared with other agents.

15. **Marketing attribution migration** — `ticket_shares`/`ticket_referrals`/`ticket_analytics`/`social_media_performance` feed `analytics` read models; confirm they migrate to `ticket_analytics_events` before retirement (TIX-601) vs retained compatibility.

## Cross-agent topics (handoff candidates, not blockers)

- Settlement handoff contract (`financial_transactions`, versioned `TIX-513`) → finance agent.
- Venue door/device management (TIX-509) → venue agent (device registration/revocation UI).
- Admin stats/analytics/export replacements (REP-20x, `app/api/admin/dashboard/stats/route.ts` etc.) → admin/reporting agent.
- Artist redirect to store listings (`app/artist/tickets/page.tsx` → `/artist/store?tab=listings&type=ticket`) → artist/marketplace agent (confirms ticket listings are in scope there).