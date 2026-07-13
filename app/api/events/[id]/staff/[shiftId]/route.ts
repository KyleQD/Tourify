import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../../_lib/event-permissions'
import { resolveEventReference } from '../../../_lib/event-reference'

const updateShiftSchema = z.object({
  staff_member_id: z.string().uuid().optional(),
  shift_date: z.string().min(1).optional(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().min(1).optional(),
  role_assignment: z.string().optional(),
  zone_assignment: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  // UI aliases from EventStaffManager
  role: z.string().optional(),
  arrival_time: z.string().optional(),
  departure_time: z.string().optional(),
}).passthrough()

function mapUiStatus(status?: string): string | undefined {
  if (!status) return undefined
  if (status === 'confirmed') return 'assigned'
  if (status === 'pending') return 'scheduled'
  return status
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; shiftId: string }> }
) {
  const { id: eventParam, shiftId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canAssign = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canAssign) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = updateShiftSchema.parse(body)

      const patch: Record<string, unknown> = {}
      if (validated.staff_member_id) patch.staff_member_id = validated.staff_member_id
      if (validated.shift_date) patch.shift_date = validated.shift_date
      if (validated.start_time || validated.arrival_time)
        patch.start_time = validated.start_time || validated.arrival_time
      if (validated.end_time || validated.departure_time)
        patch.end_time = validated.end_time || validated.departure_time
      if (validated.role_assignment || validated.role)
        patch.role_assignment = validated.role_assignment || validated.role
      if (validated.zone_assignment !== undefined) patch.zone_assignment = validated.zone_assignment
      if (validated.notes !== undefined) patch.notes = validated.notes
      const mappedStatus = mapUiStatus(validated.status)
      if (mappedStatus) patch.status = mappedStatus

      const { data, error } = await supabase
        .from('staff_shifts')
        .update(patch)
        .eq('id', shiftId)
        .eq('event_id', reference.id)
        .select('*, staff_members(id, name, email, role, status)')
        .single()

      if (error) {
        console.error('[event staff PATCH]', error)
        return NextResponse.json({ error: 'Failed to update staff shift' }, { status: 500 })
      }

      return NextResponse.json({ success: true, shift: data, staff: presentShiftAsStaff(data) })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event staff PATCH]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; shiftId: string }> }
) {
  const { id: eventParam, shiftId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canAssign = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'ASSIGN_EVENT_ROLES',
      })
      if (!canAssign) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { error } = await supabase
        .from('staff_shifts')
        .delete()
        .eq('id', shiftId)
        .eq('event_id', reference.id)

      if (error) {
        console.error('[event staff DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete staff shift' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[event staff DELETE]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

function presentShiftAsStaff(shift: any) {
  const member = shift?.staff_members
  const status =
    shift?.status === 'assigned' || shift?.status === 'confirmed'
      ? 'confirmed'
      : shift?.status === 'declined'
        ? 'declined'
        : 'pending'

  return {
    id: shift.id,
    name: member?.name || shift.role_assignment || 'Staff',
    role: shift.role_assignment || member?.role || 'crew',
    email: member?.email || '',
    phone: member?.phone,
    status,
    arrival_time: shift.start_time,
    departure_time: shift.end_time,
    notes: shift.notes,
  }
}
