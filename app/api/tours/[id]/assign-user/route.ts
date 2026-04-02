import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const assignSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'declined']).default('confirmed')
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {

    // Verify tour ownership
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    if (tour.user_id !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const validated = assignSchema.parse(body)

    // Fetch profile for defaults
    let displayName = validated.name
    let email = validated.email
    if (!displayName || !email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', validated.userId)
        .single()
      displayName = displayName || profile?.display_name || ''
      email = email || profile?.email || ''
    }

    const { data: member, error: insertError } = await supabase
      .from('tour_team_members')
      .insert({
        tour_id: id,
        user_id: validated.userId,
        name: displayName,
        role: validated.role,
        email,
        phone: validated.phone,
        status: validated.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: 'Failed to assign user' }, { status: 500 })

      return NextResponse.json({ success: true, member })
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}


