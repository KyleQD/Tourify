# Admin Feature Spec Builder — Inventory

Source of truth: [`docs/admin-feature-specs/`](../../docs/admin-feature-specs/).
Status lives in [PROGRESS.md](PROGRESS.md). Work **phase 0 → 6** (Master Roadmap dependency order), not filename order.

**Total IDs:** 362 (10 program ADRs + 352 implementation tasks)

Columns: ID · Doc · Title · Depends-on (short)

## Phase 0 — Decisions and safety harness

_34 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `ADR-001` | 00 | Acting account | — |
| `ADR-002` | 00 | Ownership | — |
| `ADR-003` | 00 | Capabilities | — |
| `ADR-004` | 00 | Canonical event/tour records | — |
| `ADR-005` | 00 | Publication | — |
| `ADR-006` | 00 | Readiness | — |
| `ADR-007` | 00 | Ticketing | — |
| `ADR-008` | 00 | Financial accounting boundary | — |
| `ADR-009` | 00 | Deletion/retention | — |
| `ADR-010` | 00 | Time/currency | — |
| `PLAN-001` | 03 | Approve stop/event identity ADR | — |
| `PLAN-002` | 03 | Inventory route JSON/settings | — |
| `PLAN-003` | 03 | Fix readiness contract decision | — |
| `PUB-001` | 04 | Approve publication ADR | — |
| `PUB-002` | 04 | Classify publishable fields | — |
| `TIX-001` | 09 | Approve canonical ticketing ADR | — |
| `TIX-002` | 09 | Inventory legacy/new data and consumers | — |
| `FIN-001` | 10 | Approve operational accounting ADR | — |
| `FIN-002` | 10 | Inventory deployed finance data/policies | — |
| `CONT-101` | 11 | Approve contract lifecycle/provider ADR | Phase 0 complete for domain |
| `SEC-001` | 01 | Inventory deployed database policies and grants | — |
| `SEC-002` | 01 | Approve acting-context ADR | — |
| `SEC-003` | 01 | Approve capability matrix | — |
| `SEC-004` | 01 | Create two-org security fixture | — |
| `SEC-005` | 01 | Establish migration safety process | — |
| `REL-001` | 14 | Pin and enforce runtime/toolchain | — |
| `REL-002` | 14 | Resolve dependency peer conflict | — |
| `REL-003` | 14 | Reproduce/fix production build cleanup failure | — |
| `REL-004` | 14 | Make production env validation intentional | — |
| `REL-005` | 14 | Resolve readiness test/product contract | — |
| `REL-006` | 14 | Create test-data factory | — |
| `REL-007` | 14 | Baseline lint and warning budget | — |
| `REL-008` | 14 | Establish feature-flag policy | — |
| `REP-001` | 13 | Create KPI catalog/template | — |

## Phase 1 — Tenant and API convergence

