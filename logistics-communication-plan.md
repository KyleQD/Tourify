# Logistics Communication Tab — Event Owner Broadcast & Team Thread Enhancement

## Top-Level Overview

The `/admin/dashboard/logistics?tab=communication` page has a working `LogisticsCollaboration` component that posts to `team_communications`. The new requirement significantly expands the scope:

**What we're building:**
1. When an event owner posts an announcement from the logistics communication tab, a **group thread** is auto-created (or retrieved) in the `group_threads` system, linked to the event via `context_type = 'logistics'` and `context_id = eventId`.
2. All team members assigned to the event/tour are automatically added as `thread_members`.
3. The group thread appears in **every team member's inbox under the Work tab** at `/messages?tab=work`.
4. The thread is a **full two-way chat** — all members can reply using the existing `/groups/[id]` interface.
5. Messages support **emoji reactions/likes** (requires new `group_message_reactions` table and migration).
6. The logistics communication tab shows a live preview of the thread with an "Open full chat" link to `/groups/[id]`.

**Key Architecture Decision:**
Rather than building a parallel messaging system inside the logistics admin page, we wire into the existing `group_threads` / `group_messages` / `thread_members` infrastructure. The logistics tab becomes the origin point where threads are created and seeded; the actual conversation lives at `/groups/[id]`.

**What needs to change:**
- DB: Add `'logistics'` to `group_threads.thread_type` CHECK constraint + new `group_message_reactions` table
- API: New endpoint to provision/sync a logistics group thread for an event
- API: Endpoint to add reactions to group messages
- UI (logistics tab): Replace `LogisticsCollaboration` compose flow with a thread-provisioning action + inline thread preview
- UI (`/groups/[id]`): Add reactions (likes) and thread reply UI enhancements
- Inbox (unified list): Ensure `context_type = 'logistics'` threads surface in the Work tab

---

## Sub-Tasks

---

### Sub-Task 1 — Database: Add `logistics` Thread Type + Reactions Table

**Status:** `[x] done`

**Intent:**
Two schema changes are needed:
1. The `group_threads.thread_type` column has a CHECK constraint limiting values to `('social', 'project', 'tour')`. Logistics threads need a `'logistics'` value.
2. There is no reactions table anywhere in the codebase. Add `group_message_reactions` to support emoji likes on messages.

**Expected Outcomes:**
- `group_threads` accepts `thread_type = 'logistics'` without constraint violations.
- `group_message_reactions` table exists with columns: `id`, `message_id` (→ `group_messages.id`), `user_id` (→ `auth.users.id`), `emoji` (TEXT), `created_at`. UNIQUE constraint on `(message_id, user_id, emoji)`.
- RLS policies on `group_message_reactions`: members of the thread can SELECT/INSERT/DELETE their own reactions.
- The API route `z.enum` in `app/api/groups/threads/route.ts` is updated to include `'logistics'`.

**Todo List:**
1. Write and apply a Supabase migration (`add_logistics_thread_type_and_reactions`):
   - `ALTER TABLE group_threads DROP CONSTRAINT` on thread_type and re-add with `('social', 'project', 'tour', 'logistics')`.
   - `CREATE TABLE group_message_reactions` with the schema above.
   - Add RLS policy: SELECT for thread members, INSERT/DELETE for the reacting user.
2. Update `app/api/groups/threads/route.ts` line ~13: add `'logistics'` to the `z.enum` array.

**Relevant Context:**
- [`supabase/migrations/20260520224000_group_threads_model.sql`](supabase/migrations/20260520224000_group_threads_model.sql) line 7 — current CHECK constraint
- [`app/api/groups/threads/route.ts`](app/api/groups/threads/route.ts) line 13 — `z.enum(['social', 'project', 'tour'])`
- `group_messages` primary key is `id uuid` — reactions FK references this

---

### Sub-Task 2 — API: Provision Logistics Group Thread for an Event

**Status:** `[x] done`

