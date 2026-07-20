import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  incrementArticleStat,
  type ArticleEngageAction,
} from '@/lib/blog/article-engagement'

interface RouteParams {
  params: Promise<{ id: string }>
}

const engageSchema = z.object({
  action: z.enum(['view', 'like', 'unlike', 'share']),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Article id is required' }, { status: 400 })

    const body = engageSchema.parse(await request.json())
    const action = body.action as ArticleEngageAction
    const supabase = createServiceRoleClient()

    const result = await incrementArticleStat({
      supabase,
      articleId: id,
      action,
      requirePublished: true,
    })

    if (!result.success)
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, stats: result.stats, action })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { success: false, error: 'Invalid engagement payload', details: error.flatten() },
        { status: 400 }
      )

    console.error('[PulseArticleEngage] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
