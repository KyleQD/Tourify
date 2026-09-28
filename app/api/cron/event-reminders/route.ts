import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

async function runEventReminders() {
  try {
    // Create server client
    const supabase = createServiceRoleClient()
    const now = new Date()
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    // events_v2 is the canonical event source for operational reminders.
    const v2EventsResult = await supabase
      .from('events_v2')
      .select('id, title, status, start_at')
      .in('status', ['confirmed', 'advancing', 'onsite'])
      .gte('start_at', now.toISOString())
      .lte('start_at', next24Hours.toISOString())

    if (v2EventsResult.error) {
      console.error('Error fetching events for reminders:', {
        eventsV2Error: v2EventsResult.error
      })
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const canonicalEvents = (v2EventsResult.data || []).map((event: any) => ({
      id: event.id,
      title: event.title || 'Event',
      startAt: event.start_at || null,
      status: event.status || 'confirmed',
      event_table: 'events_v2'
    }))

    const events = canonicalEvents
    
    
    // Process reminders here (implement your reminder logic)
    // This could include sending emails, push notifications, etc.
    
    return NextResponse.json({ 
      success: true, 
      eventsProcessed: events?.length || 0 
    })
  } catch (error) {
    console.error('Event reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runEventReminders()
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runEventReminders()
}
