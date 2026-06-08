'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { Promotion, PromotionStatus } from '../types/promotion'

const promotionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['event', 'venue', 'special_offer', 'newsletter'] as const),
  channels: z.array(z.enum(['social', 'email', 'website', 'paid_ads'] as const)),
  targets: z.array(z.object({
    platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'email', 'website'] as const),
    audience: z.object({
      demographics: z.object({
        ageRange: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
      }).optional(),
      customAudience: z.array(z.string()).optional(),
    }).optional(),
    budget: z.number().optional(),
    startDate: z.string(),
    endDate: z.string(),
  })),
  content: z.object({
    text: z.string(),
    media: z.array(z.object({
      type: z.enum(['image', 'video'] as const),
      url: z.string(),
    })).optional(),
    callToAction: z.object({
      text: z.string(),
      url: z.string(),
    }).optional(),
  }),
  eventId: z.string().optional(),
  scheduledFor: z.string().optional(),
})

function encodePromotionContent(validated: z.infer<typeof promotionSchema>) {
  const payload = {
    description: validated.description,
    type: validated.type,
    channels: validated.channels,
    targets: validated.targets,
    callToAction: validated.content.callToAction,
  }
  return `${validated.content.text}\n\n---\n${JSON.stringify(payload)}`
}

function decodePromotionContent(content: string) {
  const parts = content.split('\n\n---\n')
  if (parts.length < 2) {
    return {
      text: content,
      description: content,
      type: 'venue' as Promotion['type'],
      channels: [] as Promotion['channels'],
      targets: [] as Promotion['targets'],
      callToAction: undefined,
    }
  }

  try {
    const meta = JSON.parse(parts.slice(1).join('\n\n---\n')) as {
      description?: string
      type?: Promotion['type']
      channels?: Promotion['channels']
      targets?: Promotion['targets']
      callToAction?: Promotion['content']['callToAction']
    }
    return {
      text: parts[0],
      description: meta.description || parts[0],
      type: meta.type || 'venue',
      channels: meta.channels || [],
      targets: meta.targets || [],
      callToAction: meta.callToAction,
    }
  } catch {
    return {
      text: content,
      description: content,
      type: 'venue' as Promotion['type'],
      channels: [] as Promotion['channels'],
      targets: [] as Promotion['targets'],
      callToAction: undefined,
    }
  }
}

function mapDbStatusToPromotion(status: string): PromotionStatus {
  if (status === 'published') return 'active'
  if (status === 'draft') return 'draft'
  if (status === 'scheduled') return 'scheduled'
  return 'draft'
}

function mapPromotionStatusToDb(status: PromotionStatus) {
  if (status === 'active') return 'published'
  if (status === 'paused') return 'draft'
  if (status === 'completed' || status === 'cancelled') return 'draft'
  return status
}

function mapRowToPromotion(row: Record<string, unknown>): Promotion {
  const decoded = decodePromotionContent(String(row.content || ''))
  const imageUrls = Array.isArray(row.images) ? row.images.map(String) : []

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: decoded.description,
    type: decoded.type,
    status: mapDbStatusToPromotion(String(row.status || 'draft')),
    channels: decoded.channels,
    targets: decoded.targets,
    content: {
      text: decoded.text,
      media: imageUrls.map(url => ({ type: 'image' as const, url })),
      callToAction: decoded.callToAction,
    },
    eventId: row.event_id ? String(row.event_id) : undefined,
    scheduledFor: row.publish_at ? String(row.publish_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    createdBy: {
      id: String(row.author_id || ''),
      name: 'Venue',
    },
    analytics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      engagement: { likes: 0, shares: 0, comments: 0 },
      roi: 0,
    },
  }
}

async function getAuthorizedSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, supabase, user: null }
  return { supabase, user, error: null }
}

