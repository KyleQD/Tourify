import type { SupabaseClient } from '@supabase/supabase-js'

/** Rows from job_posting_templates after insert (published). */
export interface JobPostingTemplateRow {
  id: string
  venue_id: string | null
  title: string
  description: string | null
  department: string | null
  position: string | null
  employment_type: string | null
  location: string | null
  number_of_positions: number | null
  salary_range?: Record<string, unknown> | null
  requirements?: string[] | null
  responsibilities?: string[] | null
  benefits?: string[] | null
  skills?: string[] | null
  experience_level: string | null
  remote?: boolean | null
  urgent?: boolean | null
  required_certifications?: string[] | null
  role_type?: string | null
  age_requirement?: number | null
  background_check_required?: boolean | null
  drug_test_required?: boolean | null
  uniform_provided?: boolean | null
  training_provided?: boolean | null
  status?: string | null
}

function defaultsForBoard(template: JobPostingTemplateRow) {
  return {
    title: template.title,
    description: template.description || '',
    department: template.department || 'General',
    position: template.position || 'Role',
    employment_type: (template.employment_type || 'contractor') as
      | 'full_time'
      | 'part_time'
      | 'contractor'
      | 'volunteer',
    location: template.location || 'TBD',
    number_of_positions: template.number_of_positions ?? 1,
    salary_range: template.salary_range ?? null,
    requirements: template.requirements?.length ? template.requirements : ['See posting'],
    responsibilities: template.responsibilities?.length ? template.responsibilities : ['See posting'],
    benefits: template.benefits ?? [],
    skills: template.skills ?? [],
    experience_level: (template.experience_level || 'entry') as
      | 'entry'
      | 'mid'
      | 'senior'
      | 'executive',
    remote: Boolean(template.remote),
    urgent: Boolean(template.urgent),
    required_certifications: template.required_certifications ?? [],
    role_type: (template.role_type || 'other') as
      | 'security'
      | 'bartender'
      | 'street_team'
      | 'production'
      | 'management'
      | 'other',
    background_check_required: Boolean(template.background_check_required),
    drug_test_required: Boolean(template.drug_test_required),
    uniform_provided: Boolean(template.uniform_provided),
    training_provided: Boolean(template.training_provided),
    age_requirement: template.age_requirement ?? null,
    status: (template.status || 'published') as 'draft' | 'published' | 'paused' | 'closed',
  }
}

/**
 * Mirror a job_posting_templates row to job_board_postings and organization_job_postings
 * so public /api/job-board and org profiles stay in sync.
 */
export async function publishJobTemplateToBoardSurfaces(
  supabase: SupabaseClient,
  input: {
    template: JobPostingTemplateRow
    userId: string
    organizationId: string
    organizationName: string
    organizationLogo?: string | null
    organizationDescription?: string | null
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { template, userId, organizationId, organizationName } = input
  const base = defaultsForBoard(template)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const row = {
    ...base,
    venue_id: template.venue_id,
    organization_id: organizationId,
    organization_name: organizationName,
    organization_logo: input.organizationLogo ?? null,
    organization_description: input.organizationDescription ?? null,
    created_by: userId,
    applications_count: 0,
    views_count: 0,
    is_featured: false,
    expires_at: expiresAt,
    template_id: template.id,
  }

  const { error: boardErr } = await supabase.from('job_board_postings').insert(row)
  if (boardErr) {
    console.warn('[publishJobTemplateToBoardSurfaces] job_board_postings:', boardErr.message)
    return { ok: false, error: boardErr.message }
  }

  const { is_featured: _drop, ...orgPayload } = row
  const { error: orgErr } = await supabase.from('organization_job_postings').insert(orgPayload)

  if (orgErr) {
    console.warn('[publishJobTemplateToBoardSurfaces] organization_job_postings:', orgErr.message)
    await supabase.from('job_board_postings').delete().eq('template_id', template.id)
    return { ok: false, error: orgErr.message }
  }

  return { ok: true }
}
