# ADR-010 — Time and currency

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `03_Tour_Builder_Stops_Routing_and_Holds.md`, `10_Finance_Budgets_Expenses_and_Settlements.md`

## Context

Tours cross time zones and currencies. Silent local-time storage and floating FX create reconciliation failures.

## Decision

### Time

1. Persist instants in **UTC** (`timestamptz`).
2. Persist **IANA time zone** on stops/venues/events for display and local-day boundaries.
3. UI shows venue-local times; DST transitions and ambiguous/nonexistent local times use explicit picker rules (`ROUTE-303`, `REL-301`).
4. “Local day” filters use the stop/venue zone, not the browser zone, for operational lists.
5. Ambiguous fall-back times require an explicit earlier/later offset choice; nonexistent spring-forward times are rejected with a remediation prompt. Neither is silently shifted.

### Currency

1. Each tour has a **base currency**; org has a default reporting currency.
2. Money stored as integer **minor units** + ISO currency code.
3. FX: snapshot rate + source + timestamp on posting; no silent revaluation of historical postings.
4. Rounding: half-up to currency minor unit unless currency-specific rules say otherwise.
5. FX source: configurable provider with manual override (reason + capability); default manual/org table until provider adapter lands.
6. Currency codes are normalized to uppercase and validated against the supported ISO catalog at command boundaries. Unknown codes do not silently inherit a two-decimal exponent.
7. Reporting conversion that lacks a valid rate returns an unavailable/stale state with the original-currency amount; it never drops the line from totals or substitutes a zero.

## Consequences

- Route, travel, finance, and reporting share `REL-301` test library.
- Display helpers (`formatSafeDate`, `formatSafeCurrency`) must accept zone/currency context.
