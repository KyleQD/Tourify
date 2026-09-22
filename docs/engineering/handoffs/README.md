# Handoffs

Use a handoff when ownership moves or a task crosses a domain boundary. The task record remains progress truth.

- `pending/`: receiver has not accepted context.
- `completed/`: receiver accepted and ownership is recorded.

A handoff identifies the working set, source SHA, dirty-state caveat, commands run, failures, and one next action.
