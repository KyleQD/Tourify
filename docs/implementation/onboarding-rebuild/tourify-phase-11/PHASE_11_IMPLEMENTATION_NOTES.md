# Phase 11 Implementation Notes

## What this package does

Phase 11 adds secure staff onboarding upload, PII redaction helpers, document review, and compliance checking.

It includes:

- Private Supabase Storage bucket migration.
- `staff_documents` metadata additions.
- Upload file validation by document type.
- Token-scoped and employer-scoped upload handling.
- Admin document review route.
- Compliance blocker evaluation for candidate onboarding.
- Sensitive field redaction helpers.
- Reusable compliance UI components.

## What this package does not do

It does not:

- Make storage buckets public.
- Store raw SSN/bank/tax values in public JSON fields.
- Implement full credentials vault encryption if the repo vault does not already exist.
- Complete Phase 12 route separation.
- Replace Phase 5 dynamic form wholesale.
- Add mock data.

## Important merge notes

1. If `staff_documents` already exists, merge columns and indexes instead of replacing the table.
2. If `CREATE POLICY IF NOT EXISTS` patterns exist elsewhere, keep this migration's `DO $$` blocks because PostgreSQL policies do not universally support `IF NOT EXISTS`.
3. If `staff_invitations` only uses `invitation_token` or only uses `token`, update the `.or()` token lookup in `HiringOnboardingUploadService`.
4. If the repo has a canonical credentials vault, connect `sensitive-field-utils.ts` into the token onboarding POST route so sensitive fields are stored through the vault and only redacted summaries remain in normal responses.
5. If Phase 5 upload fields already post `x-onboarding-token`, the upload route supports that header.
6. If your existing route helper uses cookies instead of bearer auth, merge with `getAuthenticatedUserId()` from Phase 4.

## Validation

Run:

```bash
pnpm typecheck
pnpm lint
```

Then validate real flows:

```txt
1. Upload an ID document with a valid onboarding token.
2. Upload a certification as an employer admin.
3. Confirm private bucket object exists.
4. Confirm staff_documents row contains employer_entity_type + employer_entity_id.
5. Review the document from admin route.
6. Fetch candidate compliance and confirm missing required docs block completion.
7. Confirm invalid MIME type and oversized upload return errors.
```
