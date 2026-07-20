# Logistics Data Model and Integrations

## Canonical boundaries

```text
Organization
  -> Tour -> Event/Tour Stop -> Venue
       -> ground_transportation_coordination -> transportation_passenger_assignments
       -> lodging_bookings / lodging_guest_assignments / hotel_room_assignments
       -> flight_coordination -> flight_passenger_assignments
       -> equipment_assets / equipment_catalog / equipment_reservations (additive)
       -> backline_requirements -> backline_fulfillments (additive)
       -> catering_services -> catering_headcount_snapshots (additive)
       -> team_communications / logistics_comms_plans (additive)
       -> site_maps -> map_versions (published snapshots)
       -> logistics_tasks (source-linked operational tasks)
```

## Existing tables (reuse)

| Domain | Tables | Migration |
|--------|--------|-----------|
| Tasks | `logistics_tasks`, `logistics_task_equipment`, `logistics_activity` | `20250813094500_*` |
| Travel | `travel_groups`, `travel_group_members`, `flight_*`, `ground_transportation_*`, `hotel_room_assignments`, `travel_coordination_timeline` | `20260413200100_*` |
| Lodging | `lodging_providers`, `lodging_room_types`, `lodging_bookings`, `lodging_guest_assignments`, … | same |
| Rentals | `rental_agreements`, `rental_agreement_items`, … | same |
| Vendors | `logistics_vendors` | `20260605100000_*` |
| Equipment | `equipment_assets`, `equipment_catalog` (dual history — prefer assets for instances) | entity + site-map migrations |
| Site map | `site_maps`, zones/elements/tents, `map_task_assignments`, `map_versions`, `site_map_share_tokens` | `20250131*` / `202605*` / `202607*` |
| Advancing | `advancing_documents` catering/backline notes | `20260602110000_*` |
| Comms | `team_communications` + logistics FKs | `20260630214500_*` |

## Additive tables (this program)

| Table | Purpose |
|-------|---------|
| `equipment_reservations` | Event/tour window allocations |
| `backline_requirements` | Artist/show requirements |
| `backline_fulfillments` | Exact source satisfying a requirement |
| `backline_substitution_approvals` | Substitution decisions |
| `catering_services` | Meal/service periods |
| `catering_headcount_snapshots` | Frozen headcount |
| `catering_dietary_summaries` | Privacy-safe kitchen counts |
| `logistics_comms_plans` | Versioned channel plans |
| `logistics_comms_channels` | Channels within a plan |
| `logistics_acknowledgements` | Critical-change / assignment ack |
| Columns on `logistics_tasks` | `source_type`, `source_id` if missing |

## Integration matrix

| Platform area | Reads | Writes/links | Status |
|---------------|-------|--------------|--------|
| Organizations/roles | org_members, scope helper | ownership | working |
| Tours/events | events_v2, tours | readiness flags | partial |
| Artists/bands | roster via travel groups | backline approvals | partial |
| Venues | venue_id on events | shared maps | partial |
| Jobs/employment | hiring assignments | eligibility | partial |
| Staff scheduling | call times (advancing) | conflict inputs | missing→partial |
| Vendors | logistics_vendors | quotes/orders | partial (UI mock) |
| Budgets | task budget fields | actuals | partial |
| Tasks | logistics_tasks, map tasks | source links | working→extend |
| Notes | site_map_activity_log, logistics_activity | audiences | partial |
| Files | private storage patterns | manifests | partial |
| Calendar | logistics_tasks only | travel/catering | missing→extend |
| Notifications | task triggers, map tasks | travel/comms/publish | partial |
| Messaging | task-link-registry | contextual | partial |

## Money / time

- Money: major-unit USD decimals; document in `lib/logistics/money.ts`
- Time: timestamptz + optional IANA timezone column; helpers in `lib/logistics/time.ts`
