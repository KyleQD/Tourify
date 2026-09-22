# 04 - API Contracts

## Existing APIs

Reuse these before adding new routes:

- `GET/POST /api/admin/logistics/comms-thread`
- `GET/POST /api/groups/threads`
- `GET/POST /api/groups/threads/[id]/messages`
- `POST /api/groups/threads/[id]/messages/[messageId]/reactions`
- `GET/POST/PATCH /api/admin/events/[id]/communications`
- `GET/POST /api/admin/events/[id]/group-chats`
- `GET/POST /api/admin/events/[id]/task-messages`
- `GET/POST /api/events/[id]/tasks`
- `GET /api/messages/unified-list`
- `GET/POST /api/admin/logistics/comms-plans`

## New API Surface

`GET /api/admin/logistics/communications-command-center`

Query:

- `orgId` optional but acting context required by headers/session
- `tourId` optional
- `eventId` optional
- `limit` optional

Returns:

- `scope`
- `summary`
- `nativeThreads`
- `eventBulletins`
- `eventChannels`
- `taskLinks`
- `externalEvents`
- `migrationWarnings`

`POST /api/admin/logistics/communications-command-center/relays`

Creates a curated relay from a source native item or `communication_events` row.

`POST /api/admin/logistics/communications-command-center/tasks`

Creates a `workflow_tasks` or `logistics_tasks` row from a communication source.

`POST /api/admin/logistics/communications-command-center/acknowledgements`

Creates or updates acknowledgement rows. Prefer reusing/hardening `logistics_acknowledgements`.

`POST /api/admin/logistics/communications-command-center/sources/[provider]/webhook`

Provider-specific signed webhook entrypoints. Must validate signatures before any persistence.

## Error Shape

Use the existing admin route style:

```json
{
  "success": false,
  "error": "Human readable message",
  "code": "stable_code"
}
```

Optional tables not yet migrated should return a non-fatal `migrationWarnings` list for read endpoints.
