import { z } from "zod"

export const hiringApplicationActionSchema = z.enum([
  "approve",
  "reject",
  "shortlist",
  "waitlist",
  "mark_reviewed",
])

export const hiringApplicationDecisionSchema = z.object({
  action: hiringApplicationActionSchema,
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  reason: z.string().trim().max(2000).optional(),
  message: z.string().trim().max(2000).optional(),
  rating: z.number().min(1).max(5).optional(),
})

export const bulkHiringApplicationDecisionSchema = hiringApplicationDecisionSchema.extend({
  applicationIds: z.array(z.string().uuid()).min(1),
})

export const hiringApplicationReviewFiltersSchema = z.object({
  entity_type: z.enum(["venue", "organization", "artist"]),
  entity_id: z.string().uuid(),
  status: z.string().optional(),
  job_id: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  department: z.string().trim().optional(),
  starred: z.boolean().optional(),
})

export function buildHiringApplicationsQueryString(args: z.infer<typeof hiringApplicationReviewFiltersSchema>): string {
  const params = new URLSearchParams()

  params.set("entity_type", args.entity_type)
  params.set("entity_id", args.entity_id)

  if (args.status && args.status !== "all") params.set("status", args.status)
  if (args.job_id) params.set("job_id", args.job_id)
  if (args.search) params.set("search", args.search)
  if (args.department && args.department !== "all") params.set("department", args.department)
  if (args.starred) params.set("starred", "true")

  return params.toString()
}
