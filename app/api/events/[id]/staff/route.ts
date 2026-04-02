import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

const assignStaffSchema = z.object({
  staff_member_id: z.string().uuid(),
  shift_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  role_assignment: z.string().optional(),
  zone_assignment: z.string().optional(),
  notes: z.string().optional(),
})

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
      const canViewStaff = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canViewStaff) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const [shiftsResult, membersResult] = await Promise.allSettled([
        supabase
          .from('staff_shifts')
          .select('*, staff_members(id, name, email, role, status)')
          .eq('event_id', reference.id)
          .order('shift_date', { ascending: true }),
        supabase
          .from('staff_members')
          .select('id, name, email, phone, role, status, hourly_rate')
          .eq('status', 'active')
          .limit(200),
      ])

      const shifts = shiftsResult.status === 'fulfilled' ? (shiftsResult.value.data || []) : []
      const availableMembers = membersResult.status === 'fulfilled' ? (membersResult.value.data || []) : []

      return NextResponse.json({
        success: true,
        shifts,
        availableMembers,
        totalAssigned: shifts.length,
      })
    } catch (err) {
      console.error('[event staff GET]', err)
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
      const canAssignStaff = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canAssignStaff) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = assignStaffSchema.parse(body)

      const { data, error } = await supabase
        .from('staff_shifts')
        .insert({
          ...validated,
          event_id: reference.id,
          created_by: user.id,
          status: 'scheduled',
        })
        .select('*, staff_members(id, name, email, role)')
        .single()

      if (error) {
        console.error('[event staff POST]', error)
        return NextResponse.json({ error: 'Failed to assign staff' }, { status: 500 })
      }

      return NextResponse.json({ success: true, shift: data })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event staff POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