_66 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `REL-101` | 14 | Add database/RLS CI environment | Phase 0 complete for domain |
| `REL-102` | 14 | Add migration validation template/tooling | Phase 0 complete for domain |
| `REL-103` | 14 | Add API authorization contract harness | Phase 0 complete for domain |
| `REL-104` | 14 | Add secret/dependency/static scans | Phase 0 complete for domain |
| `SEC-101` | 01 | Implement signed acting context | ADR-001, SEC-002 |
| `SEC-102` | 01 | Implement capability service | ADR-003, SEC-003 |
| `SEC-103` | 01 | Create route/command wrappers | Phase 0 complete for domain |
| `SEC-104` | 01 | Migrate existing Admin endpoints | Phase 0 complete for domain |
| `SEC-105` | 01 | Add/backfill tenant keys | Phase 0 complete for domain |
| `SEC-106` | 01 | Replace finance RLS | Phase 0 complete for domain |
| `SEC-107` | 01 | Replace logistics RLS | Phase 0 complete for domain |
| `SEC-108` | 01 | Replace legacy ticketing RLS | Phase 0 complete for domain |
| `SEC-109` | 01 | Constrain service-role use | Phase 0 complete for domain |
| `SEC-110` | 01 | Add organization predicates to mutations | Phase 0 complete for domain |
| `SEC-111` | 01 | Implement immutable security audit | Phase 0 complete for domain |
| `SEC-112` | 01 | Add authorization contract tests | Phase 0 complete for domain |
| `TOUR-101` | 02 | Define lifecycle state machine | Phase 0 complete for domain |
| `TOUR-102` | 02 | Build canonical tour access service | Phase 0 complete for domain |
| `TOUR-103` | 02 | Inventory and classify legacy routes | Phase 0 complete for domain |
| `TOUR-104` | 02 | Build portfolio query contract | Phase 0 complete for domain |
| `TOUR-105` | 02 | Add explicit error/degraded states | Phase 0 complete for domain |
| `TOUR-106` | 02 | Instrument tour access and latency | Phase 0 complete for domain |
| `PLAN-101` | 03 | Build canonical plan read/write service | Phase 0 complete for domain |
| `PLAN-102` | 03 | Add optimistic plan version | Phase 0 complete for domain |
| `PLAN-103` | 03 | Add exact stop reconciliation | Phase 0 complete for domain |
| `PLAN-104` | 03 | Add reconciliation preview | Phase 0 complete for domain |
| `PLAN-105` | 03 | Remove implicit operational seeding | Phase 0 complete for domain |
| `PUB-101` | 04 | Create outbox infrastructure | ADR-005, PUB-001 |
| `PUB-102` | 04 | Create publication schema | Phase 0 complete for domain |
| `PUB-103` | 04 | Build channel adapter contract | Phase 0 complete for domain |
| `EVENT-101` | 05 | Converge event access and APIs | Phase 0 complete for domain |
| `EVENT-102` | 05 | Normalize event setup fields | Phase 0 complete for domain |
| `EVENT-103` | 05 | Replace best-effort seeds | Phase 0 complete for domain |
| `EVENT-104` | 05 | Add event version/conflict handling | Phase 0 complete for domain |
| `WORK-101` | 06 | Map existing person/assignment records | Phase 0 complete for domain |
| `WORK-102` | 06 | Add organization and assignment authority | Phase 0 complete for domain |
| `WORK-103` | 06 | Create canonical assignment service | Phase 0 complete for domain |
| `WORK-104` | 06 | Remove demo availability/templates from live mode | Phase 0 complete for domain |
| `WORK-105` | 06 | Add identity merge/reconciliation | Phase 0 complete for domain |
| `TRAVEL-101` | 07 | Add/backfill non-null organization keys | Phase 0 complete for domain |
| `TRAVEL-102` | 07 | Replace permissive RLS | Phase 0 complete for domain |
| `TRAVEL-103` | 07 | Replace arbitrary CRUD payloads | Phase 0 complete for domain |
| `TRAVEL-104` | 07 | Correct coordination language/state | Phase 0 complete for domain |
| `LOG-101` | 08 | Add/verify org scope across logistics | Phase 0 complete for domain |
| `LOG-102` | 08 | Define task taxonomy and authority | Phase 0 complete for domain |
| `LOG-103` | 08 | Build canonical logistics command service | Phase 0 complete for domain |
| `LOG-104` | 08 | Add tour-first scope/navigation | Phase 0 complete for domain |
| `MAP-101` | 08 | Add organization inheritance to maps | Phase 0 complete for domain |
| `TIX-101` | 09 | Drop permissive legacy policies | Phase 0 complete for domain |
| `TIX-102` | 09 | Harden new ticketing RLS/functions | Phase 0 complete for domain |
| `TIX-103` | 09 | Add canonical service/command layer | Phase 0 complete for domain |
| `TIX-104` | 09 | Feature-flag Admin read model | Phase 0 complete for domain |
| `TIX-105` | 09 | Remove default capacities | Phase 0 complete for domain |
| `FIN-101` | 10 | Add/backfill validated organization scope | Phase 0 complete for domain |
| `FIN-102` | 10 | Replace blanket RLS | Phase 0 complete for domain |
| `FIN-103` | 10 | Harden finance commands | Phase 0 complete for domain |
| `FIN-104` | 10 | Remove raw UUID entry UX | Phase 0 complete for domain |
| `FIN-105` | 10 | Establish financial audit/reversal rules | Phase 0 complete for domain |
| `VEND-101` | 11 | Migrate vendor/team/job routes to canonical tour access | Phase 0 complete for domain |
| `VEND-102` | 11 | Define vendor identity/deduplication | Phase 0 complete for domain |
| `VEND-103` | 11 | Add protected vendor-data policy | Phase 0 complete for domain |
| `CAL-101` | 12 | Reconcile source schemas | Phase 0 complete for domain |
| `CAL-102` | 12 | Enforce acting context and visibility | Phase 0 complete for domain |
| `CAL-103` | 12 | Remove direct heterogeneous inserts | Phase 0 complete for domain |
| `COMMS-101` | 12 | Inventory notification/message paths | Phase 0 complete for domain |
| `REP-101` | 13 | Inventory reporting consumers | Phase 0 complete for domain |

