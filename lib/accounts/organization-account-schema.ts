import { z } from 'zod'

export const OrganizerAccountSchema = z.object({
  organization_name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().max(1000).optional(),
  organization_type: z.string().min(1),
  subtype: z.string().optional(),
  url_slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .max(40)
    .optional()
    .or(z.literal('')),
  contact_info: z.record(z.unknown()).optional(),
  social_links: z.record(z.string()).optional(),
  specialties: z.array(z.string()).optional(),
})

/** Alias for Organization naming */
export const OrganizationAccountSchema = OrganizerAccountSchema

export type OrganizerAccountInput = z.infer<typeof OrganizerAccountSchema>
