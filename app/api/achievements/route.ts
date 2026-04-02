import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { achievementService } from '@/lib/services/achievement.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get user achievements
    const achievementsResponse = await achievementService.getUserAchievements(userId)
    
    let response: any = {
      achievements: achievementsResponse.achievements,
      user_achievements: achievementsResponse.user_achievements,
      total_points: achievementsResponse.total_points,
      completed_count: achievementsResponse.completed_count,
      total_count: achievementsResponse.total_count
    }

    // Include stats if requested
    if (includeStats) {
      const stats = await achievementService.getAchievementStats(userId)
      response.stats = stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      achievement_id,
      metric_key,
      metric_value,
      evaluation_mode,
      event_type,
      event_value,
      event_data,
      related_project_id,
      related_event_id,
      related_collaboration_id
    } = body

    // Record achievement progress
    await achievementService.recordAchievementProgress({
      achievement_id,
      metric_key,
      metric_value,
      evaluation_mode,
      event_type,
      event_value,
      event_data,
      related_project_id,
      related_event_id,
      related_collaboration_id
    })

    return NextResponse.json({ message: 'Achievement progress recorded successfully' })
  } catch (error) {
    console.error('Error recording achievement progress:', error)
    return NextResponse.json(
      { error: 'Failed to record achievement progress' },
      { status: 500 }
    )
  }
} 