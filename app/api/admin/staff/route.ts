import { NextRequest, NextResponse } from 'next/server'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import type { TeamCommunication } from '@/types/admin-onboarding'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const type = searchParams.get('type') // 'members' or 'communications'

    if (!venueId) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    let data
    if (type === 'communications') {
      data = await AdminOnboardingStaffService.getTeamCommunications(venueId)
    } else {
      data = await AdminOnboardingStaffService.getStaffMembers(venueId)
    }

    return NextResponse.json({
      success: true,
      data,
      type: type || 'members'
    })
  } catch (error) {
    console.error('❌ [Staff API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch staff data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

const MESSAGE_TYPES: TeamCommunication['message_type'][] = [
  'announcement',
  'schedule',
  'training',
  'emergency',
  'general',
  'performance',
  'compliance',
]

function normalizeTeamMessageType(value: unknown): TeamCommunication['message_type'] {
  if (typeof value === 'string' && MESSAGE_TYPES.includes(value as TeamCommunication['message_type'])) {
    return value as TeamCommunication['message_type']
  }
  return 'general'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { venue_id } = body

    if (!venue_id) {
      return NextResponse.json(
        { success: false, error: 'Venue ID is required' },
        { status: 400 }
      )
    }

    if (body.action === 'update_status') {
      const { staff_id, status } = body
      if (!staff_id || !status) {
        return NextResponse.json(
          { success: false, error: 'staff_id and status are required' },
          { status: 400 }
        )
      }
      const updated = await AdminOnboardingStaffService.updateStaffMemberStatus(
        venue_id,
        staff_id,
        status
      )
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.type === 'communication') {
      const { message, recipients, message_type: rawMessageType } = body
      const communication = await AdminOnboardingStaffService.sendTeamCommunication(venue_id, {
        recipients: Array.isArray(recipients) ? recipients : [],
        subject: 'Team message',
        content: typeof message === 'string' ? message : '',
        message_type: normalizeTeamMessageType(rawMessageType),
        priority: 'normal',
      })
      return NextResponse.json({ success: true, data: communication })
    }

    const communicationData = { ...body } as Record<string, unknown>
    delete communicationData.venue_id
    const communication = await AdminOnboardingStaffService.sendTeamCommunication(
      venue_id,
      communicationData as {
        recipients: string[]
        subject: string
        content: string
        message_type: TeamCommunication['message_type']
        priority: TeamCommunication['priority']
      }
    )

    return NextResponse.json({
      success: true,
      data: communication
    })
  } catch (error) {
    console.error('❌ [Staff API] Error sending communication:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send team communication',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 