import { z } from "zod"
import type {
  ApplicationFormFieldDefinition,
  CreateJobPostingActionInput,
  JobPostingFormValues,
} from "@/types/job-posting-builder"
import type { HiringEntity } from "@/types/hiring-entity"

export const applicationFormFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "email",
  "phone",
  "date",
  "select",
  "multiselect",
  "file",
  "checkbox",
  "number",
])

export const applicationFieldValidationSchema = z.object({
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  regex: z.string().optional(),
  fileTypes: z.array(z.string()).optional(),
  maxFileSizeMb: z.coerce.number().optional(),
})

export const applicationFieldSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, "Field name is required"),
    label: z.string().min(1, "Field label is required"),
    type: applicationFormFieldTypeSchema,
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    help_text: z.string().optional(),
    options: z.array(z.string()).optional(),
    validation: applicationFieldValidationSchema.optional(),
    order: z.coerce.number().int().nonnegative(),
  })
  .superRefine((field, context) => {
    const usesOptions = field.type === "select" || field.type === "multiselect"

    if (usesOptions && (!field.options || field.options.length === 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Select fields need at least one option.",
      })
    }
  })

export const jobSalaryRangeSchema = z
  .object({
    min: z.coerce.number().min(0).optional().nullable(),
    max: z.coerce.number().min(0).optional().nullable(),
    type: z.enum(["hourly", "salary", "daily", "flat"]).optional().nullable(),
  })
  .optional()
  .nullable()

export const jobPostingFormSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    department: z.string().min(1, "Department is required"),
    position: z.string().min(1, "Position is required"),
    employment_type: z.enum(["full_time", "part_time", "contractor", "volunteer", "intern"]),
    location: z.string().optional(),
    role_type: z.string().optional(),
    number_of_positions: z.coerce.number().int().min(1).max(1000),
    salary_range: jobSalaryRangeSchema,
    requirements: z.array(z.string()).default([]),
    responsibilities: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
    experience_level: z.enum(["entry", "mid", "senior", "executive", "any"]).optional(),
    remote: z.boolean().default(false),
    urgent: z.boolean().default(false),
    required_certifications: z.array(z.string()).default([]),
    application_form_template: z
      .object({
        fields: z.array(applicationFieldSchema).default([]),
      })
      .default({ fields: [] }),
    onboarding_template_id: z.string().uuid().nullable().optional().or(z.literal("")),
    status: z.enum(["draft", "published", "closed", "archived"]).default("draft"),
  })
  .superRefine((data, context) => {
    const min = data.salary_range?.min
    const max = data.salary_range?.max

    if (typeof min === "number" && typeof max === "number" && max < min) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salary_range", "max"],
        message: "Maximum compensation cannot be lower than minimum compensation.",
      })
    }
  })

export const createJobPostingActionSchema = jobPostingFormSchema.extend({
  employer_entity_type: z.enum(["venue", "organization", "artist"]),
  employer_entity_id: z.string().uuid(),
  venue_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
  tour_id: z.string().uuid().nullable().optional(),
})

export function getDefaultApplicationFields(): ApplicationFormFieldDefinition[] {
  return [
    {
      id: "legal_name",
      name: "legal_name",
      label: "Legal name",
      type: "text",
      required: true,
      placeholder: "Full legal name",
      helpText: "Use the name that appears on your legal documents.",
      order: 0,
    },
    {
      id: "phone",
      name: "phone",
      label: "Phone number",
      type: "phone",
      required: true,
      placeholder: "Best number to reach you",
      order: 1,
    },
    {
      id: "experience_summary",
      name: "experience_summary",
      label: "Relevant experience",
      type: "textarea",
      required: true,
      placeholder: "Tell us about your relevant event, production, tour, venue, or hospitality experience.",
      order: 2,
    },
  ]
}

export function getDefaultJobPostingValues(initialData?: Partial<JobPostingFormValues>): JobPostingFormValues {
  return {
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    department: initialData?.department ?? "",
    position: initialData?.position ?? "",
    employment_type: initialData?.employment_type ?? "contractor",
    location: initialData?.location ?? "",
    role_type: initialData?.role_type ?? "",
    number_of_positions: initialData?.number_of_positions ?? 1,
    salary_range: initialData?.salary_range ?? null,
    requirements: initialData?.requirements ?? [],
    responsibilities: initialData?.responsibilities ?? [],
    benefits: initialData?.benefits ?? [],
    skills: initialData?.skills ?? [],
    experience_level: initialData?.experience_level ?? "any",
    remote: initialData?.remote ?? false,
    urgent: initialData?.urgent ?? false,
    required_certifications: initialData?.required_certifications ?? [],
    application_form_template: initialData?.application_form_template ?? {
      fields: getDefaultApplicationFields(),
    },
    onboarding_template_id: initialData?.onboarding_template_id ?? null,
    status: initialData?.status ?? "draft",
    id: initialData?.id,
  }
}

export function normalizeFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function normalizeJobPostingPayload({
  employer,
  values,
}: {
  employer: HiringEntity
  values: JobPostingFormValues
}): CreateJobPostingActionInput {
  const parsed = jobPostingFormSchema.parse(values)

  return {
    ...parsed,
    employer_entity_type: employer.entityType,
    employer_entity_id: employer.entityId,
    venue_id: employer.entityType === "venue" ? employer.entityId : employer.scope?.venueId ?? null,
    event_id: employer.scope?.eventId ?? null,
    tour_id: employer.scope?.tourId ?? null,
    onboarding_template_id: parsed.onboarding_template_id || null,
    application_form_template: {
      fields: parsed.application_form_template.fields
        .map((field, index) => ({
          ...field,
          id: field.id || field.name,
          name: normalizeFieldName(field.name || field.label),
          helpText: field.helpText || field.help_text,
          order: index,
        }))
        .filter((field) => field.name.length > 0),
    },
  }
}
