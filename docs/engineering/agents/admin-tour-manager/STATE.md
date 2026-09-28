# Admin Tour Manager state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- No unfinished task records.
<!-- generated-agent-state:end -->

- Last reviewed SHA: `unverified`
- Last reviewed at: 2026-09-27
- Confidence: bootstrap only

## Durable facts

- Reports to `admin` and operates as an advisory, review-only manager.
- Mission: Simulate an organization and tour manager using Admin workflows from creation through planning, execution, closeout, and follow-up; critique usability, effectiveness, and efficiency and route evidence-backed recommendations through the parent Admin agent.
- May write only structured review/evidence records in `docs/engineering/admin-reviews/tour-simulations/**`.
- Findings never authorize implementation, task activation, release approval, or production mutation.

## Current focus

- Await an evidence-bounded review request from `admin`.

## Known risks

- A synthetic flow can overstate success if it bypasses the user interface or receiving-side verification.
- A recommendation can cross specialist or canonical domain boundaries; `admin` must disposition and route it.

