# Background Jobs and Observability

## Reuse current worker patterns

The integration guide identifies `scripts/music-preview-worker.ts` and `music_preview_generation_jobs`. Audit whether a shared jobs/outbox system already exists before introducing a new queue.

## Required asynchronous work

- source SHA-256 calculation
- technical audio metadata extraction
- acoustic fingerprinting
- duplicate matching
- origin manifest issuance
- optional evidence scanning
- notification delivery
- certification status reconciliation

Do not run FFmpeg or expensive audio analysis in the create request.

## Job lifecycle

Use:

- `pending`
- `processing`
- `complete`
- `failed`
- `dead_letter`

Record attempts, next retry, last error, worker version, and idempotency key.

## Observability

Track:

- upload create success/failure
- storage cleanup failures
- declaration write failures
- origin job latency and failure rate
- fingerprint collision/review signals
- certification funnel conversion
- review turnaround
- appeal and reversal rates
- false-positive detector outcomes
- public verification traffic

Logs must not contain private evidence contents or signed URLs.
