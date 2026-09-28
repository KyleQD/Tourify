# Integrations backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- INTG-003 (P0): MFA hardening — backup-code hashing and a fail-closed verification-code store contract are implemented with deterministic local security tests; durable server-only repository wiring and staging evidence await Database/Auth.
- INTG-006 (P0): Webhook launch certification — enabled commerce/ticketing/notification routes retain dedicated signature and receipt boundaries; advanced provider routes are now disabled behind `FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED`. Hosted ledger reconciliation and deployed replay evidence remain open.

## Candidate

Pending product owner answers to QUESTIONS.md (19 questions). Converting answers into bounded tasks:

### Resolved from the initial audit

- [x] G-001: Photos webhook idempotency — completed by INTG-002; release still provisions `STRIPE_WEBHOOK_SECRET_PHOTOS` and verifies the ledger migration on the target.
- [x] G-009a: MFA backup-code hashing — completed by INTG-003; the in-memory verification-code store remains open as G-009.
- [x] G-011: Stripe webhook secret environment split — completed by INTG-005; release provisions the five endpoint-specific secrets.
- [x] G-014: Cron route authentication — completed by INTG-004; release provisions `CRON_SECRET` for runtime smoke evidence.

### P1 — Must-fix before scale (from current gaps)

- [ ] G-009: MFA verification-code durable store (Q-003)
- [ ] G-002/G-003: Webhook framework / consistency (Q-005)
- [ ] G-012: Music outbox worker deployment/monitoring (Q-006)
- [ ] G-013: Event reminders implementation (Q-007)
- [ ] G-007/G-020: Provider health checks + Sentry instrumentation (Q-008, Q-009)
- [ ] G-015/G-024: Rate-limit coverage + provisioned smoke evidence (Q-010)
- [ ] G-022: Webhook integration tests (Q-016)

### P2 — Quality / hardening (from gaps)

- [ ] G-006/G-008: Unified provider abstraction (Q-011)
- [ ] G-005/G-026: Provider catalog and configuration registry (Q-012)
- [ ] G-010: Credential rotation framework (Q-013)
- [ ] G-017: Email service consolidation (Q-014)
- [ ] G-021: Integration audit dashboard (Q-015)
- [ ] G-023: Shopify/Printful integration tests (Q-016)
- [ ] G-025: Integration code consolidation (Q-017)
- [ ] G-018/G-019: SMS/Push retry and queue (Q-018)

### Backlog ref items (from DEVELOPMENT_BACKLOG.md)

- WS-0.5: Marketplace checkout key adoption + race tests (partially done)
- WS-0.6: Prod env split + PITR (HMAC done; env split pending)
- WS-1.4: Sentry + uptime + alerting (not started)
- WS-1.5: Workers scheduled with monitoring (crons done; workers not)
- WS-1.6: CI green (27 vitest failures remain)

## Done

- Control-plane bootstrap created.
- INTG-001 audit: baseline, reconciled gaps, and owner questions produced (2026-09-09; reconciled 2026-09-10).

## Production launch tasks — 2026-09-16

- **INTG-003 (P0)** — persistent, rate-limited, replay-safe MFA codes and deterministic backup-code verification.
- **INTG-006 (P0)** — certify enabled launch webhooks; gate advanced providers.
- **INTG-007 (P1)** — remove plaintext OAuth token persistence and prove the encrypted credential lifecycle.
