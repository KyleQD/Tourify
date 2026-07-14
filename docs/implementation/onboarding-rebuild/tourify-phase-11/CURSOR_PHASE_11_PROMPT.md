You are implementing Phase 11 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 11 files only. Do not start Phase 12.

Add or merge:
- types/hiring-compliance.ts
- lib/hiring/hiring-compliance-schema.ts
- lib/hiring/hiring-file-validation.ts
- lib/hiring/sensitive-field-utils.ts
- lib/services/hiring-onboarding-upload.service.ts
- lib/services/hiring-compliance.service.ts
- components/hiring/compliance-status-card.tsx
- components/hiring/onboarding-module/secure-onboarding-upload-field.tsx
- app/api/hiring/onboarding/upload/route.ts
- app/api/hiring/onboarding/compliance/[candidateId]/route.ts
- app/api/admin/onboarding/documents/[documentId]/review/route.ts
- supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql
- docs/phase-11-file-uploads-pii-compliance.md
- .cursor/rules/phase_11_uploads_pii_compliance.md

Critical:
1. Do not add mock documents or fake compliance states.
2. Do not make Supabase Storage buckets public.
3. Do not store raw SSN, bank, or tax fields in normal onboarding_responses JSON.
4. If staff_documents already exists, merge columns instead of replacing the table.
5. If employee-credentials-vault.ts already exists, connect sensitive-field-utils.ts to that vault before production.
6. If staff_invitations uses only token or invitation_token, standardize lookup in HiringOnboardingUploadService.
7. Token uploads must resolve the candidate and employer scope before writing staff_documents.
8. Authenticated uploads and document review must check employer permissions.
9. Client components must not insert directly into storage or staff_documents.
10. Keep venue_id only as backward compatibility.

Run:
pnpm typecheck
pnpm lint

Real-data validation:
1. Upload a PDF waiver with a valid onboarding token.
2. Upload a security guard certification with a valid onboarding token.
3. Upload a document as an employer admin using employer_entity_type + employer_entity_id.
4. Confirm staff_documents has employer_entity_type and employer_entity_id.
5. Confirm files are in the expected private storage bucket.
6. Review a document using PATCH /api/admin/onboarding/documents/[documentId]/review.
7. Fetch GET /api/hiring/onboarding/compliance/[candidateId].
8. Confirm missing required blocking documents prevent completion.
9. Confirm rejected/expired docs are treated as compliance issues.

Stop after Phase 11 validation. Do not start Phase 12 persona route separation.
