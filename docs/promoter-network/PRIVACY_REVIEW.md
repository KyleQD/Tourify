# Event Promoter Network privacy review

## Data purpose and minimization

The feature processes opaque tracking-link hashes, server-resolved attribution
context, campaign membership, commission evidence, and finance settlement state
to operate referral attribution and promoter compensation. It does not expose
buyer identity, payment references, raw IP addresses, raw tracking tokens, or
raw user-agent data in promoter or organizer dashboards.

## Access boundaries

- Promoters read only their own earnings and payout summaries.
- Organizers read event-scoped analytics without payment references, tracking
  tokens, or buyer data.
- Finance investigation endpoints require an acting organization plus finance
  capability and use a server-only, revalidated service-role job.
- Financial, risk, hold, batch-event, and operational telemetry tables use RLS,
  direct-client privilege revocation, and explicit deny policies.

## Telemetry

`promoter_network_operational_events` accepts only event type, outcome, optional
duration, correlation ID, and safe operational metadata. Database checks and the
server helper reject buyer IDs, payment references, tracking tokens, IP addresses,
and user-agent fields.

## Retention and deletion

Commission, reversal, allocation, risk, and audit entries are retained according
to Tourify's financial/legal retention policy. Attribution/session records are
minimized and must follow the platform privacy-retention schedule. Erasure or
access requests require legal review where financial retention obligations apply;
do not delete immutable financial evidence ad hoc.

## Outstanding approval

Before automatic payouts, document and approve promoter payout readiness:
identity/KYC, tax treatment, sanctions screening, Stripe Connect account status,
refund reserve/offset policy, and the lawful basis/notice for each new field.
