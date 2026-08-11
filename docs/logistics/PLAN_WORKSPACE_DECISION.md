# Logistics Plan Workspace Decision

## Canonical sources

- `tours`, `tour_versions`, and `tour_stops` own tour identity, order, and schedule.
- Events, venues, workforce, files, and budgets retain ownership of their domain data.
- The logistics workspace is a projection over a tour. Its identifier is the canonical `tour_id`; it does not duplicate plans or stops.

## Logistics-owned state

- `logistics_plan_state` owns operational lifecycle and optimistic concurrency.
- `logistics_hydration_runs` records source synchronization attempts.
- `logistics_stop_overrides` records manual logistics decisions without modifying source scheduling data.
- `logistics_issues` materializes readiness findings for assignment and resolution.

## Lifecycle and rollout

- Operational lifecycle: `draft`, `active`, `ready`, `published`, `archived`.
- Source changes are hydrated only into synced fields. Overrides and confirmed records remain authoritative and produce review issues when source data changes.
- The workspace is protected by `admin_logistics_plan_workspace_v1`, disabled by default, and assigned per organization.
- Existing category-based logistics tabs remain the fallback throughout pilot rollout. Disabling the flag immediately hides the pilot workspace without changing records.
