# Custody, Transfer Agent, Fund Administrator, and Bank Integrations

## Partner registry

Maintain a controlled registry of provider relationships, legal roles, supported products, jurisdictions, credentials, environments, webhook keys, reconciliation SLAs, incident contacts, and termination plans.

## Adapter requirements

Every adapter must provide:

- server-only lazy client initialization;
- signed requests and verified webhooks;
- immutable raw event receipt;
- idempotency and replay protection;
- monotonic state validation;
- provider-to-Tourify ID mapping;
- retries with dead-letter handling;
- daily reconciliation;
- stale-data and outage indicators;
- kill switch and provider migration procedure.

## Official sources

- transfer agent/depository: official securityholder record;
- custodian/broker: custody and customer-position record;
- fund administrator: official fund accounting, capital accounts, and NAV;
- bank/escrow/paying agent: cash status;
- tax provider: tax-document status;
- Tourify: music rights, catalog evidence, and synchronized experience.

## No silent fallback

If an official provider is unavailable or data conflicts, Tourify must show a degraded/reconciliation-pending state. It must not silently replace official values with internal estimates.
