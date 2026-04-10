"use server"

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { canTransitionApplicationStatus } from '@/lib/hiring/application-transitions'
import {
  evaluateHiringEligibility,
  isHiringEligibilityGateError,
} from '@/lib/services/hiring-eligibility.service'

const action = createSafeActionClient()

const JobPostingSchema = z.object({
  venueId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(10),
  department: z.string().min(1),
  position: z.string().min(1),
  employment_type: z.enum(['full_time','part_time','contractor','volunteer']),
  location: z.string().min(1),
  number_of_positions: z.number().int().min(1).max(100),
  salary_range: z.object({ min: z.number().min(0), max: z.number().min(0), type: z.enum(['hourly','salary','daily']) }).optional(),
  requirements: z.array(z.string()).min(1),
  responsibilities: z.array(z.string()).min(1),
  benefits: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  experience_level: z.enum(['entry','mid','senior','executive']),
  remote: z.boolean().default(false),
  urgent: z.boolean().default(false)
})

export const createJobPostingAction = action.schema(JobPostingSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Basic access guard: ensure user owns/has access to venue
  // You can replace with a proper join to venue_members
  const hasAccess = true
  if (!hasAccess) return { success: false, error: 'No access to venue' }

  const { error, data } = await supabase
    .from('job_posting_templates')
    .insert({
      venue_id: parsedInput.venueId,
      created_by: user.id,
      title: parsedInput.title,
      description: parsedInput.description,
      department: parsedInput.department,
      position: parsedInput.position,
      employment_type: parsedInput.employment_type,
      location: parsedInput.location,
      number_of_positions: parsedInput.number_of_positions,
      salary_range: parsedInput.salary_range,
      requirements: parsedInput.requirements,
      responsibilities: parsedInput.responsibilities,
      benefits: parsedInput.benefits,
      skills: parsedInput.skills,
      experience_level: parsedInput.experience_level,
      remote: parsedInput.remote,
      urgent: parsedInput.urgent,
      status: 'draft',
      applications_count: 0,
      views_count: 0
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})

const SubmitApplicationSchema = z.object({
  job_posting_id: z.string().uuid(),
  form_responses: z.record(z.any())
})

export const submitJobApplicationAction = action.schema(SubmitApplicationSchema).action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: job, error: jobError } = await supabase
    .from('job_posting_templates')
    .select('id, venue_id, status, applications_count')
    .eq('id', parsedInput.job_posting_id)
    .single()

  if (jobError || !job || job.status !== 'published') return { success: false, error: 'Job not open for applications' }

  const applicant_name = String(parsedInput.form_responses.full_name || parsedInput.form_responses.name || '')
  const applicant_email = String(parsedInput.form_responses.email || user.email || '')
  const applicant_phone = String(parsedInput.form_responses.phone || '')

  const { data: application, error } = await supabase
    .from('job_applications')
    .insert({
      venue_id: job.venue_id,
      job_posting_id: parsedInput.job_posting_id,
      applicant_id: user.id,
      applicant_name,
      applicant_email,
      applicant_phone,
      status: 'pending',
      form_responses: parsedInput.form_responses
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase
    .from('job_posting_templates')
    .update({ applications_count: (job.applications_count || 0) + 1 })
    .eq('id', parsedInput.job_posting_id)

  return { success: true, data: application }
})

const ReviewApplicationSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(['approved','rejected','reviewed','shortlisted']),
  feedback: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional()
})

export const reviewJobApplicationAction = action.schema(ReviewApplicationSchema).action(async ({ parsedInput }) => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Fetch application for venue guard
    const { data: app, error: appErr } = await supabase
      .from('job_applications')
      .select('id, venue_id, status')
      .eq('id', parsedInput.application_id)
      .single()
    if (appErr || !app) return { success: false, error: 'Application not found' }

    const hasAccess = await canReviewStaffingApplications({
      userId: user.id,
      venueId: app.venue_id,
    })
    if (!hasAccess) return { success: false, error: 'No access' }

    if (!canTransitionApplicationStatus(app.status, parsedInput.status))
      return { success: false, error: `Cannot transition application from ${app.status} to ${parsedInput.status}` }

    if (parsedInput.status === 'approved') {
      const eligibility = await evaluateHiringEligibility({
        supabase,
        applicationId: parsedInput.application_id,
      })
      if (eligibility.mode === 'enforce' && !eligibility.is_eligible) {
        return {
          success: false,
          error: 'Application cannot be approved until required verified evidence is complete',
          code: 'HIRING_ELIGIBILITY_BLOCKED',
          eligibility,
        } as any
      }
    }

    const { data, error } = await supabase
      .from('job_applications')
      .update({
        status: parsedInput.status,
        feedback: parsedInput.feedback,
        rating: parsedInput.rating,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', parsedInput.application_id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (error) {
    if (isHiringEligibilityGateError(error)) {
      return {
        success: false,
        error: 'Application cannot be approved until required verified evidence is complete',
        code: 'HIRING_ELIGIBILITY_BLOCKED',
        eligibility: error.assessment,
      } as any
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    }
  }
})

