import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { createPromoterNativePostContext, defaultPromoterDestinationPath } from '@/lib/promoter-network/assets-command'

const createPostSchema = z.object({
  authorType: z.enum(['organizer','artist','venue','individual']).default('organizer'),
  title: z.string().min(1),
  content: z.string().min(1),
  images: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['public','followers']).default('public'),
  status: z.enum(['draft','scheduled','published']).default('published'),
  publishAt: z.string().optional(),
  eventId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  collaborators: z.array(z.object({
    collaboratorType: z.enum(['organizer','artist','venue','individual']),
    collaboratorId: z.string().uuid(),
    role: z.string().optional()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = authResult

    const body = await request.json()
    const data = createPostSchema.parse(body)

    // Author is the current user
    const { data: post, error } = await supabase
      .from('promotion_posts')
      .insert({
        author_type: data.authorType,
        author_id: user.id,
        event_id: data.eventId,
        tour_id: data.tourId,
        title: data.title,
        content: data.content,
        images: data.images,
        tags: data.tags,
        visibility: data.visibility,
        status: data.status,
        publish_at: data.publishAt || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })

    // Insert collaborators if provided
    if (data.collaborators && data.collaborators.length > 0) {
      await supabase.from('post_collaborators').insert(
        data.collaborators.map(c => ({
          post_id: post.id,
          collaborator_type: c.collaboratorType,
          collaborator_id: c.collaboratorId,
          role: c.role || null,
          status: 'invited'
        }))
      )
    }

    const promoterAttribution = data.eventId
      ? await createPromoterNativePostContext({
          actorUserId: user.id,
          eventId: data.eventId,
          sourceId: post.id,
          destinationPath: defaultPromoterDestinationPath(data.eventId),
        })
      : null

    return NextResponse.json({
      success: true,
      post,
      promoter_attribution: promoterAttribution
        ? {
            active: true,
            membership_id: promoterAttribution.membershipId,
            public_url: `/r/${promoterAttribution.link.token}`,
          }
        : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
