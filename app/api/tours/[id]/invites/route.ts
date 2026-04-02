import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createInviteSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().min(1),
  positionDetails: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    location: z.string().optional(),
    compensation: z.string().optional()
  }),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    // Ensure tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const { data: invites, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('tour_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })

      return NextResponse.json({ success: true, invites: invites || [] })
    } catch (error) {
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

    // Ensure tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id, name')
      .eq('id', id)
      .single()

    if (tourError) return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const validated = createInviteSchema.parse(body)

    // Generate token
    const token = crypto.randomUUID()

    // Store invite
    const { data: invite, error } = await supabase
      .from('staff_invitations')
      .insert({
        email: validated.email,
        phone: validated.phone,
        position_details: validated.positionDetails,
        token,
        status: 'pending',
        tour_id: id,
        role: validated.role,
        origin: 'tour',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })

      return NextResponse.json({ success: true, invite })
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