**Intent:**
Create a new API endpoint `POST /api/admin/logistics/comms-thread` that:
1. Looks up whether a `group_threads` record already exists with `context_type = 'logistics'` and `context_id = eventId`.
2. If not, creates one with `thread_type = 'logistics'`, `name = "[Event Name] — Team Comms"`, and the event owner as creator.
3. Syncs the full team member list: resolves user IDs from `tour_team_members` (via `tour_events` junction for event-scoped lookups) and `event_participants` with `role = 'staff'`, then upserts all of them into `thread_members`.
4. Returns `{ threadId, isNew }`.

A companion `GET /api/admin/logistics/comms-thread?event_id=` endpoint returns the existing thread ID for a given event (or `null` if not yet provisioned).

**Expected Outcomes:**
- Calling POST creates or retrieves the group thread for the event.
- All active team members are members of the thread.
- The endpoint is idempotent — calling it twice for the same event does not create duplicate threads or duplicate memberships.
- The thread appears in each member's work tab via the unified list query (which already includes `group_threads` where the user is a `thread_member`).

**Todo List:**
1. Create `app/api/admin/logistics/comms-thread/route.ts` with GET and POST handlers.
2. Use `resolveAuthorizedOrgLogisticsScope` for auth (pattern from `app/api/admin/communications/route.ts`).
3. In POST: query `group_threads` for existing `context_type = 'logistics'` + `context_id = eventId`.
4. If not found: call `group_threads` insert with `thread_type = 'logistics'`, `context_type = 'logistics'`, `context_id = eventId`, `name`, `created_by = user.id`.
5. Resolve team member user IDs:
   - `tour_team_members` joined via `tour_events` for the event's tour.
   - `event_participants` where `role = 'staff'` and `event_id`.
   - Deduplicate; always include event owner (`events_v2.created_by`).
6. Upsert all resolved members into `thread_members` with `role = 'member'` (owner gets `role = 'owner'`), using `{ onConflict: 'thread_id,user_id' }`.
7. Return `{ success: true, threadId, isNew }`.

**Relevant Context:**
- [`app/api/groups/threads/route.ts`](app/api/groups/threads/route.ts) — thread creation pattern
- [`app/api/groups/threads/[id]/members/route.ts`](app/api/groups/threads/[id]/members/route.ts) — member upsert pattern (POST adds members)
- [`lib/admin/resolve-authorized-org.ts`](lib/admin/resolve-authorized-org.ts) — `resolveAuthorizedOrgLogisticsScope`
- `tour_team_members` schema: `user_id`, `tour_id`, `team_id`, `is_active`
- `tour_events` junction: `event_id`, `tour_id`

---

### Sub-Task 3 — API: Add Reactions Endpoint for Group Messages

**Status:** `[x] done`

**Intent:**
Add a `POST /api/groups/threads/[id]/messages/[messageId]/reactions` endpoint that toggles an emoji reaction (add if not present, remove if already reacted). The caller must be a member of the thread.

**Expected Outcomes:**
- POST with `{ emoji: "👍" }` inserts a `group_message_reactions` row.
- If the same user+emoji combination already exists, it is deleted (toggle behavior).
- Returns `{ success: true, added: boolean, emoji, count }`.
- The `group_messages` GET endpoint is updated to join and return `reactions` as a grouped array: `[{ emoji, count, user_ids }]`.

**Todo List:**
1. Create `app/api/groups/threads/[id]/messages/[messageId]/reactions/route.ts` with a POST handler.
2. Validate `{ emoji }` (non-empty string, max 8 chars).
3. Check thread membership via `ensureMembership` (same helper as messages route).
4. Toggle: attempt INSERT; on unique constraint violation, DELETE instead.
5. Return response with updated count.
6. Update `GET /api/groups/threads/[id]/messages/route.ts` to join `group_message_reactions` and aggregate into `reactions: [{ emoji, count, user_ids }]` per message.

**Relevant Context:**
- [`app/api/groups/threads/[id]/messages/route.ts`](app/api/groups/threads/[id]/messages/route.ts) — existing GET/POST to extend
- Sub-Task 1 creates the `group_message_reactions` table
- Pattern: use `createServiceRoleClient()` + `parseUserFromRequestCookieHeader`

---

### Sub-Task 4 — UI: Logistics Tab Thread Provisioning & Preview

**Status:** `[x] done`

