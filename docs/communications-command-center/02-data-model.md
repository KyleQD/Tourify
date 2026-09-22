# 02 - Data Model

## Reuse First

The repo already owns multiple communication primitives. New tables should model missing command-center concepts only:

- normalized external/native operational events;
- private provider source records;
- curated relays and relay targets;
- deterministic automation rules;
- durable event-to-task/schedule links if existing workflow metadata is insufficient.

## Existing Tables To Reuse

- DMs: `conversations`, `messages`
- Group/team threads: `group_threads`, `thread_members`, `group_messages`, `group_message_reactions`
- Event communications: `event_bulletins`, `event_group_chats`, `event_group_messages`, `event_documents`, `event_task_messages`
- Tasks: `workflow_threads`, `workflow_messages`, `workflow_tasks`, `logistics_tasks`
- Acks: `logistics_acknowledgements`
- Notifications: `notifications`
- Scope: `tours`, `tour_events`, `tour_stops`, `tour_route_legs`, `events_v2`
- Staff/departments: `staff_members`, `tour_team_members`, `event_participants`, `staff_shifts`

## Proposed Additive Tables

Migration `supabase/migrations/20260811201816_communications_command_center_foundation.sql` adds the first foundation version of these tables.

`communication_events`

- normalized command feed record
- tenant keys: `org_id`, nullable `tour_id`, `tour_route_leg_id`, `tour_stop_id`, `event_id`, `venue_id`
- source keys: `source_kind`, `source_table`, `source_id`, nullable `external_source_id`, `external_thread_ref`
- display: `title`, `summary`, `approved_excerpt`, `priority`, `severity`
- workflow: `status`, `requires_action`, `requires_acknowledgement`, `occurred_at`, `received_at`
- audit: `created_by`, `updated_by`, timestamps

`communication_sources`

- organization-scoped provider connection metadata
- safe client-readable fields only: `provider`, `display_name`, `connection_status`, `last_sync_at`, `last_error_code`
- no secrets in JSON returned to clients

`communication_source_private_refs`

- service-role-only storage for provider account/thread/message refs and encrypted token references
- no authenticated read policy

`communication_relays`

- curated relay title/body/priority/source event/creator
- may require acknowledgement

`communication_relay_targets`

- channel/user/department target references
- no raw provider body

`communication_rules`

- deterministic trigger/action JSON with schema version and enabled flag
- org-scoped and capability-gated

## Backfill Position

No broad backfill is required for Phase 00/01. The command center can read existing tables through a read model and create new normalized records only for new provider/event relay workflows. If historical native messages must appear in search, prefer adapters/views over rewriting rows.

## Indexes To Plan

- `communication_events (org_id, received_at desc)`
- `communication_events (org_id, tour_id, received_at desc)`
- `communication_events (org_id, event_id, received_at desc)`
- `communication_events (org_id, status, priority, received_at desc)`
- `communication_relays (source_event_id, created_at desc)`
- `communication_relay_targets (relay_id)`
- `communication_sources (org_id, provider)`

Use concurrent index SQL or staged migrations for large tables.