## Phase 2 — Authoritative planning and publication

_38 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `SEC-201` | 01 | Retire owner-only tour authorization | Phase 1 complete for domain |
| `SEC-202` | 01 | Introduce state-aware authorization | Phase 1 complete for domain |
| `SEC-203` | 01 | Add field-level protected-data policy | Phase 1 complete for domain |
| `SEC-204` | 01 | Add delegated/external access model | Phase 1 complete for domain |
| `SEC-205` | 01 | Enforce capability-aware UI | Phase 1 complete for domain |
| `TOUR-201` | 02 | Implement version-aware metadata edits | Phase 1 complete for domain |
| `TOUR-202` | 02 | Implement transition commands | Phase 1 complete for domain |
| `TOUR-203` | 02 | Build command-center summary BFF | Phase 1 complete for domain |
| `TOUR-204` | 02 | Split command-center route bundles | Phase 1 complete for domain |
| `TOUR-205` | 02 | Create deep-duplicate preview | Phase 1 complete for domain |
| `TOUR-206` | 02 | Execute idempotent duplication job | Phase 1 complete for domain |
| `TOUR-207` | 02 | Implement archive/restore | Phase 1 complete for domain |
| `TOUR-208` | 02 | Implement safe draft deletion | Phase 1 complete for domain |
| `TOUR-209` | 02 | Add tags, owners, and organization saved views | Phase 1 complete for domain |
| `TOUR-210` | 02 | Add bulk command preview/execution | Phase 1 complete for domain |
| `PLAN-201` | 03 | Create `tour_versions` and `tour_stops` | PLAN-001, PLAN-101 |
| `PLAN-202` | 03 | Build stop editor | Phase 1 complete for domain |
| `PLAN-203` | 03 | Build reorder/timeline interaction | Phase 1 complete for domain |
| `PLAN-204` | 03 | Implement stop protection rules | Phase 1 complete for domain |
| `PLAN-205` | 03 | Implement holds/options | Phase 1 complete for domain |
| `PLAN-206` | 03 | Add server readiness engine | Phase 1 complete for domain |
| `PLAN-207` | 03 | Add change sets and diff | Phase 1 complete for domain |
| `PLAN-208` | 03 | Add selectable deep-copy support | Phase 1 complete for domain |
| `PUB-201` | 04 | Enforce server readiness in publish command | Phase 1 complete for domain |
| `PUB-202` | 04 | Build snapshot renderer | Phase 1 complete for domain |
| `PUB-203` | 04 | Build audience preview | Phase 1 complete for domain |
| `PUB-204` | 04 | Implement transactional publish | PUB-101, PUB-102, PUB-201 |
| `PUB-205` | 04 | Implement delivery dashboard | Phase 1 complete for domain |
| `PUB-206` | 04 | Implement secure share links | Phase 1 complete for domain |
| `PUB-207` | 04 | Implement retract/supersede | Phase 1 complete for domain |
| `PUB-208` | 04 | Replace private URL copy | Phase 1 complete for domain |
| `EVENT-201` | 05 | Unify readiness rules | Phase 1 complete for domain |
| `EVENT-202` | 05 | Add event setup completeness view | Phase 1 complete for domain |
| `REP-201` | 13 | Build command-center summary contract | Phase 1 complete for domain |
| `REP-202` | 13 | Implement event-driven read-model updates | Phase 1 complete for domain |
| `REP-203` | 13 | Add protected aggregate policy | Phase 1 complete for domain |
| `REL-201` | 14 | Add transaction/outbox fault tests | Phase 1 complete for domain |
| `REL-202` | 14 | Add concurrency/idempotency suite | Phase 1 complete for domain |

## Phase 3 — Structured routing and logistics

