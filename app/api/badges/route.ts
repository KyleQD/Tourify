import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { achievementService } from '@/lib/services/achievement.service'

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

    // Get user badges
    const badgesResponse = await achievementService.getUserBadges(userId)
    
    let response: any = {
      badges: badgesResponse.badges,
      user_badges: badgesResponse.user_badges,
      total_badges: badgesResponse.total_badges,
      verification_badges: badgesResponse.verification_badges,
      expertise_badges: badgesResponse.expertise_badges,
      recognition_badges: badgesResponse.recognition_badges
    }

    // Include stats if requested
    if (includeStats) {
      const stats = await achievementService.getBadgeStats(userId)
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
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
    const { badge_id, user_id, granted_reason, related_project_id, related_event_id, related_collaboration_id, expires_at } = body

    // Grant badge
    const userBadge = await achievementService.grantBadge({
      badge_id,
      user_id: user_id || user.id,
      granted_reason,
      related_project_id,
      related_event_id,
      related_collaboration_id,
      expires_at
    })

    return NextResponse.json({ 
      message: 'Badge granted successfully',
      user_badge: userBadge
    })
  } catch (error) {
    console.error('Error granting badge:', error)
    return NextResponse.json(
      { error: 'Failed to grant badge' },
      { status: 500 }
    )
  }
} 