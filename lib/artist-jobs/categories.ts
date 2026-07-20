import type { SupabaseClient } from '@supabase/supabase-js'
import { validate as validateUuid } from 'uuid'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const ARTIST_JOB_CATEGORY_SEED = [
  { name: 'Opening Slots', description: 'Opening act opportunities for concerts and tours', icon: 'Music', color: '#8B5CF6', is_active: true },
  { name: 'Venue Bookings', description: 'Direct booking opportunities at venues', icon: 'MapPin', color: '#10B981', is_active: true },
  { name: 'Collaborations', description: 'Music collaborations with other artists', icon: 'Users', color: '#F59E0B', is_active: true },
  { name: 'Session Work', description: 'Studio session musician opportunities', icon: 'Mic', color: '#EF4444', is_active: true },
  { name: 'Production', description: 'Music production and mixing opportunities', icon: 'Settings', color: '#6366F1', is_active: true },
  { name: 'Touring', description: 'Tour musician and crew opportunities', icon: 'Truck', color: '#EC4899', is_active: true },
  { name: 'Festivals', description: 'Festival performance opportunities', icon: 'Calendar', color: '#14B8A6', is_active: true },
  { name: 'Teaching', description: 'Music education and lesson opportunities', icon: 'Book', color: '#F97316', is_active: true },
  { name: 'Events', description: 'Private events and corporate gigs', icon: 'Star', color: '#84CC16', is_active: true },
  { name: 'Online', description: 'Virtual performances and streaming opportunities', icon: 'Monitor', color: '#06B6D4', is_active: true },
] as const

/** Legacy fallback IDs returned before DB-backed categories were enforced. */
export const LEGACY_CATEGORY_ID_TO_NAME: Record<string, string> = {
  '1': 'Musicians',
  '2': 'Vocalists',
  '3': 'Sound Engineers',
  '4': 'Lighting Technicians',
  '5': 'Stage Crew',
  '6': 'Photographers',
  '7': 'Videographers',
  '8': 'Transportation',
  '9': 'Security',
  '10': 'Catering',
  '11': 'Tour Management',
  '12': 'Accommodation',
}

export async function fetchActiveArtistJobCategories(supabase: SupabaseClient) {
  return supabase
    .from('artist_job_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')
}

export async function fetchActiveArtistJobCategoriesForApi() {
  try {
    const admin = createServiceRoleClient()
    return fetchActiveArtistJobCategories(admin)
  } catch (error) {
    console.error('Service role unavailable for category fetch:', error)
    return { data: null, error: error instanceof Error ? error : new Error('Service role unavailable') }
  }
}

export async function ensureArtistJobCategoriesSeeded(): Promise<void> {
  try {
    const admin = createServiceRoleClient()
    const { error } = await admin
      .from('artist_job_categories')
      .upsert([...ARTIST_JOB_CATEGORY_SEED], { onConflict: 'name', ignoreDuplicates: true })

    if (error) throw error
  } catch (error) {
    console.error('Failed to seed artist_job_categories:', error)
  }
}

export async function resolveArtistJobCategoryId(
  supabase: SupabaseClient,
  rawCategoryId: string
): Promise<string | null> {
  if (validateUuid(rawCategoryId)) {
    const { data, error } = await fetchCategoryRowById(rawCategoryId)
    if (error) throw error
    return data?.id ?? null
  }

  const legacyName = LEGACY_CATEGORY_ID_TO_NAME[rawCategoryId]
  if (!legacyName) return null

  const { data, error } = await fetchCategoryRowByName(legacyName)
  if (error) throw error
  return data?.id ?? null
}

async function fetchCategoryRowById(categoryId: string) {
  try {
    const admin = createServiceRoleClient()
    return admin
      .from('artist_job_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('is_active', true)
      .maybeSingle()
  } catch {
    return { data: null, error: new Error('Service role unavailable') }
  }
}

async function fetchCategoryRowByName(name: string) {
  try {
    const admin = createServiceRoleClient()
    return admin
      .from('artist_job_categories')
      .select('id')
      .eq('name', name)
      .eq('is_active', true)
      .maybeSingle()
  } catch {
    return { data: null, error: new Error('Service role unavailable') }
  }
}