export async function createPromotion(data: z.infer<typeof promotionSchema>) {
  try {
    const validatedData = promotionSchema.parse(data)
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const status = validatedData.scheduledFor && new Date(validatedData.scheduledFor).getTime() > Date.now()
      ? 'scheduled'
      : 'published'

    const { data: post, error } = await auth.supabase
      .from('promotion_posts')
      .insert({
        author_type: 'venue',
        author_id: auth.user.id,
        event_id: validatedData.eventId || null,
        title: validatedData.title,
        content: encodePromotionContent(validatedData),
        images: validatedData.content.media?.map(item => item.url) || [],
        tags: [validatedData.type, ...validatedData.channels],
        visibility: 'public',
        status,
        publish_at: validatedData.scheduledFor || null,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true, promotion: mapRowToPromotion(post) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    return { success: false, error: 'Failed to create promotion' }
  }
}

export async function updatePromotion(id: string, data: Partial<z.infer<typeof promotionSchema>>) {
  try {
    const validatedData = promotionSchema.partial().parse(data)
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const { data: existing } = await auth.supabase
      .from('promotion_posts')
      .select('content')
      .eq('id', id)
      .eq('author_id', auth.user.id)
      .maybeSingle()

    if (!existing) return { success: false, error: 'Promotion not found' }

    const merged = {
      title: validatedData.title || 'Promotion',
      description: validatedData.description || decodePromotionContent(String(existing.content)).description,
      type: validatedData.type || decodePromotionContent(String(existing.content)).type,
      channels: validatedData.channels || decodePromotionContent(String(existing.content)).channels,
      targets: validatedData.targets || decodePromotionContent(String(existing.content)).targets,
      content: {
        text: validatedData.content?.text || decodePromotionContent(String(existing.content)).text,
        media: validatedData.content?.media,
        callToAction: validatedData.content?.callToAction || decodePromotionContent(String(existing.content)).callToAction,
      },
      eventId: validatedData.eventId,
      scheduledFor: validatedData.scheduledFor,
    }

    const { error } = await auth.supabase
      .from('promotion_posts')
      .update({
        title: merged.title,
        content: encodePromotionContent({
          ...merged,
          description: merged.description,
          type: merged.type,
          channels: merged.channels,
          targets: merged.targets,
          content: {
            text: merged.content.text,
            media: merged.content.media,
            callToAction: merged.content.callToAction,
          },
        } as z.infer<typeof promotionSchema>),
        event_id: merged.eventId,
        publish_at: merged.scheduledFor,
        images: merged.content.media?.map(item => item.url),
        tags: [merged.type, ...merged.channels],
        status: merged.scheduledFor && new Date(merged.scheduledFor).getTime() > Date.now()
          ? 'scheduled'
          : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('author_id', auth.user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    return { success: false, error: 'Failed to update promotion' }
  }
}

export async function updatePromotionStatus(id: string, status: PromotionStatus) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const dbStatus = mapPromotionStatusToDb(status)
    const { error } = await auth.supabase
      .from('promotion_posts')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('author_id', auth.user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update promotion status' }
  }
}

export async function deletePromotion(id: string) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const { error } = await auth.supabase
      .from('promotion_posts')
      .delete()
      .eq('id', id)
      .eq('author_id', auth.user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to delete promotion' }
  }
}

export async function getPromotions(eventId?: string): Promise<Promotion[]> {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return []

    let query = auth.supabase
      .from('promotion_posts')
      .select('*')
      .eq('author_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch promotions:', error)
      return []
    }

    return (data || []).map(row => mapRowToPromotion(row as Record<string, unknown>))
  } catch (error) {
    console.error('Failed to fetch promotions:', error)
    return []
  }
}

export async function getPromotionAnalytics(id: string) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return null

    const { data: post } = await auth.supabase
      .from('promotion_posts')
      .select('id')
      .eq('id', id)
      .eq('author_id', auth.user.id)
      .maybeSingle()

    if (!post) return null

    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      engagement: { likes: 0, shares: 0, comments: 0 },
      roi: 0,
    }
  } catch (error) {
    console.error('Failed to fetch promotion analytics:', error)
    return null
  }
}

export async function uploadPromotionMedia(file: File) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)
    const storagePath = `${auth.user.id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`

    const { error: uploadErr, data: uploaded } = await auth.supabase.storage
      .from('post-media')
      .upload(storagePath, fileBytes, { contentType: file.type, upsert: false })

    if (uploadErr) return { success: false, error: uploadErr.message }

    const { data: publicUrl } = auth.supabase.storage.from('post-media').getPublicUrl(uploaded.path)
    return { success: true, url: publicUrl.publicUrl }
  } catch {
    return { success: false, error: 'Failed to upload media' }
  }
}
