# 00 - Communications Command Center Audit

Date: 2026-08-11

## Current Logistics Shell

The current Logistics route is `app/admin/dashboard/logistics/page.tsx`, which renders `app/admin/dashboard/logistics/logistics-page-client.tsx` inside a suspense loading boundary.

`LogisticsPageClient` owns the Logistics tab state, URL state, acting organization guard, and tour/event/leg filters. It uses `OperationsCommandShell` from `components/admin/operations/operations-command-shell.tsx` with these tab values:

- `overview`
- `transportation`
- `accommodations`
- `equipment`
- `backline`
- `catering`
- `communication`
- `site-maps`

The Comms tab is the `communication` tab in `app/admin/dashboard/logistics/logistics-page-client.tsx`. It currently renders:

- `components/admin/logistics-collaboration.tsx`
- `components/admin/logistics-dynamic-manager` with `type="communication"`

Scope is passed through URL search params using `lib/admin/logistics-scope.ts`: `orgId`, `tourId`, `eventId`, `legId`, `stopId`, `panel`, `issueId`, and `tab`. `LogisticsScopeBar` in `components/admin/logistics/logistics-scope-bar.tsx` updates tour/event/leg selection. The page refuses silent organization switching by comparing URL `orgId` with the acting org resolved from account context.

## Current Comms Implementation

`components/admin/logistics-collaboration.tsx` is an event-scoped Team Comms preview. It accepts `eventId`, `tourId`, `eventName`, `isOwner`, `threadId`, and `onThreadProvisioned`. If no event is selected, it renders an empty state: "Select an event to use Team Comms." If no thread exists, event owners can provision one. If a thread exists, it shows the last five `group_messages` and lets the owner send an `announcement` message.

The provisioning API is `app/api/admin/logistics/comms-thread/route.ts`.

- `GET /api/admin/logistics/comms-thread?event_id=...` returns an existing `group_threads.id` where `context_type='logistics'` and `context_id=event_id`.
- `POST /api/admin/logistics/comms-thread` idempotently creates a `group_threads` row with `thread_type='logistics'`, `context_type='logistics'`, and `context_id=event_id`.
- Member sync adds the event owner, active `tour_team_members` from linked `tour_events`, event staff from `event_participants`, and the acting admin to `thread_members`.
- Authorization is via `withAdminCapability('logistics.view')` plus `resolveAuthorizedOrgLogisticsScope`.

Full group chat routes and UI already exist:

- `app/groups/[id]/page.tsx`
- `app/groups/[id]/group-thread-client.tsx`
- `app/api/groups/threads/route.ts`
- `app/api/groups/threads/[id]/route.ts`
- `app/api/groups/threads/[id]/messages/route.ts`
- `app/api/groups/threads/[id]/messages/[messageId]/reactions/route.ts`
- `app/api/groups/threads/[id]/members/route.ts`

The full group thread page uses Supabase realtime subscriptions on `group_messages` inserts and `group_message_reactions` changes. The Logistics preview does not subscribe to realtime itself.

Direct messages already exist under:

- `app/messages/page.tsx`
- `app/messages/messages-page-client.tsx`
- `app/api/messages/route.ts`
- `app/api/messages/unified-list/route.ts`
- `app/api/messages/unread-count/route.ts`
- `components/messages/*`

The work inbox unifies direct operational conversations, group threads, event group chats, task messages, bulletins, event documents, and work-mode publications.

Event communications already exist under:

- `components/admin/event-communication-hub.tsx`
- `components/admin/event-task-messages.tsx`
- `app/api/admin/events/[id]/communications/route.ts`
- `app/api/admin/events/[id]/group-chats/route.ts`
- `app/api/admin/events/[id]/task-messages/route.ts`
- `app/api/admin/events/[id]/documents/route.ts`
- `app/api/admin/events/[id]/communication-settings/route.ts`
- `app/api/admin/events/[id]/day-sheet/distribute/route.ts`
- `app/api/admin/events/[id]/day-sheet/acknowledge/route.ts`

This hub includes bulletins/announcements, event group chats, event documents, secure uploads, task messages, read tracking, acknowledgements, and notifications. It is event-scoped.

## Communication-Related Database Inventory

