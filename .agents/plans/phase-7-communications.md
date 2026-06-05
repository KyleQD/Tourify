# Phase 7 — Communications Unification

> **Goal:** Migrate admin messaging onto the unified `conversations`/`group_threads` + DM trust model. Fix broken group-create and task-recipient flows. Add attachments and realtime. Remove the legacy `team_communications` model from admin surfaces.

---

## 7.1 Understand the two messaging models

Before writing any code, map out the current state:

**Legacy model (to be retired from admin):**
- Tables: `team_communications`, `event_group_messages`, `message_channels`
- Used by: `app/admin/dashboard/communications/page.tsx`, `logistics-collaboration.tsx`, `event-communication-hub.tsx`
- Has no DM trust, no thread structure

**Unified model (target):**
- Tables: `conversations` (DMs), `group_threads` (group chats), `messages`
- Migrations: `20260520224000_group_threads_model.sql`, `20260520222000_dm_trust_model.sql`, `20260526100300_resolve_message_context_v2.sql`
- Used by: `/api/messages/unified-list`
- Has DM trust (requires mutual follow or explicit acceptance), group threads with member management

**Task:** Read these migration files to understand exact table schemas before writing UI or API code.

---

## 7.2 Migrate admin communications page to unified model

**Current state:** `app/admin/dashboard/communications/page.tsx` uses `team_communications` table via `GET /api/admin/communications`.

**Tasks:**

1. Create `GET /api/admin/messages/list/route.ts` (or update existing `app/api/admin/messages/threads/route.ts`):
   - Returns all `group_threads` where `org_id = <admin_org>` or where the admin user is a member
   - Also returns recent `conversations` (DMs) for the admin user
   - Response shape:
     ```json
     {
       "threads": [{ "id", "name", "type": "group", "last_message", "unread_count", "member_count" }],
       "dms": [{ "id", "participant_name", "last_message", "unread_count", "is_trusted" }]
     }
     ```
2. Replace the `team_communications` fetch in `communications/page.tsx` with this new endpoint.
3. Show a unified inbox: left sidebar with threads + DMs, right panel with message list.
4. **Thread view:** Click a thread → load messages via `GET /api/messages/unified-list?thread_id=<id>`. Messages show: sender avatar, name, content, timestamp, attachments.
5. **Send message:** Input box at the bottom → `POST /api/messages/unified-list` with `{ thread_id, content, attachments }`.

**Done when:** Communications page shows real group threads and DMs from the unified model.

---

## 7.3 Fix event HQ group-create

**Problem:** Creating a group chat in Event HQ fails due to `member_ids` validation error.

**Tasks:**

1. Open `app/api/admin/events/[id]/group-chats/route.ts`. Find the `member_ids` validation.
2. Check what the `group_threads` table expects: does it want UUIDs, or does it require members to already be connected?
3. Fix the validation: the admin creating the group should be added as `owner`; other members passed as `member_ids` should be validated that they are `event_participants` for this event. If not participants, auto-invite them.
4. Migration `20260520224000_group_threads_model.sql` defines `group_thread_members` table. Ensure `INSERT INTO group_thread_members (thread_id, user_id, role)` is called for each member.
5. Test: create a group chat with 3 members from the event HQ.

**Done when:** Creating a group chat in Event HQ succeeds and the thread appears in all members' inboxes.

---

## 7.4 Fix task-recipient picker

