import { z } from "zod"

export const hiringDocumentTypeSchema = z.enum([
  "general_document",
  "certification",
  "id_document",
  "waiver",
  "tax_document",
  "payment_document",
  "license",
  "background_check",
])

export const hiringDocumentStatusSchema = z.enum([
  "missing",
  "uploaded",
  "needs_review",
  "approved",
  "rejected",
  "expired",
])

export const uploadHiringDocumentFormSchema = z.object({
  token: z.string().min(8).optional(),
  candidate_id: z.string().uuid().optional(),
  staff_member_id: z.string().uuid().optional(),
  employer_entity_type: z.enum(["venue", "organization", "artist"]).optional(),
  employer_entity_id: z.string().uuid().optional(),
  field_id: z.string().max(120).optional(),
  label: z.string().max(160).optional(),
  credential_type: z.string().max(120).optional(),
  document_type: hiringDocumentTypeSchema.default("general_document"),
  expires_at: z.string().datetime().optional(),
})

export const reviewHiringDocumentSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "needs_review"]),
  review_notes: z.string().max(1000).optional(),
})

export const complianceCandidateQuerySchema = z.object({
  entity_type: z.enum(["venue", "organization", "artist"]),
  entity_id: z.string().uuid(),
})
