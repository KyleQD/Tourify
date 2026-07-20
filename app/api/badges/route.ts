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

    if (!badge_id) {
      return NextResponse.json({ error: 'badge_id is required' }, { status: 400 })
    }

    const recipientId = user_id || user.id
    const grantedByOther = user_id && user_id !== user.id

    const userBadge = await achievementService.grantBadge({
      badge_id,
      user_id: recipientId,
      granted_by: grantedByOther ? user.id : undefined,
      granted_reason,
      related_project_id,
      related_event_id,
      related_collaboration_id,
      expires_at
    })

    if (grantedByOther) {
      try {
        const { data: grantor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        const { data: badge } = await supabase
          .from('badges')
          .select('name, icon, color, rarity, category')
          .eq('id', badge_id)
          .single()

        await OptimizedNotificationService.createNotification({
          userId: recipientId,
          type: 'badge_granted',
          title: `You earned ${badge?.name || 'a new badge'}`,
          content: `${grantor?.full_name || 'A manager'} awarded you the "${badge?.name || 'badge'}" badge${granted_reason ? `: ${granted_reason}` : '.'}`,
          summary: 'Badge granted',
          relatedUserId: user.id,
          relatedContentId: badge_id,
          relatedContentType: 'badge',
          metadata: {
            link: `/achievements?tab=badges&highlight=${badge_id}`,
            badge_id,
            badge_name: badge?.name,
            icon: badge?.icon,
            color: badge?.color,
            rarity: badge?.rarity,
            category: badge?.category,
            granted_by: user.id,
            granted_reason,
            user_badge_id: userBadge?.id,
          },
        })
      } catch (notifyError) {
        console.warn('Failed to notify badge recipient:', notifyError)
      }
    }

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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_badge_id, is_visible } = body

    if (!user_badge_id) {
      return NextResponse.json({ error: 'user_badge_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_badges')
      .update({ metadata: { is_visible: is_visible !== false } })
      .eq('id', user_badge_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, user_badge: data })
  } catch (error) {
    console.error('Error updating badge visibility:', error)
    return NextResponse.json({ error: 'Failed to update badge visibility' }, { status: 500 })
  }
} 