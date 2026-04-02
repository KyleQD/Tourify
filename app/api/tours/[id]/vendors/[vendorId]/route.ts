import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'declined']).optional(),
  services: z.array(z.string()).optional(),
  contract_amount: z.number().min(0).optional(),
  payment_status: z.enum(['paid', 'partial', 'pending']).optional(),
  notes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  const { id, vendorId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: vendor, error: vendorError } = await supabase
      .from('tour_vendors')
      .select('*')
      .eq('id', vendorId)
      .eq('tour_id', id)
      .single()

    if (vendorError) {
      if (vendorError.code === 'PGRST116') return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 })
    }

      return NextResponse.json({ success: true, vendor })
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  const { id, vendorId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    const body = await request.json()
    const validatedData = updateVendorSchema.parse(body)

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: updated, error: updateError } = await supabase
      .from('tour_vendors')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', vendorId)
      .eq('tour_id', id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
    }

      return NextResponse.json({ success: true, vendor: updated })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> }
) {
  const { id, vendorId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      if (tourError.code === 'PGRST116') return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { error: deleteError } = await supabase
      .from('tour_vendors')
      .delete()
      .eq('id', vendorId)
      .eq('tour_id', id)

    if (deleteError) return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 })

      return NextResponse.json({ success: true, message: 'Vendor deleted successfully' })
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}