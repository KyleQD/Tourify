# 09 — Security & Compliance

## Security posture

Audius integration must not create an open proxy, expose privileged configuration, weaken Supabase RLS, or permit unauthorized users to attach content to artist profiles.

## Threats and controls

### Arbitrary URL proxying

Risk: attacker supplies a URL for Tourify to fetch or stream.

Controls:

- APIs accept provider ID and external track ID, not arbitrary URLs.
- Provider base URLs are server configuration.
- Allowlist provider hosts where appropriate.
- Disable redirects to unexpected hosts or validate redirect destinations.

### Unauthorized track attachment

Controls:

- Authenticate import actor.
- Resolve current acting account/profile.
- Use existing role and ownership helpers.
- Record actor and target profile.
- Test cross-account denial.

### Secret leakage

Controls:

- Server-only environment variables.
- Redact authorization headers and query credentials.
- Never include secrets in client bundles.
- Do not log full provider responses by default.

### Temporary stream URL leakage

Controls:

- Do not persist URLs.
- Do not include them in analytics.
- Use private/no-store responses.
- Redact URLs from structured logs.

### Rate abuse

Controls:

- Per-user/IP rate limits.
- Result and query-length caps.
- Short metadata caches.
- Backoff on provider rate limits.
- Admin visibility into abuse and provider errors.

## Supabase and RLS

- Provider-reference writes should occur through validated server paths or strict RLS.
- Public selects must inherit track visibility rules.
- Service-role credentials remain server-only.
- New tables require explicit RLS enablement and policy review.
- Test authenticated, anonymous, owner, manager, and unrelated-account access.

## Content, rights, and attribution

Before launch, verify current Audius requirements for:

- Branding and attribution.
- Linking back to Audius.
- Metadata display.
- API and stream usage.
- Caching restrictions.
- Removal/unavailability handling.

Tourify should not represent itself as the audio host where the stream is provided by Audius. The UI should provide provider attribution and a canonical external link where required.

## Privacy

- Collect only necessary provider IDs and public metadata.
- Do not infer ownership based solely on matching names.
- Document analytics purposes.
- Include imported provider records in relevant user-data export and deletion workflows where applicable.

## Compliance checklist

- Current official Audius terms reviewed and date recorded.
- Attribution requirements approved.
- Privacy policy impact reviewed.
- Analytics consent behavior preserved.
- Content takedown/unavailability path defined.
- Security review completed before external beta.

## Acceptance criteria

- No arbitrary fetch/proxy path exists.
- No service-role or provider secret reaches the browser.
- Cross-account import attempts fail.
- Temporary URLs are absent from persistence and logs.
- Provider disablement is immediate through configuration.