**Problem:** When creating a task and assigning it to a team member, the recipient picker fails (likely because it can't find users via the wrong lookup method).

**Tasks:**

1. In `EventTaskManager` component (`components/admin/event-task-manager.tsx`), find the recipient/assignee picker.
2. It should call `GET /api/admin/events/[id]/participants?role=staff` to get assignable users for this event.
3. Show: display name, role, avatar in the dropdown. On select, store `user_id` as `assigned_to` on the task.
4. When a task is assigned: call `POST /api/admin/notifications` to create a notification for the assignee with `content: 'You have been assigned: <task_title>'`, `is_read: false`, `link: /admin/dashboard/events/<id>/hq`.

**Done when:** Task assignment picker shows event participants; assigned user receives a notification.

---

## 7.5 Add attachments to chats and bulletins

**Tasks:**

1. **Schema:** Add `attachments` column to the messages table (if not already present):
   ```sql
   ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
   -- format: [{ "url": "...", "name": "...", "type": "image|file|audio", "size": 12345 }]
   ```
2. **File upload in message composer:** Add a paperclip icon next to the send button. On click, open file picker. Accepted: images, PDF, audio (for voice notes). Max size: 25MB.
3. On file select: upload to Supabase Storage `message-attachments/<thread_id>/<filename>`. Get public URL. Add to the pending attachments array shown as chips above the input.
4. On send: include `attachments` array in the `POST` body.
5. **Attachment rendering in message list:** Images show as thumbnails (click to expand). Files show as download cards (name + file icon + size).
6. **Voice notes:** Add a microphone icon. Hold to record (browser MediaRecorder API). On release, upload as `.webm` and attach.

**Done when:** Sending a message with an image attachment shows a thumbnail in the conversation; PDF files show as download cards.

---

## 7.6 Fix "Live" realtime badge and add real subscriptions

**Problem:** Admin communications and logistics pages show a "Live" badge that implies realtime, but may have no actual Supabase realtime subscription.

**Tasks:**

1. Audit all components showing "Live" badge: find which ones have `supabase.channel(...)` subscriptions and which are faking it.
2. For the communications page: add `supabase.channel('admin-comms').on('postgres_changes', { table: 'messages', filter: 'thread_id=eq.<id>' }, callback)`. On new message, append to the message list without re-fetch.
3. For group threads: subscribe to `group_thread_members` changes to update member count.
4. Remove the "Live" badge from any component that does NOT have a real subscription. Replace with "Last updated: <time>" if appropriate.
5. Cleanup subscriptions on component unmount.

**Done when:** Sending a message from one browser tab appears in another tab of the same conversation without refresh.

---

## 7.7 Remove legacy MessageBoard / channel model from admin

**Tasks:**

1. Run `rg "MessageBoard\|team_communications\|message_channels\|use-real-time-communications" app/admin/ components/admin/` to find all references.
2. For each reference:
   - If in a component that now uses the unified model, delete the old import/usage.
   - If the component is only used for the legacy model, delete the whole component.
3. Do NOT drop the database tables yet — just remove the UI/API usage. Tables can be deprecated safely after confirming all data is migrated or not needed.
4. Verify `event_group_messages` realtime publication: check `supabase/migrations/` for a realtime publication setup for this table. If missing, add: `ALTER PUBLICATION supabase_realtime ADD TABLE event_group_messages;`.

**Done when:** No admin page imports legacy messaging components.

---

## 7.8 Confirm DM trust model in admin context

**Current state:** `20260520222000_dm_trust_model.sql` defines a DM trust system where users must be connected to DM each other.

**Tasks:**

1. Admin users need to be able to DM any user in their org without the normal trust requirement (staff coordination).
2. In `app/api/messages/unified-list/route.ts` (or wherever DMs are created), add: if the sender is an admin and the recipient is in the admin's org, bypass the DM trust check.
3. Or: add a `trust_bypass` flag per org that allows admin DMs to all org members.
4. Test: admin can DM a staff member who hasn't accepted them.

**Done when:** Admin can DM any org member without trust requirement.

---

## Phase 7 Exit Criteria

- [ ] Communications page shows unified group threads + DMs (not legacy team_communications)
- [ ] Event HQ group-create succeeds with 3+ members
- [ ] Task assignment picker shows event participants; assignee gets notification
- [ ] Sending a message with an image attachment shows thumbnail inline
- [ ] New messages appear in real-time across tabs (no refresh needed)
- [ ] No admin page imports `MessageBoard` or `use-real-time-communications`
- [ ] Admin can DM any org member without DM trust restriction
- [ ] `event_group_messages` realtime publication confirmed
- [ ] `npm run build` passes
