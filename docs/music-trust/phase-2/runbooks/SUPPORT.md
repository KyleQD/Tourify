# Rights Passport — Support Runbook

## Scope

Artist-facing questions about protected derivatives, training reservation, passport badges, and dispute status. Support must not interpret a passport or badge as a legal ownership ruling.

## Triage

1. Collect track ID, project public ID, passport public ID, dispute public ID, timestamp, and user-visible error code.
2. Confirm feature flags: `music_c2pa_derivatives_enabled`, `music_watermark_beta_enabled`, `music_training_reservation_enabled`, `music_testnet_anchor_enabled`, `music_rights_ops_enabled` (all default off).
3. For derivative `failed`/`unpublished`: explain clean master is untouched; engineering retries via `music:rights-derivative-worker`.
4. For anchor `pending`/`failed`: off-chain passport remains valid; do not promise chain confirmation times.
5. Never share reviewer identity, internal notes, evidence paths, watermark confidence internals, or service-role credentials.

## Common answers

- **Training reservation:** `/legal/music-training-reservation` — preference signal, not scraper proof.
- **Missing C2PA:** not “fake”; may be unsupported or unpublished.
- **DMCA vs dispute:** separate processes; link IDs but do not merge concepts.

## Service targets

- Derivative/status questions: acknowledge within one business day.
- Active dispute: route to REVIEWER; do not promise resolution date.
- Suspected key compromise or leak: SECURITY runbook immediately.
