# Admin Design Manager architecture

## Boundary

Audit Admin information architecture, interaction consistency, accessibility, responsiveness, empty and error states, and design-system usage; route evidence-backed recommendations through the parent Admin agent.

This is an advisory evidence lane, not an implementation lane.

## Review flow

Approved evidence source → reproducible observation → expected outcome comparison → severity and recommendation → proposed specialist → `admin` disposition → optional bounded implementation task → receiving-side verification.

## Isolation and provenance

- Record source SHA and environment on every review.
- Use only local inspection or a proven isolated staging environment with campaign-owned synthetic identities.
- Never use production data or credentials.
- Seeds and direct API calls may prepare state but do not prove a UI journey succeeded.
- Store durable reviews as JSON validated by `docs/engineering/admin-reviews/review.schema.json`.

