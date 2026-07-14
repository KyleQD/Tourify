# Phase 11 — File Uploads, PII, and Compliance

## Purpose

Phase 11 makes the hiring onboarding pipeline safe for real worker documents and compliance-heavy onboarding flows.

This phase adds:

- Private Supabase Storage buckets for staff documents.
- A canonical onboarding upload API.
- Staff document metadata rows.
- Admin document review route.
- Compliance blocker evaluation.
- Sensitive-field redaction helpers.
- A reusable compliance status card.

No mock documents, mock candidates, mock compliance states, or fake upload responses are included.

## Files

```txt
types/hiring-compliance.ts
lib/hiring/hiring-compliance-schema.ts
lib/hiring/hiring-file-validation.ts
lib/hiring/sensitive-field-utils.ts
lib/services/hiring-onboarding-upload.service.ts
lib/services/hiring-compliance.service.ts
components/hiring/compliance-status-card.tsx
components/hiring/onboarding-module/secure-onboarding-upload-field.tsx
app/api/hiring/onboarding/upload/route.ts
app/api/hiring/onboarding/compliance/[candidateId]/route.ts
app/api/admin/onboarding/documents/[documentId]/review/route.ts
supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql
```

## Storage buckets

The migration creates private buckets:

```txt
staff-documents
staff-certifications
staff-id-documents
staff-waivers
```

All bucket access should stay private. Uploads are mediated by `/api/hiring/onboarding/upload`; reads should use signed URLs after token or employer permission validation.

## Upload API

`POST /api/hiring/onboarding/upload` accepts `multipart/form-data`.

Required:

```txt
file
document_type
```

One of the following access contexts is required:

```txt
token
```

or:

```txt
Authorization session/cookie/bearer
employer_entity_type
employer_entity_id
```

Optional metadata:

```txt
candidate_id
staff_member_id
field_id
label
credential_type
expires_at
```

The API validates:

- token/session scope
- employer scope
- file size
- MIME type
- file extension
- document bucket mapping

It writes a `staff_documents` row and returns the stored document metadata.

## PII handling

This phase includes `sensitive-field-utils.ts` for:

- identifying sensitive fields
- redacting sensitive responses
- generating credential summaries

Cursor should connect these helpers to the existing `employee-credentials-vault.ts` if it exists in the repo.

Do not store raw SSN, bank info, or tax fields directly inside normal `onboarding_responses` JSON.

Sensitive field types include:

```txt
ssn
bank_info
tax_info
id_document
```

## Compliance checks

`HiringComplianceService` evaluates required template fields against:

- onboarding responses
- uploaded staff documents
- document review status
- blocking flags
- admin review requirements

A field can block completion when:

```ts
blocking: true
required: true
```

A document can require admin review when:

```ts
requiresAdminReview: true
```

## Merge guidance

1. If `staff_documents` already exists, merge the new columns instead of replacing the table.
2. If storage buckets already exist, keep existing bucket names and adjust `hiring-file-validation.ts`.
3. If the repo already has a service-role Supabase helper, replace `createHiringServiceClient()` imports with that helper.
4. If Phase 5 `OnboardingUploadField` is already in use, either update it to send the token as form data or use the compatible header supported by this route.
5. If the repo already has document review routes, merge the permission-checked review logic into the existing route.
6. Do not make storage buckets public.
7. Do not let client components write directly to `staff_documents`.

## Validation

Run:

```bash
pnpm typecheck
pnpm lint
```

Then test with real data:

```txt
POST /api/hiring/onboarding/upload with a valid onboarding token
POST /api/hiring/onboarding/upload as an employer admin
GET  /api/hiring/onboarding/compliance/<candidate_id>?entity_type=venue&entity_id=<venue_id>
PATCH /api/admin/onboarding/documents/<document_id>/review
```

Validate:

- file lands in the expected private bucket
- `staff_documents` row is created
- employer scope is populated
- candidate scope is populated
- invalid MIME types are rejected
- oversized files are rejected
- document review is employer-scoped
- compliance blockers are returned for missing required docs
