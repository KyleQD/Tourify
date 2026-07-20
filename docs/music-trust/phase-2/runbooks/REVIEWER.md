# Rights Passport — Reviewer Runbook

## Roles

Certification reviewer, rights-data reviewer, dispute specialist. Use least privilege (`music.rights.review`). Declare conflicts of interest before acting on a project you are connected to.

## Queues

- Incomplete identity / duplicate recording / conflicting ISRC
- Claim over-allocation / missing contributor
- Evidence anomaly / AI-disclosure concern
- Agreement/signature issue / external notice
- Appealed decision / passport suspension

Admin APIs:

- Review: `PATCH /api/admin/content/music/rights/review`
- Disputes: `GET|POST|PATCH /api/admin/content/music/rights/disputes`

## Dispute effects

Depending on severity: mark claims disputed, block passport issuance, suspend public badge, freeze protected derivatives, freeze future financial activation, preserve playback if policy allows, narrow public notice, preserve prior evidence.

## Passport status actions

`suspend` / `reactivate` / `revoke` / `supersede` update passport, current version, and credentials with reason codes and audit events. Prefer idempotent `request_id`.

## Conflicts of interest

If you have a personal, business, or representation relationship to a party on the project, reassign. Record the conflict in internal notes only (never artist-visible).

## Do not

- Adjudicate ownership beyond evidence procedures
- Merge DMCA takedown records into dispute rows
- Expose detector scores or internal findings to artists
- Approve adversarial audio processors for production