_56 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `ROUTE-301` | 03 | Create normalized route legs | PLAN-201 |
| `ROUTE-302` | 03 | Implement provider abstraction | Phase 2 complete for domain |
| `ROUTE-303` | 03 | Add time-zone and DST handling | Phase 2 complete for domain |
| `ROUTE-304` | 03 | Add route constraint engine | Phase 2 complete for domain |
| `ROUTE-305` | 03 | Add driver/rest policy profiles | Phase 2 complete for domain |
| `ROUTE-306` | 03 | Add travel/rest-day generation | Phase 2 complete for domain |
| `ROUTE-307` | 03 | Build scenario workspace | Phase 2 complete for domain |
| `ROUTE-308` | 03 | Add route visualization | Phase 2 complete for domain |
| `ROUTE-309` | 03 | Connect route legs to logistics | Phase 2 complete for domain |
| `TOUR-301` | 02 | Define health/risk aggregation | Phase 2 complete for domain |
| `TOUR-302` | 02 | Integrate route/logistics health | Phase 2 complete for domain |
| `TRAVEL-301` | 07 | Connect party manifest to route legs | ROUTE-301, WORK-401, TRAVEL-101 |
| `TRAVEL-302` | 07 | Build travel-segment commands | Phase 2 complete for domain |
| `TRAVEL-303` | 07 | Build passenger assignment workflow | Phase 2 complete for domain |
| `TRAVEL-304` | 07 | Build itinerary timeline | Phase 2 complete for domain |
| `TRAVEL-305` | 07 | Add change impact engine | Phase 2 complete for domain |
| `TRAVEL-306` | 07 | Publish traveler-specific itinerary | Phase 2 complete for domain |
| `TRANS-301` | 07 | Create vehicle master and capacity | Phase 2 complete for domain |
| `TRANS-302` | 07 | Create vehicle movements | Phase 2 complete for domain |
| `TRANS-303` | 07 | Add seat/berth assignment | Phase 2 complete for domain |
| `TRANS-304` | 07 | Add driver assignment/rest checks | Phase 2 complete for domain |
| `TRANS-305` | 07 | Add pickup/dropoff operations | Phase 2 complete for domain |
| `TRANS-306` | 07 | Track actual mileage/cost/issue | Phase 2 complete for domain |
| `LODGE-301` | 07 | Build lodging block workflow | Phase 2 complete for domain |
| `LODGE-302` | 07 | Build nightly inventory matrix | Phase 2 complete for domain |
| `LODGE-303` | 07 | Build rooming-list assignment | Phase 2 complete for domain |
| `LODGE-304` | 07 | Add occupancy/capacity validation | Phase 2 complete for domain |
| `LODGE-305` | 07 | Add confirmation/deadline workflow | Phase 2 complete for domain |
| `LODGE-306` | 07 | Add payment/incidentals policy | Phase 2 complete for domain |
| `LODGE-307` | 07 | Publish lodging projections | Phase 2 complete for domain |
| `LOG-301` | 08 | Upgrade task dependencies/checklists | Phase 2 complete for domain |
| `LOG-302` | 08 | Build tour logistics board | Phase 2 complete for domain |
| `EQUIP-301` | 08 | Create organization equipment catalog | Phase 2 complete for domain |
| `EQUIP-302` | 08 | Build cases/kits and manifest versions | Phase 2 complete for domain |
| `EQUIP-303` | 08 | Connect equipment to route movements | Phase 2 complete for domain |
| `EQUIP-304` | 08 | Implement scan/custody workflow | Phase 2 complete for domain |
| `EQUIP-305` | 08 | Add load-in/load-out checklists | Phase 2 complete for domain |
| `EQUIP-306` | 08 | Add damage/loss/service workflow | Phase 2 complete for domain |
| `RENT-301` | 08 | Normalize rental agreements | Phase 2 complete for domain |
| `RENT-302` | 08 | Add rental conflict/return alerts | Phase 2 complete for domain |
| `CATER-301` | 08 | Normalize hospitality requirements | Phase 2 complete for domain |
| `CATER-302` | 08 | Build meal-service planner | Phase 2 complete for domain |
| `CATER-303` | 08 | Generate privacy-safe headcounts | Phase 2 complete for domain |
| `CATER-304` | 08 | Add menu/delivery approval | Phase 2 complete for domain |
| `CATER-305` | 08 | Build hospitality delivery checklist | Phase 2 complete for domain |
| `CATER-306` | 08 | Publish crew/vendor views | Phase 2 complete for domain |
| `MAP-301` | 08 | Add map versions and lifecycle | Phase 2 complete for domain |
| `MAP-302` | 08 | Link operational objects | Phase 2 complete for domain |
| `MAP-303` | 08 | Harden file/token access | Phase 2 complete for domain |
| `MAP-304` | 08 | Add review/approval workflow | Phase 2 complete for domain |
| `MAP-305` | 08 | Publish map projections | Phase 2 complete for domain |
| `PUB-301` | 04 | Create composable tour-book sections | Phase 2 complete for domain |
| `PUB-302` | 04 | Add recipient-specific projections | Phase 2 complete for domain |
| `PUB-303` | 04 | Add mobile/offline package | Phase 2 complete for domain |
| `REP-301` | 13 | Route/logistics dashboard | Phase 2 complete for domain |
| `REL-301` | 14 | Add time/currency/location test library | Phase 2 complete for domain |

