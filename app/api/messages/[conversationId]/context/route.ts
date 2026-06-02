import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

interface ChipDescriptor {
  key: string
  label: string
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

const conversationIdSchema = z.string().uuid({ message: 'Invalid conversation id' })

function getConversationIdFromPath(request: NextRequest) {
  const pathParts = request.nextUrl.pathname.split('/')
  return pathParts[pathParts.length - 3]
}

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawId = getConversationIdFromPath(request)
    const parsed = conversationIdSchema.safeParse(rawId)
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })

    const conversationId = parsed.data
    const supabase = createServiceRoleClient()

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2, trust_tier, context_type, context_id, accepted_at')
      .eq('id', conversationId)
      .single()

    if (error || !conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    const isParticipant = conversation.participant_1 === user.id || conversation.participant_2 === user.id
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const chips: ChipDescriptor[] = []
    if (conversation.trust_tier === 'request' && !conversation.accepted_at) {
      chips.push({ key: 'request', label: 'Message request', variant: 'outline' })
    } else if (conversation.trust_tier === 'open') {
      chips.push({ key: 'open', label: 'Connected', variant: 'secondary' })
    } else if (conversation.trust_tier === 'context' && !conversation.context_type) {
      chips.push({ key: 'context', label: 'Shared context', variant: 'secondary' })
    }

    if (conversation.context_type === 'event_team' && conversation.context_id) {
      const { data: eventRow } = await supabase
        .from('events_v2')
        .select('title')
        .eq('id', conversation.context_id)
        .maybeSingle()
      chips.push({ key: 'event_team', label: `Event team${eventRow?.title ? ` · ${eventRow.title}` : ''}` })
    }

    if (conversation.context_type === 'venue_staff' && conversation.context_id) {
      const { data: venueRow } = await supabase
        .from('venues')
        .select('name')
        .eq('id', conversation.context_id)
        .maybeSingle()
      chips.push({ key: 'venue_staff', label: `Venue staff${venueRow?.name ? ` · ${venueRow.name}` : ''}` })
    }

    if (conversation.context_type === 'workflow' && conversation.context_id) {
      chips.push({ key: 'workflow', label: 'Workflow', variant: 'secondary' })
    }

    if (conversation.context_type === 'job_application' && conversation.context_id) {
      const { data: jobRow } = await supabase
        .from('job_applications')
        .select('job_posting_id, applicant_id')
        .eq('id', conversation.context_id)
        .maybeSingle()

      let postingTitle: string | null = null
      if (jobRow?.job_posting_id) {
        const { data: posting } = await supabase
          .from('job_posting_templates')
          .select('title')
          .eq('id', jobRow.job_posting_id)
          .maybeSingle()
        postingTitle = posting?.title ?? null
      }

      const viewerIsApplicant = jobRow?.applicant_id === user.id
      const label = viewerIsApplicant
        ? `Hiring manager${postingTitle ? ` · ${postingTitle}` : ''}`
        : `Applicant${postingTitle ? ` · ${postingTitle}` : ''}`
      chips.push({ key: 'job_application', label })
    }

    if (chips.length === 0) chips.push({ key: 'none', label: 'No shared network', variant: 'outline' })

    return NextResponse.json({ chips })
  } catch (error) {
    console.error('Conversation context route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
