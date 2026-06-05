# Admin API Reference

All routes under `/api/admin/**` require an authenticated admin session (cookie or Bearer token).  
Responses follow `{ data } | { error: string }` shape. Auth errors return HTTP 401.

---

## Events

| Method | URL | Params / Body | Response |
|--------|-----|--------------|---------|
| GET | `/api/admin/events` | `?status=` `?search=` `?page=` `?limit=` | `{ events[], total }` |
| GET | `/api/events/[id]` | — | `{ event }` |
| PATCH | `/api/events/[id]` | `{ title?, status?, ...fields }` | `{ event }` |
| POST | `/api/events/planner` | Planner step payload | `{ event_id, draft }` |
| POST | `/api/events/planner/publish` | Full planner payload | `{ event, event_id }` |
| GET | `/api/admin/events/[id]/analytics` | `?period=7d\|30d\|90d` | `{ stats }` |
| GET | `/api/admin/events/[id]/export` | — | CSV file download |

## Advancing & Day Sheets

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/events/[id]/advancing` | Fetch advancing document |
| POST | `/api/admin/events/[id]/advancing` | Save advancing document |
| GET | `/api/admin/events/[id]/day-sheet` | Fetch day sheet |
| POST | `/api/admin/events/[id]/day-sheet/distribute` | Email day sheet to participants |

## Tours

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/tours` | List all tours |
| GET | `/api/admin/tours/[id]/export` | Export tour summary |

## Ticketing

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/ticketing` | List ticket types for event |
| POST | `/api/ticketing` | Create ticket type |
| POST | `/api/ticketing/check-in` | `{ ticket_code }` — mark checked_in |
| POST | `/api/admin/ticketing/refund` | `{ purchase_id }` — issue refund |

## Finances

| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET | `/api/admin/finances` | `?event_id=` | List transactions + budget |
| POST | `/api/admin/finances` | `{ action: 'create_transaction', ...data }` | Create transaction |
| GET | `/api/admin/finances/settlements` | `?event_id=` | List settlements |
| POST | `/api/admin/finances/settlements` | `{ event_id, amount, ... }` | Create settlement |
| PATCH | `/api/admin/finances/settlements` | `{ id, status: 'paid' }` | Update settlement |

## Staff & Applications

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/staff` | List staff members |
| POST | `/api/admin/staff` | Add staff member |
| GET | `/api/admin/team-members` | List team members for event/tour |

## Communications

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/messages/list` | List all threads for admin |
| GET | `/api/messages` | Get messages for a thread |
| POST | `/api/messages` | Send message to thread |
| GET | `/api/admin/events/[id]/group-chats` | List event group chats |
| GET | `/api/admin/notifications` | List notifications for admin |

## Artists / Venues / Directory

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/artists` | `?search=` `?includeMetrics=true` |
| POST | `/api/admin/artists` | Create artist profile |
| GET | `/api/admin/artists/[id]` | Artist detail + events |
| PATCH | `/api/admin/artists/[id]` | Update artist |
| DELETE | `/api/admin/artists/[id]` | Delete artist |
| GET | `/api/admin/venues` | List venues |
| POST | `/api/admin/venues` | Create venue |
| GET | `/api/admin/venues/[id]` | Venue detail |
| PATCH | `/api/admin/venues/[id]` | Update venue |

## Content & Moderation

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/content/posts` | `?status=pending\|approved\|flagged` |
| GET | `/api/admin/content/music` | Music tracks with moderation status |
| PATCH | `/api/admin/content/[id]` | `{ moderation_status, is_visible }` |

## Analytics

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/analytics` | Dashboard stats |
| GET | `/api/admin/analytics/export` | `?from=&to=` → CSV download |
| GET | `/api/admin/analytics/top-performers` | Top artists + events |

## Feature Flags

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/features` | List all flags |
| POST | `/api/admin/features` | Create flag `{ key, name, enabled, rollout_percentage }` |
| PATCH | `/api/admin/features/[key]` | Update flag |
| DELETE | `/api/admin/features/[key]` | Delete flag |

## Audit Log

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/audit` | `?entity_type=&from=&to=&page=` — paginated log |

## Marketplace / Store

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/marketplace/orders` | List marketplace orders |
| GET | `/api/admin/store` | List store items |
| POST | `/api/admin/store` | Create store item |
