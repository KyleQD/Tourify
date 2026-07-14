/**
 * Shared unique slug generation for entity public handles
 * (artist_profiles.url_slug, venue_profiles.url_slug, etc.).
 */

export function slugifyName(name: string | null | undefined, fallback = 'item'): string {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return slug || fallback
}

export interface GenerateUniqueSlugInput {
  /** Supabase-like client with from().select().eq().limit() */
  client: any
  table: string
  column?: string
  base: string
  fallbackPrefix: string
  maxAttempts?: number
}

export async function generateUniqueSlug(input: GenerateUniqueSlugInput): Promise<string> {
  const {
    client,
    table,
    column = 'url_slug',
    base,
    fallbackPrefix,
    maxAttempts = 25,
  } = input

  const baseForSlug = slugifyName(base, fallbackPrefix)

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = i === 0 ? baseForSlug : `${baseForSlug}-${i}`

    const { data: existing } = await client
      .from(table)
      .select('id')
      .eq(column, candidate)
      .limit(1)

    if (!existing || existing.length === 0) return candidate
  }

  throw new Error(`Failed to generate unique ${table}.${column}`)
}
