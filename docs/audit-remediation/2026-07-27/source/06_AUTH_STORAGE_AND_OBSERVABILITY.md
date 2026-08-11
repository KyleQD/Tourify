# Auth, Storage, and Observability Hardening

## Auth current state

The sampled Auth traffic was generally healthy, and the observed Edge Functions required JWT verification. Remaining hardening items include:

- Leaked-password protection is not enabled.
- MFA options and enforcement are insufficient for privileged roles.
- Session, role-change, and JWT freshness behavior needs explicit review.
- Authorization must not depend on user-editable metadata.

## Auth implementation plan

### 1. Password protection

1. Enable leaked-password protection in a controlled change window.
2. Test signup, password change, recovery, and existing-user login behavior.
3. Provide clear user messaging without revealing whether a credential appears in a breach corpus.
4. Record support handling for users blocked during recovery.

### 2. MFA policy

Define requirements by role:

| Persona | Recommended policy |
|---|---|
| Platform admin | Mandatory enrollment and step-up for privileged actions |
| Organization admin | Mandatory or staged mandatory before finance/staff PII access |
| Venue admin | Mandatory or staged mandatory before staff/operational access |
| Artist/team admin | Recommended, then required for payout/rights-sensitive actions |
| General user | Optional enrollment with recovery support |

Implement:

- Enrollment.
- Challenge.
- Recovery codes or approved recovery path.
- Device loss handling.
- Step-up for security-sensitive actions.
- Admin enforcement.
- Audit events for enrollment, reset, and policy bypass.

### 3. Session and role-change behavior

Decide and test:

- Session duration and refresh.
- Forced revocation.
- Password-change revocation.
- MFA reset consequences.
- Removal from organization/venue/tour.
- Platform-admin removal.
- How quickly JWT/app metadata changes take effect.

Sensitive authorization should resolve from trusted app metadata or database membership, not user-editable metadata.

## Storage current state

Positive controls include private staff/document buckets and a generally sensible public/private split. Remaining issues include:

- Broad public listing behavior on `avatars`.
- A failed upload to an `artist-photos` cover path.
- Possible mismatch between code bucket/path references and live bucket registry.
- Need for explicit owner/entity prefixes and upload limits.

## Storage contract manifest

Inventory every active reference:

| Field | Example requirement |
|---|---|
| Bucket | Exact live name |
| Visibility | Public asset or private authenticated |
| Object prefix | User/entity/account/tenant ownership path |
| Allowed MIME | Explicit list |
| Max size | Numeric limit |
| Insert/update/delete | Persona rules |
| Listing | Disabled or tightly scoped |
| Database row link | Table/key and reconciliation rule |
| Retention | Business/legal requirement |
| Owner | Domain and engineering owner |

## Storage remediation

1. Map code references to live buckets.
2. Decide whether `artist-photos` is an additive new bucket or whether clients should use an existing canonical bucket.
3. Narrow avatar listing while preserving direct public image reads where required.
4. Enforce owner/entity prefixes.
5. Enforce MIME and size limits on both server and storage policy boundaries.
6. Test insert, select, update/upsert, delete, and cross-user denial.
7. Add dry-run reconciliation for:
   - Object without database row.
   - Database row without object.
   - Wrong owner prefix.
   - Invalid MIME/size metadata.
8. Do not automatically delete orphaned objects during remediation.

## Observability current state

Production feed code contains localhost debug ingest calls with fixed markers. Live logs also show repeated schema and permission errors.

## Debug removal and replacement

1. Remove localhost ingest calls and agent/session markers.
2. Require the production-debug scanner in CI.
3. Expand forbidden patterns and provide scanner fixtures.
4. Replace useful feed timings with approved server telemetry.
5. Use sampling and field allowlists.
6. Redact user content, tokens, secrets, PII, and unbounded query data.

## Error-signature register

Create one record per active signature:

| Field | Purpose |
|---|---|
| Signature ID | Stable identifier |
| First/last seen | Incident history |
| Route/RPC | Owning surface |
| Journey | User impact |
| Count/rate | Priority |
| Data-write risk | Partial-write or corruption risk |
| Owner | Named responder |
| Containment | Flag, hotfix, migration, or policy change |
| Resolution evidence | Test/deploy/log link |
| Observation window | Required zero-error duration |

Initial alert categories:

- Missing relation.
- Missing column.
- Permission denied.
- Function return mismatch.
- Schema-cache mismatch.
- Storage policy denial spike.
- Cross-tenant authorization anomaly.
- Backfill failure/checkpoint stall.
- Migration lock/latency threshold.

## Audit events

At minimum, record:

- Privileged role grant/revocation.
- MFA enrollment/reset.
- Production migration start/end/failure.
- Function grant changes.
- Feature-flag rollout changes.
- Backfill batch and exceptions.
- Admin access to sensitive hiring/finance data.
- Storage ownership/policy exceptions.

Audit events must avoid storing secrets or raw sensitive content.

## Completion gate

- Leaked-password protection works across Auth journeys.
- Privileged roles meet the approved MFA policy.
- Role removal and session revocation behavior is proven.
- Storage bucket/path references match live configuration.
- Public listing is minimized.
- All active upload operations pass allowed and denied personas.
- Debug artifacts are absent and blocked by CI.
- High-risk runtime signatures alert the correct owner.

## Related tracker prefixes

`AUTH-*`, `STO-*`, `OBS-*`, `RUN-004`, `REL-005`