## Phase 4 — Workforce, advancing, and live operations

_58 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `WORK-401` | 06 | Create tour party model | WORK-103 |
| `WORK-402` | 06 | Build tour-wide staffing matrix | Phase 3 complete for domain |
| `WORK-403` | 06 | Add role/headcount templates | Phase 3 complete for domain |
| `WORK-404` | 06 | Add availability and time-off | Phase 3 complete for domain |
| `WORK-405` | 06 | Add skills and credentials | Phase 3 complete for domain |
| `WORK-406` | 06 | Add labor/rest rule profiles | Phase 3 complete for domain |
| `WORK-407` | 06 | Add schedule templates | Phase 3 complete for domain |
| `WORK-408` | 06 | Generate shifts transactionally | Phase 3 complete for domain |
| `WORK-409` | 06 | Add assignment workflow | Phase 3 complete for domain |
| `WORK-410` | 06 | Add conflict resolution UI | Phase 3 complete for domain |
| `WORK-411` | 06 | Add labor cost forecast | Phase 3 complete for domain |
| `WORK-412` | 06 | Publish schedules through publication service | Phase 3 complete for domain |
| `HIRE-401` | 06 | Standardize requisition workflow | Phase 3 complete for domain |
| `HIRE-402` | 06 | Harden application pipeline | Phase 3 complete for domain |
| `HIRE-403` | 06 | Build offer/engagement handoff | Phase 3 complete for domain |
| `HIRE-404` | 06 | Version onboarding templates | Phase 3 complete for domain |
| `HIRE-405` | 06 | Track onboarding dependencies | Phase 3 complete for domain |
| `HIRE-406` | 06 | Convert without duplicate identity | Phase 3 complete for domain |
| `ADV-401` | 05 | Create versioned organization templates | Phase 3 complete for domain |
| `ADV-402` | 05 | Build tour-wide advance matrix | Phase 3 complete for domain |
| `ADV-403` | 05 | Add secure external request flow | Phase 3 complete for domain |
| `ADV-404` | 05 | Add typed response and file validation | Phase 3 complete for domain |
| `ADV-405` | 05 | Add section ownership and approval | Phase 3 complete for domain |
| `ADV-406` | 05 | Add reminder/escalation policy | Phase 3 complete for domain |
| `ADV-407` | 05 | Add tour-standard variance detection | Phase 3 complete for domain |
| `ADV-408` | 05 | Freeze/export approved advance | Phase 3 complete for domain |
| `LIVE-401` | 05 | Create versioned run-of-show timeline | Phase 3 complete for domain |
| `LIVE-402` | 05 | Add timeline validation | Phase 3 complete for domain |
| `LIVE-403` | 05 | Build day-sheet composer | Phase 3 complete for domain |
| `LIVE-404` | 05 | Publish recipient-specific day sheets | Phase 3 complete for domain |
| `LIVE-405` | 05 | Add day-sheet correction workflow | Phase 3 complete for domain |
| `LIVE-406` | 05 | Establish scoped realtime channel | Phase 3 complete for domain |
| `LIVE-407` | 05 | Unify live tasks | Phase 3 complete for domain |
| `LIVE-408` | 05 | Implement incident workflow | Phase 3 complete for domain |
| `LIVE-409` | 05 | Harden check-in | Phase 3 complete for domain |
| `LIVE-410` | 05 | Capture planned versus actual | Phase 3 complete for domain |
| `LIVE-411` | 05 | Create event closeout | Phase 3 complete for domain |
| `PLAN-401` | 03 | Add section ownership/approvals | Phase 3 complete for domain |
| `PLAN-402` | 03 | Add presence and conflict-safe collaboration | Phase 3 complete for domain |
| `PUB-401` | 04 | Unify Work Mode assignments | Phase 3 complete for domain |
| `PUB-402` | 04 | Add acknowledgement workflows | Phase 3 complete for domain |
| `PUB-403` | 04 | Add structured change notices | Phase 3 complete for domain |
| `PUB-404` | 04 | Add emergency broadcast | Phase 3 complete for domain |
| `CAL-401` | 12 | Build canonical calendar read model | Phase 3 complete for domain |
| `CAL-402` | 12 | Add calendar views and filters | Phase 3 complete for domain |
| `CAL-403` | 12 | Add conflict overlays | Phase 3 complete for domain |
| `CAL-404` | 12 | Add drag/edit command preview | Phase 3 complete for domain |
| `CAL-405` | 12 | Implement ICS snapshot/export | Phase 3 complete for domain |
| `CAL-406` | 12 | Implement subscription feeds | Phase 3 complete for domain |
| `COMMS-401` | 12 | Define channel/audience model | Phase 3 complete for domain |
| `COMMS-402` | 12 | Build unified inbox read model | Phase 3 complete for domain |
| `COMMS-403` | 12 | Route domain notifications through outbox | Phase 3 complete for domain |
| `COMMS-404` | 12 | Add preferences and quiet hours | Phase 3 complete for domain |
| `COMMS-405` | 12 | Add escalation/acknowledgement | Phase 3 complete for domain |
| `COMMS-406` | 12 | Secure attachments and links | Phase 3 complete for domain |
| `TOUR-401` | 02 | Integrate workforce/advance/live health | Phase 3 complete for domain |
| `REP-401` | 13 | Workforce/advance/live dashboard | Phase 3 complete for domain |
| `REL-401` | 14 | Add offline/realtime suite | Phase 3 complete for domain |

