# TOUR-101 — Tour lifecycle state machine

## Acceptance criteria

States, transitions, required capabilities, blockers, side effects, cancellation/archive behavior, and invalid-transition errors are approved and tested.

## Canonical module

`lib/admin/tour-lifecycle.ts`

### States

`draft` → `planning` → `ready` → `published` → `active` → `completed` → `settled` → `archived`

Branch: `cancel` from draft…active → `cancelled` → `archive`

### Commands

| Command | From | To | Capability | Reason | Blockers |
|---------|------|----|------------|--------|----------|
| start_planning | draft | planning | tour.manage | | |
| mark_ready | planning | ready | tour.manage | | readiness.mandatory |
| publish | ready/published | published | tour.publish | | readiness.mandatory |
| retract | published | ready | tour.publish | required | |
| activate | published/ready | active | tour.manage | | |
| complete | active | completed | tour.manage | | stops.all_ended |
| settle | completed | settled | finance.approve | | finance.settlements_approved |
| cancel | draft…active | cancelled | tour.manage | required | |
| archive | completed/settled/cancelled | archived | tour.archive | | |
| restore | archived | completed | tour.archive | required | |

### Errors

Stable codes: `tour_transition_invalid_*`, `tour_transition_blocked`, `tour_transition_reason_required`, `capability_denied`, `tour_lifecycle_state_unknown`.

### Legacy map

`on_hold` → `planning`; `canceled` → `cancelled`; existing `planning`/`active`/`completed` retained.

### Next

TOUR-202 shipped `POST /api/admin/tours/:id/transitions/:command` (`tour-transition.service` + outbox).
