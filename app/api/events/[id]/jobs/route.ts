import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

const createJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category_id: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  job_type: z.string().optional(),
  payment_type: z.string().optional(),
  payment_amount: z.number().optional(),
  payment_currency: z.string().optional(),
  location: z.string().optional(),
  event_date: z.string().optional().nullable(),
  required_skills: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'open', 'published']).optional().default('open'),
  priority: z.string().optional(),
  featured: z.boolean().optional(),
}).passthrough()

function mapCategoryToDepartment(categoryId?: string): string {
  const map: Record<string, string> = {
    '1': 'Talent',
    '2': 'Talent',
    '3': 'Production',
    '4': 'Talent',
    '5': 'Production',
    '6': 'Production',
    '7': 'Media',
    '8': 'Media',
    '9': 'Security',
    '10': 'Hospitality',
    '11': 'Logistics',
    '12': 'Operations',
  }
  return (categoryId && map[categoryId]) || 'Operations'
}

function presentJob(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category_id: row.department || '',
    job_type: row.employment_type || 'contractor',
    payment_type: row.salary_range?.type || 'paid',
    payment_amount: row.salary_range?.min ?? undefined,
    payment_currency: 'USD',
    location: row.location || '',
    event_date: row.event_date || null,
    required_skills: row.skills || [],
    required_experience: row.experience_level || 'any',
    benefits: row.benefits || [],
    status: row.status === 'published' ? 'open' : row.status || 'draft',
    priority: row.urgent ? 'urgent' : 'normal',
    featured: Boolean(row.urgent),
    applications_count: 0,
    views_count: 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canView = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canView) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('event_id', reference.id)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, jobs: [] })
        }
        // Fallback to templates table used by older staffing path
        const { data: templates, error: templateError } = await supabase
          .from('job_posting_templates')
          .select('*')
          .eq('event_id', reference.id)
          .order('created_at', { ascending: false })

        if (templateError) {
          console.error('[event jobs GET]', error, templateError)
          return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          jobs: (templates || []).map(presentJob),
        })
      }

      return NextResponse.json({
        success: true,
        jobs: (data || []).map(presentJob),
      })
    } catch (err) {
      console.error('[event jobs GET]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canCreate = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canCreate) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = createJobSchema.parse(body)

      const { data: eventRow } = await supabase
        .from('events_v2')
        .select('id, org_id, venue_id, start_at, title')
        .eq('id', reference.id)
        .maybeSingle()

      const orgId = eventRow?.org_id || null
      const department = validated.department || mapCategoryToDepartment(validated.category_id)
      const status =
        validated.status === 'open' || validated.status === 'published' ? 'published' : 'draft'

      const salaryRange =
        typeof validated.payment_amount === 'number'
          ? {
              min: validated.payment_amount,
              max: validated.payment_amount,
              type: validated.payment_type === 'unpaid' ? 'flat' : 'flat',
            }
          : null

      const insertRow = {
        title: validated.title,
        description: validated.description,
        department,
        position: validated.position || validated.title,
        employment_type: 'contractor',
        location: validated.location || 'TBD',
        role_type: 'other',
        number_of_positions: 1,
        salary_range: salaryRange,
        requirements: validated.required_skills?.length
          ? validated.required_skills
          : ['See description'],
        responsibilities: ['See description'],
        benefits: validated.benefits || [],
        skills: validated.required_skills || [],
        experience_level: 'any',
        remote: false,
        urgent: validated.priority === 'urgent' || Boolean(validated.featured),
        status,
        event_id: reference.id,
        event_date: validated.event_date || eventRow?.start_at || null,
        created_by: user.id,
        employer_entity_type: orgId ? 'organization' : 'venue',
        employer_entity_id: orgId || eventRow?.venue_id || user.id,
        venue_id: eventRow?.venue_id || null,
      }

      const { data, error } = await supabase
        .from('job_postings')
        .insert(insertRow)
        .select()
        .single()

      if (error) {
        // Fallback to job_posting_templates when job_postings schema differs
        const { data: template, error: templateError } = await supabase
          .from('job_posting_templates')
          .insert({
            venue_id: eventRow?.venue_id,
            event_id: reference.id,
            created_by: user.id,
            title: insertRow.title,
            description: insertRow.description,
            department: insertRow.department,
            position: insertRow.position,
            employment_type: 'part_time',
            location: insertRow.location,
            number_of_positions: 1,
            requirements: insertRow.requirements,
            responsibilities: insertRow.responsibilities,
            benefits: insertRow.benefits,
            skills: insertRow.skills,
            experience_level: 'entry',
            remote: false,
            urgent: insertRow.urgent,
            role_type: 'other',
            status: status === 'published' ? 'published' : 'draft',
          })
          .select()
          .single()

        if (templateError) {
          console.error('[event jobs POST]', error, templateError)
          return NextResponse.json(
            { error: error.message || 'Failed to create job posting' },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true, data: presentJob(template), job: presentJob(template) })
      }

      return NextResponse.json({ success: true, data: presentJob(data), job: presentJob(data) })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event jobs POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
