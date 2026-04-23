import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { achievementService } from '@/lib/services/achievement.service'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get user endorsements
    const endorsementsResponse = await achievementService.getUserEndorsements(userId)
    
    let response: any = {
      endorsements: endorsementsResponse.endorsements,
      skills: endorsementsResponse.skills,
      total_endorsements: endorsementsResponse.total_endorsements,
      average_level: endorsementsResponse.average_level
    }

    // Include stats if requested
    if (includeStats) {
      const stats = await achievementService.getEndorsementStats(userId)
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching endorsements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch endorsements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endorsee_id, skill, level, comment, category, project_id, collaboration_id, event_id, job_id } = body

    if (!endorsee_id || !skill) {
      return NextResponse.json({ error: 'endorsee_id and skill are required' }, { status: 400 })
    }

    const endorsement = await achievementService.createEndorsement({
      endorsee_id,
      skill,
      level,
      comment,
      category,
      project_id,
      collaboration_id,
      event_id,
      job_id
    })

    if (endorsee_id !== user.id) {
      try {
        const { data: endorser } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        await OptimizedNotificationService.createNotification({
          userId: endorsee_id,
          type: 'endorsement_received',
          title: 'New Endorsement!',
          content: `${endorser?.full_name || 'Someone'} endorsed you for "${skill}"${comment ? `: "${comment}"` : '.'}`,
          summary: 'New endorsement',
          relatedUserId: user.id,
          metadata: {
            endorsement_id: endorsement?.id,
            endorser_id: user.id,
            skill,
            level,
            category,
          },
        })
      } catch (notifyError) {
        console.warn('Failed to notify endorsement recipient:', notifyError)
      }
    }

    return NextResponse.json({ 
      message: 'Endorsement created successfully',
      endorsement
    })
  } catch (error) {
    console.error('Error creating endorsement:', error)
    return NextResponse.json(
      { error: 'Failed to create endorsement' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endorsement_id, level, comment, category } = body

    // Update endorsement
    const endorsement = await achievementService.updateEndorsement(endorsement_id, {
      level,
      comment,
      category
    })

    return NextResponse.json({ 
      message: 'Endorsement updated successfully',
      endorsement
    })
  } catch (error) {
    console.error('Error updating endorsement:', error)
    return NextResponse.json(
      { error: 'Failed to update endorsement' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const endorsementId = searchParams.get('id')

    if (!endorsementId) {
      return NextResponse.json({ error: 'Endorsement ID is required' }, { status: 400 })
    }

    // Delete endorsement
    await achievementService.deleteEndorsement(endorsementId)

    return NextResponse.json({ 
      message: 'Endorsement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting endorsement:', error)
    return NextResponse.json(
      { error: 'Failed to delete endorsement' },
      { status: 500 }
    )
  }
} 