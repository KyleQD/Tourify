# Ticketing decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-001 — A type-drift cluster is re-derived from source before it is acted on, and the disposition is per object, not per cluster

- Date: 2026-09-25
- Status: accepted
- Task: TICKET-005 (Wave 35), DB-008 ticketing code-drift cluster
- Decision: The four objects the inventory assigns to the ticketing cluster are dispositioned **individually**, each on its own re-derived evidence, and the cluster is not treated as a unit. For each object the lane first establishes whether the relation or RPC exists in the **active** migration chain, then re-derives the live consumer set by resolving real import specifiers from Next entry points (CP-066/CP-073), and only then chooses repoint or delete. A cluster that resolves to "no file in my grant" is recorded as a handoff with the exact `file:line` and a proven recipe, **not** as completed work. A **scoped** `tsc` A/B (the drifted read restored, then removed) is used to prove a diagnostic was real before claiming a reduction, and the reduction is always labelled scoped.
- Evidence: The inventory's file-level attributions did not survive re-derivation, in **both** directions. `track_venue_profile_view` was attributed to `app/api/ticketing/webhook/route.ts`, which contains no reference to it anywhere in the tree; the single real caller is `app/api/venues/[id]/route.ts:109`, a venue-domain path. `ticket_notifications` was recorded as `consumerVerdict: "dead"` with `lib/services/ticketing.service.ts` as an "unreachable module", but that module **is** live — `app/tickets/purchase/page.tsx` → `components/ticketing/ticket-purchase-form.tsx:14` → `import { ticketingService } from '@/lib/services/ticketing.service'`; only the *method* `sendTicketNotification` is dead, with exactly one occurrence in the repository, its own definition. `get_enhanced_artist_stats` has **zero** code callers: all eight occurrences are comments, one non-migration SQL file, and an archived migration, and the artist lane already pins this with `__tests__/artist/db008-code-drift-repoints.test.ts:241`. `settlements` was the only object with a real in-grant diagnostic, confirmed by A/B: with the read restored, `app/api/ticketing/settlements/route.ts:83` reports TS2589 plus two TS2769 overload failures — `Argument of type '"settlements"' is not assignable to parameter of type '"ticket_types" | ... | "world_track_places"'` — and with the read removed the file is clean.
- Consequences: One object was fixed here, one is already disposed by another lane, and three are handed off with corrected evidence; the lane's honest cluster reduction is 4 of 22 attributed hits in a single file, not a cluster cleared. The `settlements` fix **deletes a read rather than repointing it**, because the active chain contains no settlement relation and no settlement RPC to repoint to — `rg` over `supabase/migrations/` for any `*settle*` table or function returns nothing, and the canonical ticketing settlement surface is the pair the endpoint already reads, the append-only `financial_transactions` ledger and the versioned `ticket_revenue_allocations` waterfall. That mattered because the dead read's error was fused into the endpoint's availability gate, so on **every** deployment built from the active chain `GET /api/ticketing/settlements` returned 503 `ticketing_unavailable` and the authoritative money numbers never reached its one live client. The response keeps a `settlement: null` / `settlement_available: false` pair so an absent record is never readable as a zero or as a served record, and the availability gate still covers the two authoritative reads — the gate was **narrowed to the authoritative sources, not weakened**, and no money figure is now served from an unauthenticated or unverified read. `lib/database.types.ts` and all `types/**` were not touched, and the absence of a `settlements` entry in the generated union is itself the proof that the relation is gone from the type surface.
