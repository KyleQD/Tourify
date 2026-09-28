# 03 - Permissions

## Existing Authorization To Reuse

Server routes should use `withAdminCapability` from `lib/auth/api-auth.ts` and the acting organization model from `lib/auth/admin-context.ts`.

Logistics-scoped reads should use `resolveAuthorizedOrgLogisticsScope` from `lib/admin/resolve-authorized-org.ts`. This requires explicit acting organization context and validates requested `eventId`/`tourId` against the acting org.

Relevant capabilities:

- `logistics.view`
- `logistics.manage`
- `communications.view`
- `communications.send`
- `communications.broadcast`

Current Logistics routes mostly use `logistics.view` and `logistics.manage`. Command-center broadcast/relay routes should require a send/broadcast capability once the capability matrix is settled.

## RLS Requirements

New public tables must enable RLS before client exposure. Policies should be org-scoped and capability-aware, not broad `auth.uid() IS NOT NULL` policies.

Migration `supabase/migrations/20260811201816_communications_command_center_foundation.sql` applies this model for the new command-center tables:

- `communication_sources`: authenticated admin read/manage by `communications.*` or `logistics.*` capabilities; service role all.
- `communication_source_private_refs`: service role only, no authenticated policy.
- `communication_events`: authenticated admin read/write by org capabilities; service role all.
- `communication_relays`: authenticated admin read/write by org capabilities; service role all.
- `communication_relay_targets`: self/admin target reads and admin target management; service role all.
- `communication_event_links`: authenticated admin read/write by org capabilities; service role all.
- `communication_rules`: authenticated admin read/manage by org capabilities; service role all.

Rules:

- Admins can read command-center records only for authorized org/tour/event scope.
- Crew can read relays sent to them or groups they belong to, not the private source thread.
- Provider private refs are service-role only.
- Updates require SELECT-compatible policies.
- Views should use `security_invoker = true` on Postgres 15+ or be kept out of exposed schemas.

## Existing Risk To Fix Before Rollout

The audit found broad authenticated policies on `logistics_acknowledgements`, `logistics_comms_plans`, and `logistics_comms_channels` in `supabase/migrations/20260719210000_logistics_ops_foundation.sql`. They should be hardened before those tables become security boundaries for the command center.

## Data Exposure Boundary

A relay recipient can see:

- relay title/body;
- priority/severity;
- relevant tour/event/stop context;
- acknowledgement/task/schedule action state.

A relay recipient must not automatically see:

- original external email thread;
- WhatsApp conversation;
- provider account identifiers;
- OAuth metadata;
- admin notes;
- unrelated source attachments.
