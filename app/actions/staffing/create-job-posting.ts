'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'
import {
  publishJobTemplateToBoardSurfaces,
  type JobPostingTemplateRow,
} from '@/lib/job-board/publish-template-to-board'

const schema = z.object({
  venueId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(10),
  department: z.string().min(1),
  position: z.string().min(1),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  location: z.string().min(1),
  experience_level: z.enum(['entry', 'mid', 'senior', 'executive']),
  remote: z.boolean().optional().default(false),
  urgent: z.boolean().optional().default(false),
  requirements: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  number_of_positions: z.number().int().min(1).max(100).optional().default(1),
  // Enhanced
  event_id: z.string().uuid().optional(),
  event_date: z.string().optional(),
  required_certifications: z.array(z.string()).optional().default([]),
  role_type: z.enum(['security', 'bartender', 'street_team', 'production', 'management', 'other']).optional(),
  shift_duration: z.number().int().min(1).max(24).optional(),
  age_requirement: z.number().int().min(18).max(99).optional(),
  background_check_required: z.boolean().optional().default(false),
  drug_test_required: z.boolean().optional().default(false),
  uniform_provided: z.boolean().optional().default(false),
  training_provided: z.boolean().optional().default(false),
  application_form_template: z
    .object({
      fields: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          label: z.string(),
          type: z.enum(['text','textarea','email','phone','date','select','multiselect','file','checkbox','number']),
          required: z.boolean(),
          placeholder: z.string().optional(),
          description: z.string().optional(),
          options: z.array(z.string()).optional(),
          validation: z.object({ min: z.number().optional(), max: z.number().optional(), pattern: z.string().optional(), custom: z.string().optional() }).optional(),
          order: z.number().int()
        })
      )
    })
    .optional()
    .default({ fields: [] })
})

export type CreateJobPostingInput = z.infer<typeof schema>

export async function createJobPosting(input: CreateJobPostingInput) {
  const data = schema.parse(input)
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id
  if (!userId) return { ok: false, error: 'Not authenticated' as const }

  const allowed = await hasEntityPermission({
    userId,
    entityType: 'Venue',
    entityId: data.venueId,
    permission: 'ASSIGN_EVENT_ROLES',
  })
  if (!allowed) return { ok: false, error: 'Forbidden' as const }

  const insertPayload: any = {
    venue_id: data.venueId ?? null,
    created_by: userId,
    title: data.title,
    description: data.description,
    department: data.department,
    position: data.position,
    employment_type: data.employment_type,
    location: data.location,
    experience_level: data.experience_level,
    remote: data.remote,
    urgent: data.urgent,
    requirements: data.requirements,
    responsibilities: data.responsibilities,
    benefits: data.benefits,
    skills: data.skills,
    number_of_positions: data.number_of_positions,
    status: 'published',
    applications_count: 0,
    views_count: 0,
    // enhanced
    event_id: data.event_id ?? null,
    event_date: data.event_date ?? null,
    required_certifications: data.required_certifications,
    role_type: data.role_type ?? null,
    shift_duration: data.shift_duration ?? null,
    age_requirement: data.age_requirement ?? null,
    background_check_required: data.background_check_required,
    drug_test_required: data.drug_test_required,
    uniform_provided: data.uniform_provided,
    training_provided: data.training_provided,
  }

  // Insert posting
  const { data: posting, error } = await supabase
    .from('job_posting_templates')
    .insert(insertPayload)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  // Store form template if provided (optional)
  if (data.application_form_template?.fields?.length) {
    await supabase
      .from('application_form_templates')
      .insert({ job_posting_id: posting.id, fields: data.application_form_template })
  }

  // Public job board + org profile surfaces (non-fatal if tables missing in dev)
  try {
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('id', data.venueId)
      .maybeSingle()

    const orgName = venue?.name?.trim() || posting.title || 'Organization'
    const publishResult = await publishJobTemplateToBoardSurfaces(supabase, {
      template: posting as JobPostingTemplateRow,
      userId,
      organizationId: data.venueId,
      organizationName: orgName,
    })
    if (!publishResult.ok)
      console.warn('[createJobPosting] Board publish skipped:', publishResult.error)
  } catch (e) {
    console.warn('[createJobPosting] Board publish failed:', e)
  }

  // Optional: create vendor request for event staffing
  if (data.event_id) {
    await supabase.from('event_vendor_requests').insert({
      event_id: data.event_id,
      job_posting_template_id: posting.id,
      created_by: userId,
      status: 'pending',
      message: `Request to staff: ${data.title}`,
    })
  }

  return { ok: true, data: posting }
}


