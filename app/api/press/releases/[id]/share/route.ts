import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { bumpArticleSharesBy } from '@/lib/blog/article-engagement'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getPressReleaseById } from '@/lib/press/press-release-access'

interface RouteParams {
  params: Promise<{ id: string }>
}

const shareSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(25),
  note: z.string().trim().max(500).optional(),
})

async function ensureConversation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userA: string,
  userB: string
) {
  const [participant1, participant2] = userA < userB ? [userA, userB] : [userB, userA]

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1', participant1)
    .eq('participant_2', participant2)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      participant_1: participant1,
      participant_2: participant2,
    })
    .select('id')
    .single()

  if (error || !created)
    throw new Error(error?.message || 'Failed to create conversation')

  return created.id as string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Press release id is required' }, { status: 400 })

    const release = await getPressReleaseById(ctx.supabase, id)
    if (!release)
      return NextResponse.json({ success: false, error: 'Press release not found' }, { status: 404 })

    if (release.user_id !== ctx.userId)
      return NextResponse.json({ success: false, error: 'Only the author can share this press release' }, { status: 403 })

    const body = shareSchema.parse(await request.json())
    const recipientIds = [...new Set(body.recipientIds)].filter(recipientId => recipientId !== ctx.userId)

    if (recipientIds.length === 0)
      return NextResponse.json({ success: false, error: 'Select at least one recipient' }, { status: 400 })

    const service = createServiceRoleClient()
    const releaseUrl = `/artist/press/releases/${release.id}`
    const note = body.note?.trim()
    const messageContent =
      note ||
      `Shared a press release: ${release.title}\n\nView / download: ${releaseUrl}`

    const shares: Array<{ recipientId: string; messageId: string | null }> = []

    for (const recipientId of recipientIds) {
      let messageId: string | null = null

      try {
        const conversationId = await ensureConversation(service, ctx.userId, recipientId)
        const { data: message, error: messageError } = await service
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: ctx.userId,
            content: messageContent,
          })
          .select('id')
          .single()

        if (!messageError && message?.id)
          messageId = message.id
      } catch (error) {
        console.warn('[PressShare] Message send failed for recipient', recipientId, error)
      }

      const { error: shareError } = await service.from('press_release_shares').upsert(
        {
          press_post_id: release.id,
          shared_by: ctx.userId,
          recipient_user_id: recipientId,
          message_id: messageId,
          shared_at: new Date().toISOString(),
        },
        { onConflict: 'press_post_id,recipient_user_id' }
      )

      if (shareError) {
        console.error('[PressShare] Failed to record share:', shareError)
        continue
      }

      shares.push({ recipientId, messageId })
    }

    if (shares.length === 0)
      return NextResponse.json({ success: false, error: 'Failed to share press release' }, { status: 500 })

    await bumpArticleSharesBy({
      supabase: service,
      articleId: release.id,
      amount: shares.length,
    })

    return NextResponse.json({
      success: true,
      sharedCount: shares.length,
      shares,
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ success: false, error: 'Invalid share payload', details: error.flatten() }, { status: 400 })

    console.error('[PressShare] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
