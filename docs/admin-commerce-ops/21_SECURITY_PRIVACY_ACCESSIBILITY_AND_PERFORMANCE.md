# Security, Privacy, Accessibility, and Performance

## Payment Security

- Never store full card data.
- Never expose provider secrets.
- Use provider-hosted or compliant payment interfaces.
- Verify webhook signatures.
- Use idempotency.
- Prevent replay.
- Restrict provider dashboards and references.

## Financial Controls

- Permission-based actions.
- Reason required.
- Threshold approvals.
- Provider-state verification.
- Immutable audit.
- Separation of duties.
- Reconciliation after mutation.

## PII

- Mask customer contact information.
- Reveal only when required.
- Audit reveal.
- Restrict addresses.
- Minimize list DTOs.
- Restrict exports.
- Define retention.

## Database Security

- RLS.
- Security-invoker views.
- Restricted functions.
- No service role in clients.
- Constraints for currency and scope.
- Advisors after migrations.

## Accessibility

Target WCAG 2.2 AA.

Requirements:

- Accessible financial tables.
- Keyboard navigation.
- Focus management.
- Currency read correctly by screen readers.
- Status text beyond color.
- Accessible charts with text equivalents.
- Confirmation summaries.
- Error summaries.
- Reduced motion.
- Touch targets.

## Performance Targets

Suggested initial targets:

- Commerce Overview usable in under 2 seconds on typical broadband.
- Transaction list first page server response under 1.5 seconds.
- Search under 500 ms after debounce where practical.
- Order detail under 1.5 seconds excluding provider refresh.
- Financial actions show progress and avoid duplicate submission.
- No full commerce dataset loaded into browser.

## Architecture

- Server pagination.
- Narrow DTOs.
- Indexed read models.
- Request cancellation.
- Lazy detail loading.
- Async exports.
- Safe short-lived aggregate caching.
- No caching of sensitive action results.
- Virtualized large tables.

## Resilience

- Preserve operator notes during temporary failure.
- Retry reads safely.
- Do not blindly retry money mutations.
- Show provider unknown state.
- Create repair issues for partial external failure.
- Reconcile after reconnect.

## Telemetry

Collect:

- route viewed,
- filter used,
- issue opened,
- case assigned,
- action started,
- action completed,
- action failed,
- time to resolution.

Never include payment credentials, protected PII, or sensitive notes.
