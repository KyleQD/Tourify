import { z } from "zod"

export const rosterMemberStatusSchema = z.enum([
  "pending",
  "active",
  "inactive",
  "suspended",
  "offboarded",
])

export const complianceStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "needs_review",
  "blocked",
  "compliant",
  "expired",
])

export const listRosterQuerySchema = z.object({
  entity_type: z.enum(["venue", "organization", "artist"]),
  entity_id: z.string().uuid(),
  status: z.union([rosterMemberStatusSchema, z.literal("all")]).optional(),
  compliance_status: z.union([complianceStatusSchema, z.literal("all")]).optional(),
  department: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const updateRosterStatusSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  status: rosterMemberStatusSchema,
  reason: z.string().max(1000).optional(),
})

export const assignShiftZoneSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
  shift_id: z.string().uuid().optional(),
  zone: z.string().max(120).optional(),
  assigned_manager_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export const exportRosterQuerySchema = z.object({
  entity_type: z.enum(["venue", "organization", "artist"]),
  entity_id: z.string().uuid(),
  status: z.union([rosterMemberStatusSchema, z.literal("all")]).optional(),
  compliance_status: z.union([complianceStatusSchema, z.literal("all")]).optional(),
  department: z.string().optional(),
  search: z.string().optional(),
})
