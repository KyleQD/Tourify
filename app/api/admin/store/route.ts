import { NextRequest, NextResponse } from 'next/server'
import { resolveCommerceContext } from '@/lib/admin/commerce/resolve-context'
import { createClient } from '@/lib/supabase/server'
import { commerceErrorResponse, commerceJsonResponse } from '@/lib/admin/commerce/errors'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  basePrice: z.number().min(0),
  category: z.string().default('merch'),
  productType: z.string().default('physical_merch'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  inventoryCount: z.number().int().default(0),
  coverImageUrl: z.string().url().optional().nullable(),
  mediaUrls: z.array(z.string()).default([]),
})

function isRecoverableMarketplaceReadError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as Record<string, unknown>
  const code = String(record.code || '')
  const message = String(record.message || '')
  const details = String(record.details || '')
  const hint = String(record.hint || '')
  const combined = `${message} ${details} ${hint}`

  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    combined.includes('marketplace_listings') ||
    combined.includes('inventory_count') ||
    combined.includes('cover_image_url') ||
    combined.includes('media_urls')
  )
}

export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: 'commerce.view',
  })
  if (commerce instanceof NextResponse) return commerce

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    let query = supabase
      .from('marketplace_listings')
      .select('id, title, description, base_price, category, product_type, status, created_at, inventory_count, cover_image_url, media_urls', { count: 'exact' })
      .eq('seller_user_id', commerce.actor.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (error) {
      if (isRecoverableMarketplaceReadError(error)) {
        console.warn('[Admin Store API] Marketplace read returned empty fallback:', error)
        return commerceErrorResponse({
          status: 503,
          code: error.code || 'marketplace_data_unavailable',
          message: 'Marketplace listings are temporarily unavailable.',
          retryable: true,
          correlationId: commerce.request.correlationId,
        })
      }
      return commerceErrorResponse({
        status: 500,
        code: 'marketplace_store_unavailable',
        message: 'Failed to load marketplace listings.',
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }

    return commerceJsonResponse({ listings: data || [], total: count || 0 }, {
      correlationId: commerce.request.correlationId,
    })
  } catch {
    return commerceErrorResponse({
      status: 500,
      code: 'unexpected_store_error',
      message: 'Unexpected store error.',
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }
}

export async function POST(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: 'commerce.manage_listings',
  })
  if (commerce instanceof NextResponse) return commerce

  const supabase = await createClient()
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)

    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        seller_user_id: commerce.actor.userId,
        title: validated.title,
        description: validated.description ?? null,
        base_price: validated.basePrice,
        category: validated.category,
        product_type: validated.productType,
        status: validated.status,
        inventory_count: validated.inventoryCount,
        cover_image_url: validated.coverImageUrl ?? null,
        media_urls: validated.mediaUrls,
      })
      .select()
      .single()

    if (error) {
      return commerceErrorResponse({
        status: 500,
        code: 'marketplace_listing_create_failed',
        message: 'Failed to create marketplace listing.',
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }
    return commerceJsonResponse({ listing: data }, {
      status: 201,
      correlationId: commerce.request.correlationId,
    })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return commerceErrorResponse({
        status: 400,
        code: 'invalid_request',
        message: 'Validation error.',
        issues: err.errors,
        correlationId: commerce.request.correlationId,
      })
    }
    return commerceErrorResponse({
      status: 500,
      code: 'unexpected_store_error',
      message: 'Unexpected store error.',
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }
}

export async function PATCH(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: 'commerce.manage_listings',
  })
  if (commerce instanceof NextResponse) return commerce

  const supabase = await createClient()
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) {
      return commerceErrorResponse({
        status: 400,
        code: 'missing_listing_id',
        message: 'Missing listing id.',
        correlationId: commerce.request.correlationId,
      })
    }

    if (updates.delete) {
      const { data: existing } = await supabase
        .from('marketplace_order_items')
        .select('id')
        .eq('listing_id', id)
        .limit(1)
        .maybeSingle()
      if (existing) {
        await supabase
          .from('marketplace_listings')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('seller_user_id', commerce.actor.userId)
        return commerceJsonResponse({ success: true, soft_deleted: true }, {
          correlationId: commerce.request.correlationId,
        })
      }
      await supabase.from('marketplace_listings').delete().eq('id', id).eq('seller_user_id', commerce.actor.userId)
      return commerceJsonResponse({ success: true }, {
        correlationId: commerce.request.correlationId,
      })
    }

    const mappedUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.title !== undefined) mappedUpdates.title = updates.title
    if (updates.description !== undefined) mappedUpdates.description = updates.description
    if (updates.basePrice !== undefined || updates.base_price !== undefined) {
      mappedUpdates.base_price = updates.basePrice ?? updates.base_price
    }
    if (updates.category !== undefined) mappedUpdates.category = updates.category
    if (updates.productType !== undefined || updates.product_type !== undefined) {
      mappedUpdates.product_type = updates.productType ?? updates.product_type
    }
    if (updates.status !== undefined) mappedUpdates.status = updates.status
    if (updates.inventoryCount !== undefined || updates.inventory_count !== undefined) {
      mappedUpdates.inventory_count = updates.inventoryCount ?? updates.inventory_count
    }
    if (updates.coverImageUrl !== undefined || updates.cover_image_url !== undefined) {
      mappedUpdates.cover_image_url = updates.coverImageUrl ?? updates.cover_image_url
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .update(mappedUpdates)
      .eq('id', id)
      .eq('seller_user_id', commerce.actor.userId)
      .select()
      .single()

    if (error) {
      return commerceErrorResponse({
        status: 500,
        code: 'marketplace_listing_update_failed',
        message: 'Failed to update marketplace listing.',
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }
    return commerceJsonResponse({ listing: data }, {
      correlationId: commerce.request.correlationId,
    })
  } catch {
    return commerceErrorResponse({
      status: 500,
      code: 'unexpected_store_error',
      message: 'Unexpected store error.',
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }
}
