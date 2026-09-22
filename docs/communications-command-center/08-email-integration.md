# 08 - Email Integration

## Current State

No production Gmail/operational inbound email adapter was found in Logistics Comms. Existing email-related patterns include:

- outbound invite email in `app/api/organization/tour-managers/route.ts`;
- email layout helpers under `lib/email`;
- notification delivery services under `lib/services`;
- multiple webhook patterns under `app/api/webhooks/**`.

## Required Design

Email ingestion should be provider-adapter based. Gmail or generic email should create `communication_events` and private source refs, not normal crew-visible messages.

Admin workflow:

1. receive venue email;
2. attach/correct tour stop or event context;
3. create relay body;
4. send to selected departments/groups;
5. optionally require acknowledgements;
6. optionally create a task or schedule change.

## Security

OAuth tokens and raw threads must be server-only. A relay recipient should not receive provider account IDs, refresh tokens, or the complete source email thread.
