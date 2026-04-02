import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canAccessEventAsViewer,
  resolveEventReference,
} from '../../_lib/event-reference'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const reference = await resolveEventReference(supabase, eventId)

    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const { data: attendance, error } = await supabase
      .from('event_attendance')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('event_id', reference.id)
      .eq('event_table', reference.table)

    if (error) {
      console.error('Error fetching attendance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch attendance' },
        { status: 500 }
      )
    }

    const attending = attendance?.filter(a => a.status === 'attending') || []
    const interested = attendance?.filter(a => a.status === 'interested') || []
    const notGoing = attendance?.filter(a => a.status === 'not_going') || []

    return NextResponse.json({
      attending,
      interested,
      not_going: notGoing,
      counts: {
        attending: attending.length,
        interested: interested.length,
        not_going: notGoing.length
      }
    })
  } catch (error) {
    console.error('Error in attendance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['attending', 'interested', 'not_going'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be attending, interested, or not_going' },
        { status: 400 }
      )
    }

    const reference = await resolveEventReference(supabase, eventId)
    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!canAccessEventAsViewer(reference, user.id)) {
      return NextResponse.json(
        { error: 'Cannot RSVP to unpublished events' },
        { status: 403 }
      )
    }

    // Update or create attendance record
    const { data: attendance, error } = await supabase
      .from('event_attendance')
      .upsert({
        event_id: reference.id,
        user_id: user.id,
        event_table: reference.table,
        status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'event_id,user_id,event_table' })
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .single()

    if (error) {
      console.error('Error updating attendance:', error)
      return NextResponse.json(
        { error: 'Failed to update attendance' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Error in attendance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const reference = await resolveEventReference(supabase, eventId)
    if (!reference) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Remove attendance record
    const { error } = await supabase
      .from('event_attendance')
      .delete()
      .eq('event_id', reference.id)
      .eq('user_id', user.id)
      .eq('event_table', reference.table)

    if (error) {
      console.error('Error removing attendance:', error)
      return NextResponse.json(
        { error: 'Failed to remove attendance' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in attendance API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