**Intent:**
Replace the current `LogisticsCollaboration` compose-and-send flow with a two-part UI:
1. **Provision button**: When an event is selected, show a "Start Team Comms Thread" button (or "Open Team Chat" if a thread already exists). Clicking it calls `POST /api/admin/logistics/comms-thread`, syncs all team members, then redirects or links to `/groups/[threadId]`.
2. **Inline preview**: Show the last 5 messages from the group thread inline in the logistics tab (read-only feed), with a "View Full Chat →" link to `/groups/[threadId]`.
3. **Owner post flow**: The existing compose textarea (visible only to event owners) now sends directly to the group thread via `POST /api/groups/threads/[threadId]/messages`, not to `team_communications`. This means the message shows up in the group thread (and every member's inbox) in one shot.

**Expected Outcomes:**
- When `selectedEvent` is set and the user is the event owner, they see "Start Thread / Open Team Chat" + compose area.
- When `selectedEvent` is set and the user is a team member (non-owner), they see the inline preview with an "Open in Chat" link.
- When no event is selected, a placeholder explains that an event must be selected to use team comms.
- Clicking "Open Team Chat" navigates to `/groups/[threadId]`.

**Todo List:**
1. In `logistics-page-client.tsx`, fetch `events_v2.created_by` for the selected event to derive `isEventOwner`.
2. Fetch the thread ID via `GET /api/admin/logistics/comms-thread?event_id=` on `selectedEvent` change.
3. Replace `LogisticsCollaboration` props interface: add `isOwner`, `threadId`, `eventName`.
4. In `LogisticsCollaboration`:
   - If `threadId` is set: fetch last 5 messages from `GET /api/groups/threads/[threadId]/messages?limit=5` and display them inline.
   - If `isOwner && threadId`: show the compose textarea that posts to `POST /api/groups/threads/[threadId]/messages`.
   - If `isOwner && !threadId`: show "Start Team Comms Thread" button calling the provision endpoint.
   - If `!isOwner && threadId`: show read-only feed + "Open in Chat" link.
5. Remove the old `sendMessage()` logic that posted to `team_communications`.

**Relevant Context:**
- [`components/admin/logistics-collaboration.tsx`](components/admin/logistics-collaboration.tsx) — full component to refactor
- [`app/admin/dashboard/logistics/logistics-page-client.tsx`](app/admin/dashboard/logistics/logistics-page-client.tsx) lines 129, 135, 649–667
- `events_v2.created_by` — owner column (confirmed via `resolve-authorized-org.ts` line 94)
- Thread is navigated to at `/groups/[threadId]` (see `app/groups/[id]/page.tsx`)

---

### Sub-Task 5 — UI: Reactions + Replies in `GroupThreadClient`

**Status:** `[x] done`

**Intent:**
Enhance the `/groups/[id]` group thread viewer to support emoji reactions (likes) on individual messages. All members can react; reactions are shown aggregated under each message bubble. This applies to ALL group threads, including logistics threads.

**Expected Outcomes:**
- Each message shows emoji reaction pills beneath the bubble (e.g. `👍 3`, `❤️ 1`).
- Hovering/tapping a reaction shows who reacted.
- A `+` emoji picker button lets any member add a new reaction or toggle an existing one.
- Tapping an existing reaction pill toggles the current user's reaction on/off.
- Reactions update optimistically in the UI; real-time via Supabase `postgres_changes` INSERT/DELETE on `group_message_reactions`.

**Todo List:**
1. Update the `GroupMessage` interface in `group-thread-client.tsx` to include `reactions: { emoji: string; count: number; user_ids: string[] }[]`.
2. The `loadMessages()` fetch already gets reactions from the updated GET endpoint (Sub-Task 3).
3. Add a `toggleReaction(messageId: string, emoji: string)` handler that calls `POST /api/groups/threads/[threadId]/messages/[messageId]/reactions`.
4. Add a Supabase Realtime subscription on `group_message_reactions` filtered by message IDs in the current thread to update reaction counts live.
5. Render reaction pills beneath each message bubble: map over `message.reactions`, show `{emoji} {count}` as small clickable pills (highlighted if `user_ids.includes(user.id)`).
6. Add an emoji picker trigger button (`+`) per message (use `MessageEmojiPicker` from `components/messages/message-emoji-picker.tsx` or a simple inline emoji set for common reactions: 👍 ❤️ 😂 🔥 👀).

**Relevant Context:**
- [`app/groups/[id]/group-thread-client.tsx`](app/groups/[id]/group-thread-client.tsx) — full component to enhance
- [`components/messages/message-emoji-picker.tsx`](components/messages/message-emoji-picker.tsx) — existing emoji picker component
- Sub-Task 3 adds the reactions API and updates the GET messages response

---

### Sub-Task 6 — Unified List: Ensure Logistics Threads Surface in Work Tab

**Status:** `[x] done`

**Intent:**
The unified list (`GET /api/messages/unified-list`) already fetches group threads where the user is a `thread_member`. Since logistics threads are just group threads with `thread_type = 'logistics'`, they should already appear. However, verify this is working and add a distinguishing label so logistics threads are clearly identifiable in the Work tab inbox.

**Expected Outcomes:**
- Logistics group threads appear in the Work tab at `/messages?tab=work` under the "Channels" section.
- Each logistics thread shows a badge of `"Logistics"` instead of the generic `"Group"` badge.
- Clicking the thread in the inbox navigates to `/groups/[threadId]` (same behavior as other group threads).

**Todo List:**
1. Read `app/api/messages/unified-list/route.ts` to confirm group threads are fetched regardless of `thread_type`.
2. In the unified list response, update the `badge` derivation: if `thread.thread_type === 'logistics'`, return `"Logistics"` as the badge instead of `"Group"`.
3. In `app/messages/messages-page-client.tsx` work tab rendering, no changes needed unless the badge display logic needs updating.
4. Manually verify (or add a test note) that after provisioning a logistics thread, it appears in the work tab for all added members.

**Relevant Context:**
- [`app/api/messages/unified-list/route.ts`](app/api/messages/unified-list/route.ts) — group threads section in the unified list assembly
- [`app/messages/messages-page-client.tsx`](app/messages/messages-page-client.tsx) lines 900-950 — work tab item rendering with `item.badge`

---

## Architecture Flow

```
Event Owner (Logistics Tab)
  → Clicks "Start Team Comms Thread"
  → POST /api/admin/logistics/comms-thread
      → Finds/creates group_threads record
          (thread_type='logistics', context_type='logistics', context_id=eventId)
      → Resolves all team member user IDs
          (tour_team_members + event_participants)
      → Upserts all into thread_members
  → Returns { threadId }

LogisticsCollaboration (inline preview)
  → GET /api/groups/threads/[threadId]/messages?limit=5
  → Displays last 5 messages
  → Owner: shows compose → POST /api/groups/threads/[threadId]/messages
  → All: "Open Full Chat →" link → /groups/[threadId]

Team Member (Work Tab Inbox at /messages?tab=work)
  → GET /api/messages/unified-list (sections=channels)
  → Sees "[Event Name] — Team Comms" with badge "Logistics"
  → Clicks → /groups/[threadId]

/groups/[threadId] (Full Chat)
  → All members can read + reply
  → Realtime subscription on group_messages INSERT
  → Reactions: POST /api/groups/threads/[id]/messages/[msgId]/reactions
  → Reaction counts shown live (postgres_changes on group_message_reactions)
```

---

## Migrations Required

| Migration Name | Change |
|---|---|
| `add_logistics_thread_type_and_reactions` | Alter `group_threads.thread_type` CHECK to include `'logistics'`; create `group_message_reactions` table with RLS |

---

## Notes

- **No changes to `team_communications`** — the existing logistics comms API is left intact for backward compat. The new flow uses `group_threads` exclusively for the two-way team chat.
- **`LogisticsDynamicManager type="communication"`** (comms plan/channel management panel) is not modified.
- **Reactions are additive** — the `group_message_reactions` table is new; existing messages simply have no reactions until users add them.
- **The `group_threads` trigger `notify_group_message_recipients`** (in the migration) already fires notifications to all thread members on every new message — no additional notification wiring is needed.
- All thread members can reply, not just the event owner — this is the correct behavior for a team comms channel.
