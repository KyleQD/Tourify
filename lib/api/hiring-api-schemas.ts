import { z } from "zod"

const hiringEntityTypeSchema = z.enum(["venue", "organization", "artist"])

export const hiringScopeApiSchema = z.object({
  entityType: hiringEntityTypeSchema.optional(),
  entity_type: hiringEntityTypeSchema.optional(),
  employerEntityType: hiringEntityTypeSchema.optional(),
  employer_entity_type: hiringEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  employerEntityId: z.string().uuid().optional(),
  employer_entity_id: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  venue_id: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
})

export const applicationFormFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "email", "phone", "date", "select", "multiselect", "file", "checkbox", "number"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  help_text: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.record(z.unknown()).optional(),
  order: z.number().int().nonnegative().optional(),
  profileField: z.boolean().optional(),
  profile_field: z.boolean().optional(),
})

export const createJobPostingApiSchema = hiringScopeApiSchema.extend({
  title: z.string().min(1),
  description: z.string().min(1),
  department: z.string().optional(),
  position: z.string().optional(),
  employment_type: z.string().optional(),
  location: z.string().optional(),
  role_type: z.string().optional(),
  event_date: z.string().nullable().optional(),
  number_of_positions: z.number().int().positive().max(1000).optional(),
  salary_range: z.record(z.unknown()).nullable().optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experience_level: z.string().optional(),
  remote: z.boolean().optional(),
  urgent: z.boolean().optional(),
  required_certifications: z.array(z.string()).optional(),
  application_form_template: z
    .object({
      fields: z.array(applicationFormFieldSchema).default([]),
    })
    .optional(),
  onboarding_template_id: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "closed", "archived"]).optional(),
}).superRefine((data, context) => {
  if (data.status === "published" && !data.onboarding_template_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["onboarding_template_id"],
      message: "An onboarding template is required before publishing a job posting.",
    })
  }
})

export const inviteStaffApiSchema = hiringScopeApiSchema.extend({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().min(1),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  employment_type: z.string().optional(),
  templateId: z.string().uuid().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  jobPostingId: z.string().uuid().nullable().optional(),
  job_posting_id: z.string().uuid().nullable().optional(),
})

export const applicationDecisionApiSchema = hiringScopeApiSchema.extend({
  action: z.enum(["approve", "reject", "waitlist", "shortlist", "mark_reviewed"]),
  reason: z.string().optional(),
  note: z.string().optional(),
  onboarding_template_id: z.string().uuid().optional(),
})

export const bulkApplicationDecisionApiSchema = hiringScopeApiSchema.extend({
  action: z.enum(["approve", "reject", "waitlist", "shortlist", "mark_reviewed"]),
  application_ids: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
  note: z.string().optional(),
  onboarding_template_id: z.string().uuid().optional(),
})

export const applicationStarApiSchema = hiringScopeApiSchema.extend({
  is_starred: z.boolean(),
})

export const submitJobApplicationApiSchema = z.object({
  job_posting_id: z.string().uuid(),
  form_responses: z.record(z.unknown()).default({}),
  cover_letter: z.string().optional(),
  applicant_name: z.string().optional(),
  applicant_email: z.string().email().optional(),
  applicant_phone: z.string().optional(),
})
