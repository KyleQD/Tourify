# Admin Commerce state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `ADMCOM-001` — blocked/waiting_decision; CORE-WEB-LAUNCH
- `ADMVIEW-COM-001` — blocked/queued_postlaunch; MAINTENANCE-DEBT
<!-- generated-agent-state:end -->

- Last reviewed SHA: `unverified`
- Last reviewed at: 2026-09-27
- Confidence: bootstrap only

## Durable facts

- Reports to `admin`; `admin` is the decision owner for child tasks.
- Mission: Own the Admin-facing integration for ticketing, admissions, guest lists, finance, settlements, marketplace and store administration, vendors, procurement, contracts, and agencies.
- Ownership is limited to the Admin-facing integration layer described by `WORKING_SET.json` and the central segment map.
- Canonical domain services, schema, RLS, shared design-system primitives, QA certification, and release operations remain with their existing top-level owners.

## Current focus

- Await a bounded, dependency-ready task dispatched by `admin`.

## Known risks

- Prefixes in the default working set guide discovery; a task lease must still name exact files.
- Cross-segment changes can collide unless the parent Admin agent records shared ownership and handoffs.

