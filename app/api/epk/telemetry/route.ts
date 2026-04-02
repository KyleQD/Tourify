import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const epkSlug = String(body?.epkSlug || '').trim()
    const eventType = String(body?.eventType || '').trim()

    if (!epkSlug || !eventType) {
      return NextResponse.json({ error: 'epkSlug and eventType are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('epk_telemetry').insert({
      epk_slug: epkSlug,
      event_type: eventType,
      metadata: body?.metadata || {}
    })

    if (error && !error.message.includes('does not exist')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}
