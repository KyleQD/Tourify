# 11 — Rollout Plan

## Deployment principles

- Deploy database and compatibility code before enabling features.
- Separate code deployment from feature activation.
- Keep native playback independent.
- Use flags for import, display, and playback surfaces.
- Monitor provider and player metrics at every stage.

## Stages

### Stage 0 — Audit and baseline

- Document existing architecture.
- Capture native player metrics and error rates.
- Confirm current Audius integration requirements.
- Define flags and rollback owners.

### Stage 1 — Dark infrastructure

- Apply additive migrations.
- Deploy provider contracts, adapter, registry, and disabled APIs.
- Run internal health checks.
- No user-facing changes.

### Stage 2 — Internal team

- Enable Audius search/import for internal accounts.
- Enable playback on test profiles.
- Validate logs, analytics, browser behavior, and support messaging.

### Stage 3 — Design partners

- Enable for a small set of artists.
- Limit supported surfaces to artist manager and public profile.
- Review duplicate handling and provider availability.

### Stage 4 — Limited beta

- Expand to a small percentage or selected accounts.
- Add feed attachment only after player reliability meets threshold.
- Monitor native-track regression separately.

### Stage 5 — General availability

- Enable supported surfaces broadly.
- Publish support documentation.
- Maintain rapid disable switches.

## Feature flags

At minimum, separate:

- Provider backend availability.
- Search/import UI.
- Public-profile playback.
- Feed/post attachment.
- Optional provider health fallback behavior.

## Rollback strategy

### Immediate operational rollback

1. Disable user-facing Audius flags.
2. Disable playback resolution for Audius provider.
3. Keep native provider enabled.
4. Preserve imported references and canonical records.
5. Display existing Audius-linked tracks as temporarily unavailable or hide them according to product policy.

### Code rollback

Revert application release only if compatibility is preserved. Database additions remain. Avoid rolling back migrations unless a new object creates a verified production incident; use a forward corrective migration.

### Provider incident response

- Mark provider degraded.
- Stop retries that amplify rate limits.
- Communicate status in player error UI where needed.
- Preserve queues and allow skip to native tracks.

## Monitoring gates

Progress to the next stage only when:

- Playback start success meets threshold.
- p95 resolve latency meets budget.
- No material native regression.
- Error taxonomy and alerts work.
- Support and rollback runbooks are tested.

## Dependencies

- Feature flag capability.
- Operational dashboards and alerts.
- Support owner.
- Legal/terms review.
- Production-like test environment.

## Acceptance criteria

- Audius can be disabled without redeploying.
- Rollback does not require deleting imported records.
- Cohort rollout is measurable.
- Stage gates and owners are recorded.
