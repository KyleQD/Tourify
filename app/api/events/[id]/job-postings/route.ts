import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'
import { getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']).optional(),
  location: z.string().optional().nullable(),
  number_of_positions: z.number().int().min(1).optional().default(1),
  requirements: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  benefits: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  experience_level: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  remote: z.boolean().optional().default(false),
  urgent: z.boolean().optional().default(false),
  role_type: z
    .enum(['security', 'bartender', 'street_team', 'production', 'management', 'other'])
    .optional()
    .default('other'),
  status: z.enum(['draft', 'published']).optional().default('published'),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { data: ev, error: evErr } = await supabase
      .from('events_v2')
      .select('id, venue_id')
      .eq('id', eventId)
      .maybeSingle()

    if (evErr) throw evErr
    if (!ev) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    if (!ev.venue_id) {
      return NextResponse.json(
        { success: false, error: 'Event has no venue; link a venue before creating staffing posts.' },
        { status: 400 }
      )
    }

    const canAssign = await hasEntityPermission({
      userId: user.id,
      entityType: 'Venue',
      entityId: ev.venue_id,
      permission: 'ASSIGN_EVENT_ROLES',
    })
    if (!canAssign) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const json = await request.json()
    const body = createSchema.parse(json)

    const { data, error } = await supabase
      .from('job_posting_templates')
      .insert({
        venue_id: ev.venue_id,
        event_id: ev.id,
        created_by: user.id,
        title: body.title,
        description: body.description ?? '',
        department: body.department ?? 'Operations',
        position: body.position ?? body.title,
        employment_type: body.employment_type ?? 'part_time',
        location: body.location ?? 'TBD',
        number_of_positions: body.number_of_positions,
        requirements: body.requirements.length ? body.requirements : ['See description'],
        responsibilities: body.responsibilities.length ? body.responsibilities : ['See description'],
        benefits: body.benefits,
        skills: body.skills,
        experience_level: body.experience_level ?? 'entry',
        remote: body.remote,
        urgent: body.urgent,
        role_type: body.role_type,
        status: body.status,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: e.flatten().fieldErrors }, { status: 400 })
    }
    console.error('[events/job-postings POST]', e)
    return NextResponse.json(
      { success: false, error: getPostgrestErrorMessage(e) || 'Failed to create job posting' },
      { status: 500 }
    )
  }
}
