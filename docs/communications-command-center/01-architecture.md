# 01 - Architecture

## Decision

Build the Communications Command Center as an additive operational layer over existing Tourify messaging, event communications, logistics, workflow, and notification systems.

Do not replace:

- `conversations` / `messages`
- `group_threads` / `thread_members` / `group_messages`
- `event_bulletins`
- `event_group_chats` / `event_group_messages`
- `event_task_messages`
- `workflow_tasks`
- `notifications`

## Core Concepts

1. Native conversation: existing DMs, group threads, event group chats, and bulletins.
2. Operational communication event: normalized actionable item from native or external sources.
3. External source: email, WhatsApp, weather, and future providers.
4. Relay: a curated excerpt sent to a Tourify audience without exposing the private source thread.
5. Action link: task, schedule change, acknowledgement, escalation, or audit record created from a communication.

## Target Flow

Provider adapter -> normalization -> deterministic context resolver -> operational event -> command feed -> relay/task/schedule/ack/escalation.

Native messages flow into the command center through adapters/read models rather than table migration:

- Direct: `conversations` + `messages`
- Team Comms: `group_threads` + `group_messages`
- Event hub: `event_bulletins`, `event_group_chats`, `event_group_messages`, `event_task_messages`
- Tasks: `workflow_tasks`, `logistics_tasks`

## Context Model

Every operational item should be able to reference:

- acting organization (`org_id`)
- `tour_id`
- `tour_route_leg_id`
- `tour_stop_id`
- `event_id`
- `venue_id`
- staff department/team
- native source object
- external source object

Manual admin correction must override deterministic inference. AI can suggest context but cannot be required for routing, permissions, or emergency delivery.

## Provider Boundary

External provider code must run server-side only. Provider credentials, OAuth refresh tokens, WhatsApp tokens, webhook secrets, and raw external threads must never be shipped to client code.

Provider adapters should return normalized events and private source references. Crew-facing relays should store only approved relay body/excerpts.

## First Implementation Slice

The first safe slice is a Logistics -> Comms command-center shell that can load org/tour/event summaries without requiring a single event selection. It should reuse existing read paths and show migration-needed states where optional tables are missing.
