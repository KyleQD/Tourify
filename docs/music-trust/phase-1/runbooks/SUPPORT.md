# Music Trust Support Runbook

## Scope

Use this process for declaration, origin-processing, evidence-upload, and certification-status questions. Support must not interpret a trust label as a legal ownership ruling.

## Triage

1. Record the track ID, case public ID, user ID, timestamp, and the user-visible error code. Never request signed URLs or credentials.
2. Confirm the relevant feature flag and whether the track is a legacy row (`trust_schema_version = 0`).
3. For `repair_required`, keep the track private and run the reconciliation job. Escalate unresolved rows to engineering.
4. For origin failures, use the event/error code. Retry transient storage or `ffprobe` failures; treat `fpcalc_missing` as a worker-capability incident only when fingerprinting is enabled.
5. For review questions, share only artist-visible case events. Never expose reviewer identity, internal notes, evidence paths, or detector scores.

## Service targets

- Upload/repair issue: acknowledge within one business day.
- Submitted certification: configuration-driven; do not promise a decision date unless operations has published one.
- Active impersonation or likeness risk: use the moderation incident runbook immediately.
