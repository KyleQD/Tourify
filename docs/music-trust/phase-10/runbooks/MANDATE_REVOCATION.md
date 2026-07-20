# Runbook — Mandate Revocation

1. DELETE `/api/creator-federation/mandates?id=...` → status `revoked`.
2. Confirm outbox `mandate.revoked` event.
3. Run `npm run music:creator-federation-outbox-worker`.
4. Block any subsequent service calls relying on that mandate scope.
5. No subdelegation without explicit approval (shell forces `allow_subdelegation=false`).
