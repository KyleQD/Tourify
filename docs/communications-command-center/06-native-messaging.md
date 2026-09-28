# 06 - Native Messaging

## Reuse Paths

Native messaging is already split across:

- direct DMs: `conversations` and `messages`;
- group/team threads: `group_threads`, `thread_members`, `group_messages`;
- event channels: `event_group_chats`, `event_group_messages`;
- announcements: `event_bulletins`;
- task messages: `event_task_messages`;
- work inbox: `app/api/messages/unified-list/route.ts`.

## Required Extensions

1. Add command-center read adapters that return native items in a common feed shape.
2. Add org/tour-level Logistics Comms summaries without forcing event selection.
3. Keep group thread creation membership-driven from assignments, not hard-coded departments.
4. Add acknowledgement/relay links by source pointer rather than copying whole message threads.

## Realtime

Full group thread UI subscribes to `group_messages` and reaction changes. Event group messages were added to `supabase_realtime` in `20260602150000_message_attachments_realtime.sql`. The first command-center shell may poll/load; realtime feed fan-in can be added after the read model is stable.
