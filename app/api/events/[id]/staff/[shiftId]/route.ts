import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../../_lib/event-permissions'
import { resolveEventReference } from '../../../_lib/event-reference'
import { cancelEmploymentAssignmentForShift, syncEmploymentAssignmentForShift } from '@/lib/services/staff-shift-assignment-sync'
import {
  assertNoShiftConflict,
  StaffingFlowError,
  staffingErrorStatus,
} from '@/lib/services/staffing-assignment.service'

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
  return withAdminCapability('workforce.manage', async (_req, { supabase, user, admin }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (!reference.orgId || reference.orgId !== admin.orgId) {
        return NextResponse.json({ error: 'This event does not belong to the active organization.', code: 'forbidden' }, { status: 403 })
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

      const { data: existingShift, error: existingError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('id', shiftId)
        .eq('event_id', reference.id)
        .eq('org_id', admin.orgId)
        .is('deleted_at', null)
        .maybeSingle()
      if (existingError) throw new StaffingFlowError('database', 'Unable to load this shift.', existingError)
      if (!existingShift) throw new StaffingFlowError('not_found', 'Shift not found.')

      await assertNoShiftConflict(supabase, {
        staffMemberId: validated.staff_member_id || existingShift.staff_member_id,
        shiftDate: validated.shift_date || existingShift.shift_date,
        startTime: validated.start_time || validated.arrival_time || existingShift.start_time,
        endTime: validated.end_time || validated.departure_time || existingShift.end_time,
        excludeShiftId: shiftId,
      })

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
        .eq('org_id', admin.orgId)
        .is('deleted_at', null)
        .select('*')
        .single()

      if (error) {
        console.error('[event staff PATCH]', error)
        return NextResponse.json({ error: 'Failed to update staff shift' }, { status: 500 })
      }

      const memberResult = data.staff_member_id
        ? await supabase
            .from('staff_members')
            .select('id, name, email, phone, role, status')
            .eq('id', data.staff_member_id)
            .maybeSingle()
        : { data: null }

      const shift = { ...data, staff_members: memberResult.data ?? null }
      const sync = await syncEmploymentAssignmentForShift({
        supabase,
        shift: data,
        notify: Boolean(validated.staff_member_id || mappedStatus),
        actorUserId: user.id,
      })

      return NextResponse.json({ success: true, shift, staff: presentShiftAsStaff(shift), sync })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      if (err instanceof StaffingFlowError) {
        return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: staffingErrorStatus(err) })
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
  return withAdminCapability('workforce.manage', async (_req, { supabase, user, admin }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (!reference.orgId || reference.orgId !== admin.orgId) {
        return NextResponse.json({ error: 'This event does not belong to the active organization.', code: 'forbidden' }, { status: 403 })
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

      const { data: existingShift, error: lookupError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('id', shiftId)
        .eq('event_id', reference.id)
        .eq('org_id', admin.orgId)
        .is('deleted_at', null)
        .maybeSingle()
      if (lookupError) throw new StaffingFlowError('database', 'Unable to load this shift.', lookupError)
      if (!existingShift) throw new StaffingFlowError('not_found', 'Shift not found.')

      const { error } = await supabase
        .from('staff_shifts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', shiftId)
        .eq('event_id', reference.id)
        .eq('org_id', admin.orgId)

      if (error) {
        console.error('[event staff DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete staff shift' }, { status: 500 })
      }

      const sync = await cancelEmploymentAssignmentForShift({
        supabase,
        shift: existingShift,
        actorUserId: user.id,
        notify: true,
      })
      return NextResponse.json({ success: true, sync })
    } catch (err) {
      if (err instanceof StaffingFlowError) {
        return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: staffingErrorStatus(err) })
      }
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
