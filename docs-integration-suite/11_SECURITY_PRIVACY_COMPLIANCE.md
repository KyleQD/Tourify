# 11 — Security, Privacy and Compliance

## Secrets

- Keep all provider credentials server-side.
- Never prefix secret keys with `NEXT_PUBLIC_`.
- Use the repository's approved environment and secret-management pattern.
- Rotate keys after suspected exposure.
- Mask secrets in logs and admin UI.
- Validate that source maps, error reporting and build artifacts do not reveal secrets.

## Supabase access control

- Enable RLS on all new exposed tables.
- Create policies based on actual ownership and account membership.
- Do not use user-editable metadata for authorization.
- Use `TO authenticated` together with ownership predicates.
- Include both `USING` and `WITH CHECK` for updates.
- Prefer security-invoker views.
- Keep necessary security-definer functions outside exposed schemas.
- Revoke public execute permissions from privileged functions.
- Set explicit safe search paths.
- Test policies with anon and multiple authenticated roles.
- Keep service-role credentials server-only.

## Location privacy

Browser geolocation requires express permission.

Tourify should:

- Explain why location is requested.
- Continue working after denial.
- Use session-only exact coordinates by default.
- Save a location only after an explicit user action.
- Prefer approximate saved locations.
- Allow deletion or change.
- Avoid sending precise user location to analytics.
- Avoid exposing coordinates publicly.
- Document retention and third-party sharing.
- Review applicable privacy law before launch.

## Provider terms

### Ticketmaster

Before production launch:

- Review current general and partner terms.
- Confirm allowed caching duration.
- Implement source removal.
- Use required attribution and branding.
- Do not create a Ticketmaster replacement experience.
- Do not use provider images as generic hosting.
- Do not sell or monetize API access outside approved structures.
- Use approved affiliate links if Tourify joins the affiliate program.
- Keep a provider-specific retention configuration.

### Bandsintown

- Do not use a single-artist API key for unrelated artists.
- Keep platform-wide mode disabled without partnership authorization.
- Scope artist-owned connections to the authorized artist.
- Follow current API and attribution requirements.
- Provide disconnect and data-removal controls.

## Content rights

Separate:

- Provider-owned fields.
- User-submitted fields.
- Tourify-generated metadata.
- User-uploaded images.
- Links to third-party checkout.

Track provenance for each external field or source record.

## Abuse prevention

Protect:

- Claim submissions.
- Provider connection verification.
- Search endpoints.
- Outbound ticket click tracking.
- Admin merge actions.
- Manual event submissions.

Controls:

- Rate limiting.
- CSRF protection where applicable.
- Input validation.
- URL allowlists or safe redirect handling.
- Malware and phishing checks for user-supplied links.
- Audit logs.
- Role checks.
- Moderation queue.

## Outbound links

- Validate URL scheme.
- Prevent open redirects.
- Record provider and event ID server-side.
- Add appropriate link attributes.
- Clearly indicate external checkout.
- Do not embed sensitive user data in query strings.

## Data minimization

Only retain:

- Canonical fields required for discovery.
- Source identity and update metadata.
- Ticket links needed for the product.
- Minimal troubleshooting data.
- Approved claim evidence.
- Aggregated analytics.

Do not store unrestricted provider payloads indefinitely.

## Incident and disable controls

Operations must be able to:

- Disable one provider.
- Revoke one connection.
- Stop all sync jobs.
- Remove a source record.
- Expire provider data.
- Rebuild the discovery index.
- Roll back a release flag.
- Preserve native events during every action.
