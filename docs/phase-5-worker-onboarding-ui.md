# Phase 5 — Worker Onboarding UI Rebuild

## Purpose

Phase 5 introduces the worker-facing hiring onboarding experience for Tourify. This is the flow a hired applicant sees when they open a secure onboarding token link.

This phase does not rebuild the employer dashboard, application review panel, roster tools, or PII upload backend. Those are handled in later phases. The UI in this package consumes the real token payload created in Phase 3 at:

```txt
GET /api/onboarding/[token]
```

and submits real responses to:

```txt
POST /api/onboarding/[token]
```

## Files added

```txt
types/hiring-worker-onboarding.ts
components/hiring/onboarding-module/onboarding-stepper.tsx
components/hiring/onboarding-module/onboarding-upload-field.tsx
components/hiring/onboarding-module/onboarding-wizard-shell.tsx
components/hiring/onboarding-module/dynamic-onboarding-form.tsx
components/hiring/onboarding-module/onboarding-review-submit.tsx
components/hiring/onboarding-module/token-onboarding-flow.tsx
app/onboarding/[token]/page.tsx
app/onboarding/hire/[token]/page.tsx
```

## Real-data contract

The token flow expects the Phase 3 API route to return either:

```ts
{
  data: TokenOnboardingPayload
}
```

or the payload directly:

```ts
{
  invitation,
  candidate,
  employer,
  template,
  position,
  department,
  existingResponses,
  progress
}
```

The form fields come from `template.fields`. No local mock candidates, fake templates, fake activities, or fake stats are used.

## Supported field types

```txt
text
email
phone
date
select
multiselect
textarea
number
checkbox
file
address
emergency_contact
bank_info
tax_info
id_document
```

## Section grouping

Fields can provide a `section` property. Supported sections:

```txt
identity
contact
emergency_contact
work_eligibility
certifications
tax_payment
documents
waiver
custom
```

The review step is generated automatically.

## Upload behavior

`OnboardingUploadField` sends files to:

```txt
POST /api/hiring/onboarding/upload
```

with the onboarding token in:

```txt
x-onboarding-token
```

The upload endpoint itself is part of Phase 11 unless your repo already has a secure upload API. Until Phase 11, Cursor should either connect this field to the existing secure upload endpoint or leave the upload field compile-ready and disabled in templates that require files.

## Sensitive fields

The UI supports `bank_info`, `tax_info`, and `id_document` field types, but sensitive final storage must still be handled server-side through the credentials vault. The client should not be considered the enforcement layer for PII security.

## Merge rules

1. If `app/onboarding/[token]/page.tsx` already exists, preserve important existing redirects or metadata, but replace the page body with `TokenOnboardingFlow`.
2. If the repo already uses `/onboarding/hire/[token]`, keep that route as the canonical route and make `/onboarding/[token]` delegate or redirect later in Phase 12.
3. Do not add mock template fallback data to the UI.
4. Do not hardcode a venue, organization, artist, candidate, or position.
5. Do not create staff members from the client. Completion still belongs in `POST /api/onboarding/[token]`.
