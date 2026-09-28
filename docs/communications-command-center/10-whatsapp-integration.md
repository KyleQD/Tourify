# 10 - WhatsApp Integration

## Current State

No production WhatsApp/Twilio/Meta adapter was found in Logistics Comms.

## Required Design

WhatsApp should be a provider adapter that can ingest operational messages into private source records and normalized command events.

Do not expose a full WhatsApp conversation to users who only receive a relay. Outbound WhatsApp sending should be provider-gated, audited, and disabled until credentials, templates, consent, and webhook signatures are configured.

## Rollout Gate

WhatsApp integration requires:

- signed webhook validation;
- provider credential storage;
- opt-in/consent model;
- rate/abuse limits;
- audit trail;
- no client exposure of provider secrets.
