/**
 * Canonical write paths for the artist content helpers.
 *
 * DB-008 code-drift cluster "artist": `contexts/artist-context.tsx`
 * `createContent()` wrote to `artist_photos`, `artist_videos` and
 * `artist_merchandise`. None of those relations is created by the active
 * migration chain, so every write failed with a PostgREST "relation does not
 * exist" error while still reporting success to the caller in some paths.
 *
 * The canonical destinations already used elsewhere in the repository are:
 * - merchandise -> `marketplace_listings`, using the exact field mapping the
 *   marketplace backfill migration route already records
 *   (`app/api/marketplace/migrations/backfill-artist-merch/route.ts`).
 * - photos -> the artist EPK document `artist_epk_settings.settings.photoItems`,
 *   which is what `app/artist/epk/page.tsx` writes and
 *   `lib/services/epk.service.ts` reads back.
 * - video -> no in-chain relation exists. Callers get an explicit error instead
 *   of a silent write to a table that is not in the schema.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/database.types'
import {
  readEpkPhotoItems,
  epkPhotoItemToMediaItem,
  type EpkPhotoItem,
} from '@/lib/public-artist/artist-epk-media'

type ArtistDb = SupabaseClient<Database>

/** Loose input shape accepted by the legacy `createContent` helper. */
export interface LegacyMerchandiseInput {
  name?: string | null
  title?: string | null
  description?: string | null
  type?: string | null
  price?: number | string | null
  currency?: string | null
  inventory_count?: number | null
  images?: unknown
  is_featured?: boolean | null
  [key: string]: unknown
}

export interface MarketplaceListingInsert {
  seller_user_id: string
  title: string
  description: string | null
  category: string
  product_type: string
  status: string
  currency: string
  base_price: number
  cover_image_url: string | null
  media_urls: string[]
  inventory_count: number | null
  featured_rank: number | null
  metadata: Json
}

/** Normalize a persisted EPK photo item back into a JSON-safe document. */
function toJsonPhotoItem(item: EpkPhotoItem): Json {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  return {
    id: typeof item.id === 'string' ? item.id : null,
    url: typeof item.url === 'string' ? item.url : null,
    thumbnailUrl: typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null,
    caption: typeof item.caption === 'string' ? item.caption : null,
    isHero: item.isHero === true,
  }
}

function readImages(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
}

/**
 * Map a legacy `artist_merchandise` payload onto the canonical marketplace
 * listing insert. Mirrors the marketplace backfill route so a product created
 * from the artist context is indistinguishable from a migrated one.
 */
export function toMarketplaceListingInsert(
  data: LegacyMerchandiseInput,
  sellerUserId: string
): MarketplaceListingInsert {
  const images = readImages(data.images)
  const isMusic = data.type === 'music'
  const price = Number(data.price ?? 0)

  return {
    seller_user_id: sellerUserId,
    title: String(data.name || data.title || 'Untitled Product'),
    description: data.description ? String(data.description) : null,
    category: isMusic ? 'music' : 'merch',
    product_type: isMusic ? 'digital_asset' : 'physical_merch',
    // New listings start as drafts: publishing requires a seller agreement and
    // Stripe readiness, which the marketplace backfill route enforces too.
    status: 'draft',
    currency: String(data.currency || 'USD'),
    base_price: Number.isFinite(price) ? price : 0,
    cover_image_url: images[0] ?? null,
    media_urls: images,
    inventory_count: data.inventory_count != null ? Number(data.inventory_count) : null,
    featured_rank: data.is_featured ? 1 : null,
    metadata: { sourceTable: 'artist_merchandise' },
  }
}

export interface EpkPhotoWriteResult {
  ok: boolean
  itemId: string
  error?: string
}

/**
 * Append one photo to the artist EPK media document.
 *
 * Read-modify-write on `artist_epk_settings.settings.photoItems`, which is the
 * same document `lib/services/epk.service.ts` `updateEPKData()` writes. The row
 * is created on demand so an artist without an EPK can still add a photo.
 */
export async function appendEpkPhotoItem(
  supabase: ArtistDb,
  params: {
    userId: string
    artistProfileId?: string | null
    url: string
    caption?: string | null
    isHero?: boolean
  }
): Promise<EpkPhotoWriteResult> {
  const { userId, artistProfileId, url, caption, isHero } = params
  if (!url) return { ok: false, itemId: '', error: 'Missing photo url' }

  const { data: rows, error: readError } = await supabase
    .from('artist_epk_settings')
    .select('id, settings')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (readError) return { ok: false, itemId: '', error: readError.message }

  const row = (rows || [])[0] as { id?: string; settings?: unknown } | undefined
  const existing = readEpkPhotoItems(row || {}).map(toJsonPhotoItem)
  const itemId = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const nextSettings: Json = {
    ...(row?.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? (row.settings as Record<string, Json>)
      : {}),
    photoItems: [...existing, { id: itemId, url, caption: caption ?? '', isHero: isHero === true }] as Json,
  }

  const media = epkPhotoItemToMediaItem({ id: itemId, url, caption, isHero }, itemId)
  if (!media) return { ok: false, itemId: '', error: 'Invalid photo payload' }

  if (row?.id) {
    const { error } = await supabase
      .from('artist_epk_settings')
      .update({ settings: nextSettings, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) return { ok: false, itemId: '', error: error.message }
    return { ok: true, itemId }
  }

  const { error: insertError } = await supabase.from('artist_epk_settings').insert({
    user_id: userId,
    artist_profile_id: artistProfileId ?? null,
    is_public: false,
    template: 'booker',
    theme: 'dark',
    settings: nextSettings,
  })
  if (insertError) return { ok: false, itemId: '', error: insertError.message }
  return { ok: true, itemId }
}