## Phase 5 — Commercial operations

_51 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `TIX-501` | 09 | Build event ticketing setup | TIX-101, TIX-102, TIX-103 |
| `TIX-502` | 09 | Implement inventory ledger | Phase 4 complete for domain |
| `TIX-503` | 09 | Build allocations/holds matrix | Phase 4 complete for domain |
| `TIX-504` | 09 | Build comp/guest approval | Phase 4 complete for domain |
| `TIX-505` | 09 | Rebuild campaigns/promos | Phase 4 complete for domain |
| `TIX-506` | 09 | Add order/ticket operations | Phase 4 complete for domain |
| `TIX-507` | 09 | Add tour ticketing workspace | Phase 4 complete for domain |
| `TIX-508` | 09 | Harden credential generation | Phase 4 complete for domain |
| `TIX-509` | 09 | Build scanner/device management | Phase 4 complete for domain |
| `TIX-510` | 09 | Add offline scanning | Phase 4 complete for domain |
| `TIX-511` | 09 | Build admissions dashboard | Phase 4 complete for domain |
| `TIX-512` | 09 | Build provider adapter/webhook boundary | Phase 4 complete for domain |
| `TIX-513` | 09 | Add ticket settlement handoff | Phase 4 complete for domain |
| `FIN-501` | 10 | Create category/department hierarchy | FIN-101, FIN-102, FIN-103 |
| `FIN-502` | 10 | Build budget templates/versions | Phase 4 complete for domain |
| `FIN-503` | 10 | Build budget-line editor | Phase 4 complete for domain |
| `FIN-504` | 10 | Add commitment/actual rollups | Phase 4 complete for domain |
| `FIN-505` | 10 | Add approval policy engine | Phase 4 complete for domain |
| `FIN-506` | 10 | Build purchase request/PO/change order | Phase 4 complete for domain |
| `FIN-507` | 10 | Build invoice match/status | Phase 4 complete for domain |
| `FIN-508` | 10 | Build expense/receipt workflow | Phase 4 complete for domain |
| `FIN-509` | 10 | Build cash-advance workflow | Phase 4 complete for domain |
| `FIN-510` | 10 | Build per-diem policy/entitlement | Phase 4 complete for domain |
| `FIN-511` | 10 | Add multi-currency/FX service | Phase 4 complete for domain |
| `SETTLE-501` | 10 | Define deal templates/formulas | Phase 4 complete for domain |
| `SETTLE-502` | 10 | Build settlement statement workspace | Phase 4 complete for domain |
| `SETTLE-503` | 10 | Add settlement approval/signoff | Phase 4 complete for domain |
| `SETTLE-504` | 10 | Add tour closeout/profitability | Phase 4 complete for domain |
| `VEND-501` | 11 | Build vendor master | Phase 4 complete for domain |
| `VEND-502` | 11 | Build compliance document workflow | Phase 4 complete for domain |
| `VEND-503` | 11 | Build requirement/engagement workflow | Phase 4 complete for domain |
| `VEND-504` | 11 | Build RFP/invitation flow | Phase 4 complete for domain |
| `VEND-505` | 11 | Build quote submission/versioning | Phase 4 complete for domain |
| `VEND-506` | 11 | Build quote comparison/decision | Phase 4 complete for domain |
| `VEND-507` | 11 | Create vendor performance closeout | Phase 4 complete for domain |
| `CONT-501` | 11 | Build versioned template library | Phase 4 complete for domain |
| `CONT-502` | 11 | Build contract draft workspace | Phase 4 complete for domain |
| `CONT-503` | 11 | Add internal review/approval | Phase 4 complete for domain |
| `CONT-504` | 11 | Add counterparty negotiation versions | Phase 4 complete for domain |
| `CONT-505` | 11 | Build signature adapter | Phase 4 complete for domain |
| `CONT-506` | 11 | Add amendment/termination/renewal | Phase 4 complete for domain |
| `CONT-507` | 11 | Build obligation tracker | Phase 4 complete for domain |
| `CONT-508` | 11 | Connect contract to PO/invoice/settlement | Phase 4 complete for domain |
| `TRAVEL-501` | 07 | Add provider adapter boundary | Phase 4 complete for domain |
| `TRAVEL-502` | 07 | Add document storage | Phase 4 complete for domain |
| `TOUR-501` | 02 | Integrate commercial closeout | Phase 4 complete for domain |
| `TOUR-502` | 02 | Add cancellation impact workflow | Phase 4 complete for domain |
| `REP-501` | 13 | Ticketing dashboard | Phase 4 complete for domain |
| `REP-502` | 13 | Finance/profitability dashboard | Phase 4 complete for domain |
| `REP-503` | 13 | Vendor/contract dashboard | Phase 4 complete for domain |
| `REL-501` | 14 | Add provider contract sandboxes | Phase 4 complete for domain |

