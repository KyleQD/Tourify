import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const venueId = body.venue_id
    const userId = body.user_id
    const position = body.position
    const department = body.department

    if (!venueId || !userId || !position || !department) {
      return NextResponse.json(
        { success: false, error: 'venue_id, user_id, position, and department are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', userId)
      .maybeSingle()

    const { data, error } = await supabase
      .from('staff_onboarding_candidates')
      .insert({
        venue_id: venueId,
        user_id: userId,
        name: existingUser?.full_name || 'Existing User',
        email: existingUser?.email || '',
        phone: existingUser?.phone || body.phone || null,
        position,
        department,
        status: 'in_progress',
        stage: 'onboarding',
        application_date: new Date().toISOString(),
        employment_type: body.employment_type || 'full_time',
        onboarding_progress: 0,
        template_id: body.onboarding_template_id || null,
        start_date: body.start_date || null,
        salary: body.salary || null,
        notes: body.notes || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  })(request)
}
