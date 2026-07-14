import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../../_lib/event-permissions'
import { resolveEventReference } from '../../../_lib/event-reference'

const updateVendorSchema = z.object({
  vendor_name: z.string().min(1).optional(),
  service_type: z.string().min(1).optional(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  budget_estimate: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'declined', 'cancelled']).optional(),
  // UI aliases
  name: z.string().optional(),
  type: z.string().optional(),
  contact_name: z.string().optional(),
  requirements: z.string().optional(),
}).passthrough()

function toDbPatch(validated: z.infer<typeof updateVendorSchema>) {
  const patch: Record<string, unknown> = {}
  if (validated.vendor_name || validated.name)
    patch.vendor_name = validated.vendor_name || validated.name
  if (validated.service_type || validated.type)
    patch.service_type = validated.service_type || validated.type
  if (validated.contact_email !== undefined) patch.contact_email = validated.contact_email
  if (validated.contact_phone !== undefined) patch.contact_phone = validated.contact_phone
  if (validated.budget_estimate !== undefined) patch.budget_estimate = validated.budget_estimate
  if (validated.status) patch.status = validated.status

  const noteParts: string[] = []
  if (validated.contact_name) noteParts.push(`Contact: ${validated.contact_name}`)
  if (validated.requirements) noteParts.push(validated.requirements)
  if (validated.notes) noteParts.push(validated.notes)
  if (noteParts.length) patch.notes = noteParts.join('\n')
  else if (validated.notes === null) patch.notes = null

  return patch
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; vendorId: string }> }
) {
  const { id: eventParam, vendorId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canEdit = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEdit) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = updateVendorSchema.parse(body)
      const patch = toDbPatch(validated)

      const { data, error } = await supabase
        .from('event_vendor_requests')
        .update(patch)
        .eq('id', vendorId)
        .eq('event_id', reference.id)
        .select()
        .single()

      if (error) {
        console.error('[event vendors PATCH]', error)
        return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        vendor: {
          ...data,
          name: data.vendor_name,
          type: data.service_type,
          contact_name: data.contact_email || '',
        },
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event vendors PATCH]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; vendorId: string }> }
) {
  const { id: eventParam, vendorId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const canEdit = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEdit) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { error } = await supabase
        .from('event_vendor_requests')
        .delete()
        .eq('id', vendorId)
        .eq('event_id', reference.id)

      if (error) {
        console.error('[event vendors DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[event vendors DELETE]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
