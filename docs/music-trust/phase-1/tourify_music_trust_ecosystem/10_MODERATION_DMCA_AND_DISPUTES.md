# Moderation, DMCA, and Disputes

## Existing moderation integration

Extend the current admin music moderation surface. Do not create an unrelated admin application.

Add review signals:

- suspected duplicate
- conflicting ISRC
- AI-policy concern
- rights declaration concern
- active infringement report
- certification evidence concern
- certificate suspension/revocation

## Required operational flows

### Content report

Existing report routes should allow users to report:

- ownership/infringement
- impersonation
- unauthorized voice/likeness
- undisclosed generated music
- incorrect certification
- harmful or prohibited content

### Certification dispute

A named contributor or rights claimant can challenge a certification. The dispute does not automatically decide copyright ownership; it can suspend the public certificate pending review.

### DMCA

Before broad public hosting, Tourify needs:

- published designated agent information
- notice intake
- counter-notice flow
- expeditious removal workflow
- repeat-infringer policy
- immutable case log
- reupload/fingerprint review

## Safety rules

- Do not publicly accuse an artist based only on an AI detector.
- Do not silently edit declarations or issued certificates.
- Suspension is reversible; revocation is preserved historically.
- Admin access must use current capability checks found during audit.