| Table | Purpose | PK | Tenant keys | RLS | Realtime | Used by | Reuse |
|---|---|---|---|---|---|---|---|
| `conversations` | Direct DM conversation envelope | `id` | participant user/profile/account columns; context fields | yes, from messaging migrations | messages realtime client path exists | `app/api/messages/route.ts`, `app/messages/messages-page-client.tsx` | Reuse for DMs |
| `messages` | Direct DM messages | `id` | `conversation_id`; sender | yes | used by message clients | `app/api/messages/route.ts` | Reuse for DMs |
| `dm_request_rate_limits` | DM request abuse control | composite sender/recipient | sender/recipient | yes | no | `app/api/messages/route.ts` | Reuse |
| `group_threads` | Group/team/logistics thread envelope | `id` | `context_type`, `context_id`; no `org_id` today | yes via membership helpers | no publication found for `group_threads` | groups APIs, Logistics Team Comms | Reuse, extend carefully |
| `thread_members` | Membership for `group_threads` | `(thread_id,user_id)` | thread membership | yes | no | groups APIs | Reuse |
| `group_messages` | Group thread messages | `id` | `thread_id` | yes | full chat subscribes | groups APIs, Logistics preview | Reuse |
| `group_message_reactions` | Reactions on group messages | `id` plus unique `(message_id,user_id,emoji)` | message/thread membership | yes | full chat subscribes | group thread client | Reuse |
| `event_bulletins` | Event announcements/bulletins | `id` | `event_id`; later hardened by event permission policies | yes | no direct client subscription found | Event Communications hub, work inbox | Reuse for event announcements |
| `event_group_chats` | Event-scoped group channels | `id` | `event_id`, `member_ids` | yes | no direct publication found | Event Communications hub, work inbox | Reuse for event channels |
| `event_group_messages` | Event channel messages | `id` | `event_id`, `group_id` | yes | added to `supabase_realtime` in `20260602150000_message_attachments_realtime.sql` | Event Communications hub | Reuse |
| `event_documents` | Event comms documents | `id` | `event_id` | yes | no | Event Communications hub, work inbox | Reuse |
| `event_task_messages` | Task/request style operational messages | `id` | `event_id`, `recipient_ids` | yes | no | Event task messages and work inbox | Reuse or bridge to workflow tasks |
| `workflow_threads` | Unified workflow container | `id` | metadata/context | yes | not audited for realtime | workflow routes, event task workflow | Reuse for task/schedule workflows |
| `workflow_messages` | Workflow messages | `id` | `thread_id` | yes | not audited | messages bridge when feature flag enabled | Reuse |
| `workflow_tasks` | Event/admin tasks | `id` | `thread_id`, metadata contains event/org | yes | not audited | `app/api/events/[id]/tasks/route.ts` | Reuse for communication-to-task |
| `notifications` | User notifications | `id` | `user_id`, metadata | yes owner/service policies | not audited | many APIs, group-message trigger | Reuse |
| `logistics_acknowledgements` | Logistics acknowledgement records | `id` | `org_id`, `event_id`, `tour_id`, `source_type`, `source_id`, `user_id` | enabled, but current policies are broad | no | logistics foundation | Reuse only after policy hardening |
| `logistics_comms_plans` | Operational comms plans | `id` | `org_id`, `event_id`, `tour_id` | enabled, broad authenticated policy | no | `app/api/admin/logistics/comms-plans/route.ts` | Reuse, harden |
| `logistics_comms_channels` | Plan channels | `id` | parent `plan_id` | enabled, broad authenticated policy | no | comms plans route | Reuse, harden |
| `logistics_tasks` | Logistics task rows | `id` | `org_id`, `event_id`, `tour_id`, source fields | hardened in later migrations | no | Logistics dynamic manager and APIs | Reuse |
| `tour_stops` | Tour stop records | `id` | `org_id`, `tour_id`, `event_id` | yes | no | tour plan/logistics scopes | Reuse for stop context |
| `tour_route_legs` | Tour leg records | `id` | `org_id`, `tour_id` | yes | no | route/leg services | Reuse for leg context |
| `tour_team_members` | Tour staff/team membership | `id` | `tour_id`, `user_id`, status | yes | no | comms-thread provisioning, tours APIs | Reuse |
| `staff_members` | Staff/roster member records | `id` | `org_id`, employer fields, department | yes | no | workforce and roster APIs | Reuse for departments |
| `staff_shifts` | Scheduling/shift assignments | `id` | event/tour/org fields after migrations | yes | no | scheduling APIs/components | Reuse for schedule context |

## Account And Permissions Model