## Phase 6 — Reporting and production hardening

_59 tasks_

| ID | Doc | Title | Depends-on |
|----|-----|-------|------------|
| `REP-601` | 13 | Add reporting freshness/reconciliation UI | Phase 5 complete for domain |
| `REP-602` | 13 | Add data-quality monitors | Phase 5 complete for domain |
| `REP-603` | 13 | Establish performance budgets | Phase 5 complete for domain |
| `REP-604` | 13 | Retire duplicated client aggregation | Phase 5 complete for domain |
| `EXP-601` | 13 | Build export job service | Phase 5 complete for domain |
| `EXP-602` | 13 | Version CSV/XLSX schemas | Phase 5 complete for domain |
| `EXP-603` | 13 | Build web/PDF tour book | Phase 5 complete for domain |
| `EXP-604` | 13 | Harden ICS/feed exports | Phase 5 complete for domain |
| `TOUR-601` | 02 | Materialize/cache summary read model | Phase 5 complete for domain |
| `TOUR-602` | 02 | Establish portfolio performance budget | Phase 5 complete for domain |
| `TOUR-603` | 02 | Complete lifecycle E2E suite | Phase 5 complete for domain |
| `TOUR-604` | 02 | Retire legacy tour UI/API paths | Phase 5 complete for domain |
| `PLAN-602` | 03 | Complete migration reconciliation | Phase 5 complete for domain |
| `PLAN-603` | 03 | Retire old planner components/write paths | Phase 5 complete for domain |
| `ROUTE-601` | 03 | Add route metrics and alerting | Phase 5 complete for domain |
| `PUB-601` | 04 | Publication SLO dashboard | Phase 5 complete for domain |
| `PUB-602` | 04 | Failure-injection tests | Phase 5 complete for domain |
| `PUB-603` | 04 | Token/security review | Phase 5 complete for domain |
| `PUB-604` | 04 | Retire legacy Work Mode fanout | Phase 5 complete for domain |
| `LIVE-601` | 05 | Add operational observability | Phase 5 complete for domain |
| `WORK-601` | 06 | Capture attendance and actual time | Phase 5 complete for domain |
| `WORK-602` | 06 | Add payroll/time export | Phase 5 complete for domain |
| `WORK-603` | 06 | Workforce SLO/alerts | Phase 5 complete for domain |
| `WORK-604` | 06 | Complete migration and retire duplicates | Phase 5 complete for domain |
| `TRAVEL-601` | 07 | Add logistics SLO/alerts | Phase 5 complete for domain |
| `TRAVEL-602` | 07 | Complete migration/reconciliation | Phase 5 complete for domain |
| `LOG-601` | 08 | Replace weak logistics metrics | Phase 5 complete for domain |
| `LOG-602` | 08 | Add operational alerts | Phase 5 complete for domain |
| `LOG-603` | 08 | Complete migration/retirement | Phase 5 complete for domain |
| `TIX-601` | 09 | Migrate/reconcile legacy data | Phase 5 complete for domain |
| `TIX-602` | 09 | Ticketing security/load review | Phase 5 complete for domain |
| `TIX-603` | 09 | Retire old routes/tables/policies | Phase 5 complete for domain |
| `FIN-601` | 10 | Create reconciliation jobs/dashboard | Phase 5 complete for domain |
| `FIN-602` | 10 | Add accounting export adapter | Phase 5 complete for domain |
| `FIN-603` | 10 | Finance observability | Phase 5 complete for domain |
| `FIN-604` | 10 | Migrate/retire legacy finance paths | Phase 5 complete for domain |
| `VEND-601` | 11 | Vendor/contract observability | Phase 5 complete for domain |
| `CONT-601` | 11 | Document security review | Phase 5 complete for domain |
| `CONT-602` | 11 | Migration and contract-shell cutover | Phase 5 complete for domain |
| `CAL-601` | 12 | Add calendar freshness/SLO monitoring | Phase 5 complete for domain |
| `COMMS-601` | 12 | Add delivery observability | Phase 5 complete for domain |
| `COMMS-602` | 12 | Test notification fatigue rules | Phase 5 complete for domain |
| `COMMS-603` | 12 | Retire duplicate delivery paths | Phase 5 complete for domain |
| `SEC-601` | 01 | Automated RLS matrix in CI | Phase 5 complete for domain |
| `SEC-602` | 01 | Authorization observability | Phase 5 complete for domain |
| `SEC-603` | 01 | Security review and penetration test | Phase 5 complete for domain |
| `SEC-604` | 01 | Access review workflow | Phase 5 complete for domain |
| `SEC-605` | 01 | Data-retention controls | Phase 5 complete for domain |
| `REL-601` | 14 | Set performance budgets | Phase 5 complete for domain |
| `REL-602` | 14 | Refactor high-fanout pages | Phase 5 complete for domain |
| `REL-603` | 14 | Complete WCAG 2.2 AA review | Phase 5 complete for domain |
| `REL-604` | 14 | Create production dashboards/alerts | Phase 5 complete for domain |
| `REL-605` | 14 | Exercise backup/restore | Phase 5 complete for domain |
| `REL-606` | 14 | Exercise migration rollback/forward-fix | Phase 5 complete for domain |
| `REL-607` | 14 | Perform security review/penetration test | Phase 5 complete for domain |
| `REL-608` | 14 | Run load/soak/fault tests | Phase 5 complete for domain |
| `REL-609` | 14 | Produce operational runbooks | Phase 5 complete for domain |
| `REL-610` | 14 | Pilot and GA checklist | Phase 5 complete for domain |
| `REL-611` | 14 | Delete dead/legacy code | Phase 5 complete for domain |

## Hard gates

1. No domain production writes before Phase 1 tenant keys + capability wrappers for that domain.
2. No publish/ack/day-sheet/schedule/itinerary delivery before `PUB-101` / `PUB-102` / `PUB-204`.
3. No travel passenger / equipment movement writes before `PLAN-201` + `ROUTE-301` + `WORK-401` (as applicable).
4. No commercial UI rollout before `TIX-10x` / `FIN-10x` RLS hardening.
5. No `*-60x` retirement until reconciliation evidence + `REL-610` criteria are met (or explicitly `blocked`).

