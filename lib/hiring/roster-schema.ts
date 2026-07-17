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
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const updateRosterStatusSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  status: rosterMemberStatusSchema,
  reason: z.string().max(1000).optional(),
})

export const createRosterMemberSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  source: z.enum(["invite", "existing_user", "manual"]).default("manual"),
  user_id: z.string().uuid().optional(),
  name: z.string().max(160).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(60).optional(),
  position: z.string().max(160).optional(),
  department: z.string().max(160).optional(),
  employment_type: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
  onboarding_template_id: z.string().uuid().optional(),
})

export const updateRosterMemberSchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  status: rosterMemberStatusSchema.optional(),
  name: z.string().max(160).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  position: z.string().max(160).nullable().optional(),
  department: z.string().max(160).nullable().optional(),
  employment_type: z.string().max(80).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  permissions: z.record(z.unknown()).nullable().optional(),
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
