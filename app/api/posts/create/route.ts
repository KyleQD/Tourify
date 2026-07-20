import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { resolveActingContext, recordActingSnapshot } from '@/lib/auth/acting-context'
import { getAccountAuthorPath } from '@/lib/accounts/account-author'
import { resolveActingAccountSnapshot } from '@/lib/accounts/acting-account-snapshot'
import {
  isValidPollOptionCount,
  normalizePollOptions,
  resolvePollEndsAt,
} from '@/lib/polls/poll-duration'
import { buildPollPayload } from '@/lib/polls/hydrate-polls'
import { normalizeFeedMediaUrls } from '@/lib/feed/media-url-utils'

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId, accountType, profileId, supabase } = ctx
    const author = await resolveActingAccountSnapshot(ctx)

    const body = await request.json()
    const {
      content,
      type = 'text',
      location,
      hashtags,
      media_urls,
      poll_options: rawPollOptions,
      poll_duration: rawPollDuration,
      tagged_users: rawTaggedUsers,
      collaborators: rawCollaborators,
      collaborator_user_ids: rawCollaboratorUserIds,
    } = body

    const isPoll = type === 'poll'
    const visibility = body.visibility || (isPoll ? 'followers' : 'public')

    const cleanHashtags = Array.isArray(hashtags) ? hashtags : []
    const cleanMediaUrls = normalizeFeedMediaUrls(media_urls)

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const {
      normalizeTaggedUserIds,
      normalizeCollaboratorInvites,
      insertFeedPostCollaborators,
      notifyTaggedUsers,
      notifyCollaboratorInvites,
    } = await import('@/lib/feed/post-collaborators')

    const taggedUsers = normalizeTaggedUserIds(rawTaggedUsers, userId)
    const collaboratorInvites = normalizeCollaboratorInvites(
      rawCollaborators || rawCollaboratorUserIds,
      userId
    )

    let pollOptions: string[] = []
    let pollEndsAt: Date | null = null

    if (isPoll) {
      pollOptions = normalizePollOptions(rawPollOptions)
      if (!isValidPollOptionCount(pollOptions)) {
        return NextResponse.json(
          { error: 'Polls require 2–4 non-empty options' },
          { status: 400 }
        )
      }
      pollEndsAt = resolvePollEndsAt({ duration: rawPollDuration || '7d' })
      if (!pollEndsAt) {
        return NextResponse.json(
          { error: 'Invalid poll duration. Use 1d, 3d, 7d, or 14d.' },
          { status: 400 }
        )
      }
    }

    const postData: Record<string, unknown> = {
      user_id: userId,
      content: content.trim(),
      type,
      visibility,
      location,
      hashtags: cleanHashtags,
      media_urls: cleanMediaUrls,
      tagged_users: taggedUsers,
      posted_as_type: accountType,
      posted_as_profile_id: profileId,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
    }

    if (isPoll && pollEndsAt) {
      postData.poll_ends_at = pollEndsAt.toISOString()
      postData.poll_total_votes = 0
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

    let insertedOptions: Array<{ id: string; text: string; position: number; vote_count: number }> = []

    if (isPoll) {
      const optionRows = pollOptions.map((text, index) => ({
        post_id: post.id,
        text,
        position: index,
        vote_count: 0,
      }))

      const { data: options, error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionRows)
        .select('id, text, position, vote_count')

      if (optionsError) {
        console.error('❌ Failed to create poll options:', optionsError)
        await supabase.from('posts').delete().eq('id', post.id)
        return NextResponse.json(
          { error: 'Failed to create poll options: ' + optionsError.message },
          { status: 500 }
        )
      }

      insertedOptions = options || []
    }

    if (visibility === 'public') {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId,
        metricKey: 'posts_public_total',
        eventType: 'post_created',
        delta: 1,
        eventSource: 'api_posts_create',
        eventData: { post_id: post.id, media_count: cleanMediaUrls.length, type },
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
      action: isPoll ? 'poll.create' : 'post.create',
      resourceType: 'post',
      resourceId: post.id,
    })

    const insertedCollaborators = await insertFeedPostCollaborators({
      supabase,
      postId: post.id,
      invitedByUserId: userId,
      invites: collaboratorInvites,
    })

    await Promise.all([
      notifyTaggedUsers({
        taggedUserIds: taggedUsers,
        actorUserId: userId,
        postId: post.id,
        actorName: author.name || author.username,
      }),
      notifyCollaboratorInvites({
        invites: collaboratorInvites,
        actorUserId: userId,
        postId: post.id,
        actorName: author.name || author.username,
      }),
    ])

    const authorProfile = {
      id: author.id,
      username: author.username || 'user',
      full_name: author.name,
      avatar_url: author.avatarUrl || '',
      is_verified: author.isVerified,
      account_context: {
        type: author.type,
        profile_id: author.id,
        display_name: author.name,
        profile_path: getAccountAuthorPath(author),
      },
    }

    const poll = isPoll
      ? buildPollPayload({
          question: post.content,
          options: insertedOptions,
          endsAt: post.poll_ends_at || pollEndsAt?.toISOString() || null,
          totalVotes: 0,
          viewerVotedOptionId: null,
        })
      : undefined

    const normalizedPost = {
      ...post,
      tagged_users: taggedUsers,
      collaborators: insertedCollaborators,
      posted_as_profile_id: author.id,
      posted_as_type: author.type,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
      profiles: authorProfile,
      user: authorProfile,
      ...(poll ? { poll } : {}),
    }

    return NextResponse.json({
      success: true,
      data: normalizedPost,
      post: normalizedPost,
    })
  } catch (error) {
    console.error('💥 Posts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
