import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  type: z.string().min(1, 'Vendor type is required'),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'declined']).default('pending'),
  services: z.array(z.string()).default([]),
  contract_amount: z.number().min(0).optional(),
  payment_status: z.enum(['paid', 'partial', 'pending']).default('pending'),
  notes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Vendors API] GET request for tour vendors:', id)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Vendors API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Vendors API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch vendors for this tour
    const { data: vendors, error: vendorsError } = await supabase
      .from('tour_vendors')
      .select('*')
      .eq('tour_id', id)
      .order('name', { ascending: true })

    if (vendorsError) {
      console.error('[Tour Vendors API] Error fetching vendors:', vendorsError)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    console.log('[Tour Vendors API] Successfully fetched vendors:', vendors?.length || 0)

      return NextResponse.json({ 
        success: true, 
        vendors: vendors || [],
        message: 'Tour vendors fetched successfully' 
      })

    } catch (error) {
      console.error('[Tour Vendors API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Vendors API] POST request for tour vendor:', id)

    const body = await request.json()
    const validatedData = createVendorSchema.parse(body)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id, name as tour_name')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Vendors API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Vendors API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create the vendor
    const vendorData = {
      ...validatedData,
      tour_id: id,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('tour_vendors')
      .insert(vendorData)
      .select()
      .single()

    if (vendorError) {
      console.error('[Tour Vendors API] Error creating vendor:', vendorError)
      return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 })
    }

    console.log('[Tour Vendors API] Successfully created vendor:', vendor.id)

      return NextResponse.json({ 
        success: true, 
        vendor,
        message: 'Vendor added successfully to tour' 
      })

    } catch (error) {
      console.error('[Tour Vendors API] Error:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation error', 
          details: error.errors 
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
} 