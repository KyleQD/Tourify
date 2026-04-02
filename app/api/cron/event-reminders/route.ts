import { createServerClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

async function runEventReminders() {
  try {
    // Create server client
    const supabase = createServerClient()
    const now = new Date()
    const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    // Get upcoming events that need reminders from legacy + canonical models
    const [legacyEventsResult, v2EventsResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date, event_time, status')
        .in('status', ['published', 'scheduled', 'confirmed'])
        .gte('event_date', now.toISOString().slice(0, 10))
        .lte('event_date', next24Hours.toISOString().slice(0, 10)),
      supabase
        .from('events_v2')
        .select('id, title, status, start_at')
        .in('status', ['confirmed', 'advancing', 'onsite'])
        .gte('start_at', now.toISOString())
        .lte('start_at', next24Hours.toISOString())
    ])

    if (legacyEventsResult.error || v2EventsResult.error) {
      console.error('Error fetching events for reminders:', {
        legacyError: legacyEventsResult.error,
        eventsV2Error: v2EventsResult.error
      })
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const legacyEvents = (legacyEventsResult.data || []).map((event: any) => ({
      id: event.id,
      title: event.name || 'Event',
      startAt: event.event_date
        ? new Date(`${event.event_date}T${event.event_time || '00:00'}`).toISOString()
        : null,
      status: event.status || 'scheduled',
      event_table: 'events'
    }))

    const canonicalEvents = (v2EventsResult.data || []).map((event: any) => ({
      id: event.id,
      title: event.title || 'Event',
      startAt: event.start_at || null,
      status: event.status || 'confirmed',
      event_table: 'events_v2'
    }))

    const events = [...legacyEvents, ...canonicalEvents]
    
    console.log(`Found ${events?.length || 0} events needing reminders`)
    
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