# Handoffs

Use a handoff when ownership moves or a task crosses a domain boundary. The task record remains progress truth.

- `pending/`: `pending` or `accepted` context with an accountable receiving task.
- `completed/`: `completed`, `rejected`, or `superseded` history.

A v2 handoff has exactly one recipient, a canonical status, a recipient-owned accepting task, and a concrete completion condition. Arrays, self-handoffs, missing owners, and free-form statuses are invalid. Split multi-recipient coordination into one handoff per receiver.

A handoff identifies the working set, source SHA, dirty-state caveat, commands run, failures, and one next action. It transfers ownership; it is not a second progress journal.
