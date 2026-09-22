import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { resolveActingContext, recordActingSnapshot } from '@/lib/auth/acting-context'
import { GENERIC_ACCOUNT_AUTHOR_NAMES } from '@/lib/accounts/account-author'
import { resolveActingAccountSnapshot } from '@/lib/accounts/acting-account-snapshot'
import {
  isValidPollOptionCount,
  normalizePollOptions,
  resolvePollEndsAt,
} from '@/lib/polls/poll-duration'
import { buildPollPayload } from '@/lib/polls/hydrate-polls'
import { normalizeFeedMediaUrls } from '@/lib/feed/media-url-utils'
import { normalizeFeedPostDTO } from '@/lib/feed/feed-post-dto'
import type { PostAppearanceInput } from '@/lib/appearance/contracts'
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from '@/lib/config/audit-feature-gates'

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId, accountType, profileId, supabase } = ctx
    const author = await resolveActingAccountSnapshot(ctx)

    if (!author.name || GENERIC_ACCOUNT_AUTHOR_NAMES.has(author.name)) {
      console.warn('[posts/create] Author resolved to generic placeholder — acting context may have fallen back to general', {
        accountType,
        profileId,
        userId,
        resolvedName: author.name,
      })
    }

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
      appearance: appearanceInput,
    } = body as {
      content?: string
      type?: string
      location?: string
      hashtags?: string[]
      media_urls?: string[]
      poll_options?: string[]
      poll_duration?: string
      tagged_users?: string[]
      collaborators?: unknown[]
      collaborator_user_ids?: string[]
      appearance?: PostAppearanceInput
    }

    const isPoll = type === 'poll'
    if (isPoll && !isAuditFeatureApproved('polls')) {
      return auditFeatureUnavailable('polls')
    }
    const visibility = body.visibility || (isPoll ? 'followers' : 'public')

    const cleanHashtags = Array.isArray(hashtags) ? hashtags : []
    const cleanMediaUrls = normalizeFeedMediaUrls(media_urls)

    if (!content?.trim() && cleanMediaUrls.length === 0) {
      return NextResponse.json({ error: 'Content or media is required' }, { status: 400 })
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
      content: content?.trim() || 'Shared media',
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

    // === Appearance snapshot (gated by post_styles_write flag) ===
    // Lazy-imported to avoid bundling the EPK/appearance chain at module init time.
    let appearanceDTO: {
      mode: string
      templateId?: string
      templateVersion?: number
      schemaVersion?: number
      snapshot?: unknown
      snapshotHash?: string
    } = { mode: 'standard' }

    if (appearanceInput && appearanceInput.mode !== 'standard') {
      const { resolvePostStyleFlags } = await import('@/lib/post-style-flags')
      const flags = await resolvePostStyleFlags(supabase, profileId ?? userId)
      if (flags.post_styles_write) {
        try {
          const { resolveAppearanceSnapshot, computeSnapshotHash, AppearanceValidationError } =
            await import('@/lib/post-style-profiles/appearance-snapshot.service')

          const snapshot = await resolveAppearanceSnapshot(appearanceInput, supabase, userId, {
            type: accountType,
            id: profileId ?? userId,
          })
          const snapshotHash = computeSnapshotHash(snapshot)

          const { error: appearanceError } = await supabase
            .from('post_appearances')
            .insert({
              post_id: post.id,
              author_type: accountType,
              author_id: profileId ?? userId,
              source_profile_id:
                appearanceInput.mode === 'profile' ? appearanceInput.profileId : null,
              template_id: snapshot.templateId,
              template_version: snapshot.templateVersion,
              schema_version: snapshot.schemaVersion,
              snapshot: snapshot as unknown as Record<string, unknown>,
              snapshot_hash: snapshotHash,
              status: 'active',
            })

          if (appearanceError) {
            await supabase.from('posts').delete().eq('id', post.id)
            return NextResponse.json(
              { error: 'Failed to save post appearance: ' + appearanceError.message },
              { status: 500 }
            )
          }

          // Carry full snapshot data so the optimistic feed card can render styled immediately
          appearanceDTO = {
            mode: 'styled',
            templateId: snapshot.templateId,
            templateVersion: snapshot.templateVersion,
            schemaVersion: snapshot.schemaVersion,
            snapshot: snapshot as unknown,
            snapshotHash,
          }
        } catch (err) {
          const { AppearanceValidationError } =
            await import('@/lib/post-style-profiles/appearance-snapshot.service')
          if (err instanceof AppearanceValidationError) {
            await supabase.from('posts').delete().eq('id', post.id)
            return NextResponse.json(
              { error: (err as Error).message, appearanceReason: (err as any).reason },
              { status: 400 }
            )
          }
          // Non-validation error — log but fall back to standard (don't lose the post)
          console.error('Appearance snapshot failed (non-fatal):', err)
        }
      }
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
        actorName: (author.name || author.username) ?? undefined,
      }),
      notifyCollaboratorInvites({
        invites: collaboratorInvites,
        actorUserId: userId,
        postId: post.id,
        actorName: (author.name || author.username) ?? undefined,
      }),
    ])

    const poll = isPoll
      ? buildPollPayload({
          question: post.content,
          options: insertedOptions,
          endsAt: post.poll_ends_at || pollEndsAt?.toISOString() || null,
          totalVotes: 0,
          viewerVotedOptionId: null,
        })
      : undefined

    const appearanceRow = appearanceDTO.mode === 'styled'
      ? {
          template_id: appearanceDTO.templateId,
          template_version: appearanceDTO.templateVersion ?? 1,
          schema_version: appearanceDTO.schemaVersion ?? 1,
          snapshot: appearanceDTO.snapshot ?? null,
          snapshot_hash: appearanceDTO.snapshotHash ?? null,
          status: 'active',
        }
      : null
    const normalizedPost = normalizeFeedPostDTO({
      ...post,
      tagged_users: taggedUsers,
      collaborators: insertedCollaborators,
      posted_as_profile_id: author.id,
      posted_as_type: author.type,
      account_display_name: author.name,
      account_username: author.username,
      account_avatar_url: author.avatarUrl,
      resolved_author: author,
      appearance: appearanceRow,
      viewer_can_manage: true,
      ...(poll ? { poll } : {}),
      // Include appearance snapshot so optimistic feed cards render with style immediately
      post_appearances: appearanceRow,
    })

    return NextResponse.json({
      success: true,
      data: normalizedPost,
      post: normalizedPost,
      appearance: appearanceDTO,
    })
  } catch (error) {
    console.error('💥 Posts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
