import { z } from "zod"

export const candidateStatusSchema = z.enum([
  "pending",
  "in_progress",
  "submitted",
  "completed",
  "rejected",
  "approved",
])

export const candidateStageSchema = z.enum([
  "invitation",
  "onboarding",
  "documents",
  "review",
  "approved",
  "rejected",
])

export const candidateKanbanFiltersSchema = z.object({
  search: z.string().default(""),
  department: z.string().default("all"),
  position: z.string().default("all"),
  complianceStatus: z.string().default("all"),
  status: z.string().default("all"),
})

export const updateCandidateStatusSchema = z.object({
  candidateId: z.string().uuid(),
  nextStatus: candidateStatusSchema,
  nextStage: candidateStageSchema.optional(),
  note: z.string().max(1000).optional(),
})

export const reviewCandidateDocumentSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().max(1000).optional(),
})

export type CandidateKanbanFiltersInput = z.infer<typeof candidateKanbanFiltersSchema>
export type UpdateCandidateStatusPayload = z.infer<typeof updateCandidateStatusSchema>
export type ReviewCandidateDocumentPayload = z.infer<typeof reviewCandidateDocumentSchema>
