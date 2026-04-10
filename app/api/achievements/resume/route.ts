import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getResumeAchievements, upsertResumeHighlight } from '@/lib/services/resume-achievement.service'

const createHighlightSchema = z.object({
  title: z.string().min(2).max(120),
  summary: z.string().min(10).max(500),
  impact_score: z.number().min(0).max(5000).optional(),
  source_type: z.enum(['achievement', 'badge', 'endorsement', 'manual']).optional(),
  achievement_id: z.string().uuid().optional(),
  badge_id: z.string().uuid().optional(),
  endorsement_id: z.string().uuid().optional(),
  is_featured: z.boolean().optional(),
})

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await getResumeAchievements({
      supabase,
      userId: user.id,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[achievements-resume] GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch resume achievements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = createHighlightSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid highlight payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const highlight = await upsertResumeHighlight({
      supabase,
      userId: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      impactScore: parsed.data.impact_score,
      sourceType: parsed.data.source_type,
      achievementId: parsed.data.achievement_id,
      badgeId: parsed.data.badge_id,
      endorsementId: parsed.data.endorsement_id,
      isFeatured: parsed.data.is_featured,
    })

    return NextResponse.json({ highlight })
  } catch (error) {
    console.error('[achievements-resume] POST failed:', error)
    return NextResponse.json({ error: 'Failed to save resume highlight' }, { status: 500 })
  }
}