Admin routes should use `withAdminCapability` from `lib/auth/api-auth.ts`. Acting organization context is resolved in `lib/auth/admin-context.ts` and carried by `useActingContext` in UI. Logistics routes commonly call `resolveAuthorizedOrgLogisticsScope` in `lib/admin/resolve-authorized-org.ts`, which:

- requires an explicit acting org;
- permits orgs from `org_members` and active `organizer_accounts.ops_org_id`;
- resolves allowed `events_v2.id` and `tours.id`;
- refuses mismatched requested `eventId` or `tourId`.

Capability names already include `communications.view`, `communications.send`, `communications.broadcast`, `logistics.view`, and `logistics.manage` in legacy RBAC migration `migrations/0010_rbac_system.sql`. Current Logistics APIs mostly use `logistics.view` and `logistics.manage`.

## Related Systems

- Tasks: `app/api/events/[id]/tasks/route.ts`, `lib/events/event-task-workflow`, `workflow_tasks`, `logistics_tasks`.
- Scheduling: `components/admin/scheduling/*`, `staff_shifts`, `lib/services/staff-shift-assignment-sync.ts`.
- Notifications: `notifications`, `lib/services/notification-delivery.ts`, `lib/services/notification-channels.ts`, `lib/logistics/notifications-adapter.ts`.
- Files/attachments: DM attachments via `components/messages/message-attachments.tsx` and `lib/messaging/attachments`; group message attachment payload exists in API/schema.
- Staff/roster/departments: `app/api/hiring/roster`, `staff_members.department`, `tour_team_members`, `event_participants`.
- Tours/stops/legs/events: `tours`, `tour_events`, `tour_stops`, `tour_route_legs`, `events_v2`.
- Audit/activity: `workflow_events_audit`, `security_audit_events`, `admin_domain_transactions`, `admin_publication_outbox`, `logistics_activity`-style helpers under `lib/logistics/activity.ts`.

## Third-Party Integrations

No dedicated Gmail or WhatsApp operational provider exists in the audited Comms paths. Existing integration patterns include:

- Social OAuth Supabase functions: `supabase/functions/social-oauth/index.ts`, `supabase/functions/social-analytics/index.ts`.
- Organization social integrations: `organization_social_integrations` migration `supabase/migrations/20260720065221_organization_social_integrations_content_hub.sql`.
- Email sending patterns: `app/api/organization/tour-managers/route.ts`, `lib/email/email-layout`, `lib/services/email-delivery.service.ts`, SendGrid/Resend style env usage.
- Webhooks: Stripe, marketplace, music, licensing, and Supabase notification webhook routes under `app/api/webhooks/**`.
- Weather references exist in legacy/site-map schema, but no production weather-alert adapter was found in the Logistics Comms path.

## Gap Analysis

Reusable as-is:

- Direct messaging DMs.
- Group-thread messages/reactions/membership.
- Event bulletins, event group chats, event task messages, documents.
- Work inbox unified list.
- Logistics scope and acting org resolution.
- Workflow tasks for communication-to-task.

Reusable with extension:

- `group_threads` needs org/tour context or a command-center adapter to support org/tour-wide Logistics Comms without forcing event selection.
- `logistics_acknowledgements`, `logistics_comms_plans`, and `logistics_comms_channels` need tighter RLS before becoming primary command-center security primitives.
- Event bulletins need tour/org rollup views rather than remaining only event pages.
- Notifications need command-center-specific metadata and acknowledgement links.

Incomplete or missing:

- Central command feed/read model.
- External source/event model with private source thread preservation.
- Relay model that exposes only selected excerpts to recipients.
- Weather provider adapter and alert ingestion.
- Gmail/email inbound adapter.
- WhatsApp adapter.
- Deterministic automation rules.
- Search across internal and external operational history.

Conflicting risks:

- Creating new `communication_channels`/`communication_messages` tables would duplicate `group_threads`, `conversations`, and `event_*` communication tables unless introduced only as a normalized event/relay layer.
- Provider threads must not be exposed through regular group membership.

## Migration Risk

High-risk operations to avoid:

- Adding non-null tenant keys to large live tables without a staged nullable/backfill/quarantine plan.
- Replacing RLS on `messages`, `conversations`, `group_threads`, or event communication tables without compatibility tests.
- Backfilling `org_id` by guessing from loosely related records.
- Publishing provider raw bodies to tables readable by crew.
- Rewriting current Team Comms into a new table before the adapter/read-model path is proven.

Phase 00 exit criteria met: exact paths and schema names above are repository-grounded, current Comms behavior is understood, and reuse strategy is explicit.
