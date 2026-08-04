# PUB-103 — Channel adapter contract

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

In-app is first-class; email/SMS/push adapters expose request, provider ID, delivery state, retryability, and cost/consent metadata.

## Contract

`lib/admin/publication-channel-adapters.ts`

| Channel | First-class | Provider ID | Default consent |
|---|---|---|---|
| `in_app` | yes | `tourify.in_app` | org_policy / granted |
| `email` | no | `resend` | user_preference / required |
| `sms` | no | `twilio` | explicit_opt_in / required |
| `push` | no | `expo` | user_preference / required |

Each `send()` returns:

- `state` (`accepted` | `queued_provider` | `sent` | `delivered` | `failed` | `suppressed`)
- `providerId` / `providerRef`
- `retryable` + `errorClass`
- `consent` + `cost` metadata echoed from the request

## Integration

- Email/SMS/push reuse `lib/services/notification-channels.ts` transport.
- In-app persists to `notifications` with publication metadata (`idempotency_key`, `snapshot_id`, etc.).
- PUB-204 / delivery workers will call `getPublicationChannelAdapter(channel).send(...)`.
