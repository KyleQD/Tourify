# Certification Upsell and Workflows

## Post-upload upsell

After a successful upload, show:

```text
Your track is live.
✓ Rights declaration recorded
✓ AI disclosure recorded
✓ Private source secured
○ Origin record processing
○ Human-created certification not requested
○ Rights Passport not issued
```

Primary action: **Certify this track**.

## Certification products

### Origin Record

Automated or lightly reviewed:

- artist identity association
- upload timestamp
- source file hash
- declaration snapshot
- metadata manifest
- public locator if enabled

Claim: Tourify recorded this file, metadata, and declaration on a particular date.

### Human-Created Certification

Evidence-based:

- enhanced identity verification if configured
- source/master comparison
- stems, drafts, demos, or session evidence
- contributor AI declarations where needed
- technical review
- human review
- public credential and badge

Claim: the release passed a named version of Tourify's certification standard.

### Rights Passport

Later scope:

- composition/master separation
- contributors and authority
- rights claims and splits
- agreements
- identifiers and registry links
- versioned rights credential

## Case workflow

`not_requested → draft → submitted → in_review`

Then one of:

- `needs_information → submitted`
- `approved`
- `rejected`
- `withdrawn`

After approval:

- `approved → suspended → approved`
- `approved/suspended → revoked`
- material changes create a new case/version rather than rewriting the old certificate

## Evidence controls

- Evidence remains private.
- Reviewers see only what their capability permits.
- Public pages display narrow outcomes, not identity documents, contracts, signatures, or private percentages.
- Every reviewer action is recorded in an append-only event log.
