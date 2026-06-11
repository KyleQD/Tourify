import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { resolveActingContext, recordActingSnapshot } from '@/lib/auth/acting-context'

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId, accountType, profileId, supabase } = ctx

    const body = await request.json()
    const {
      content,
      type = 'text',
      visibility = 'public',
      location,
      hashtags,
      media_urls,
    } = body

    const cleanHashtags = Array.isArray(hashtags) ? hashtags : []
    const cleanMediaUrls = Array.isArray(media_urls) ? media_urls : []

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const postData = {
      user_id: userId,
      content: content.trim(),
      type,
      visibility,
      location,
      hashtags: cleanHashtags,
      media_urls: cleanMediaUrls,
      // Acting-entity attribution (post-migration columns)
      posted_as_type:       accountType,
      posted_as_profile_id: profileId,
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single()

    if (postError) {
      console.error('❌ Failed to create post:', postError)
      return NextResponse.json(
        { error: 'Failed to create post: ' + postError.message },
        { status: 500 }
      )
    }

    if (visibility === 'public') {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId,
        metricKey: 'posts_public_total',
        eventType: 'post_created',
        delta: 1,
        eventSource: 'api_posts_create',
        eventData: { post_id: post.id, media_count: cleanMediaUrls.length },
      })
      if (cleanMediaUrls.length > 0) {
        await achievementEngine.recordMetricEvent({
          supabase: supabase as any,
          userId,
          metricKey: 'media_items_total',
          eventType: 'post_media_added',
          delta: cleanMediaUrls.length,
          eventSource: 'api_posts_create',
          eventData: { post_id: post.id },
        })
      }
    }

    await recordActingSnapshot(ctx, {
      action: 'post.create',
      resourceType: 'post',
      resourceId: post.id,
    })

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('💥 Posts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 