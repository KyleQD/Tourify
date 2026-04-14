import { supabase } from "@/lib/supabase"

export interface Campaign {
  id: string
  eventId: string
  name: string
  status: 'draft' | 'active' | 'completed'
  createdAt: string
}

export interface PromoCode {
  id: string
  eventId: string
  code: string
  discount: number
  usageCount: number
}

export async function addCampaign({ eventId, name }: { eventId: string; name: string }): Promise<{ data: Campaign | null; error?: string }> {
  if (!eventId || !name) return { data: null, error: 'Missing eventId or name' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('artist_marketing_campaigns')
      .insert({
        event_id: eventId,
        artist_id: user.id,
        name,
        status: 'draft',
      })
      .select('id, event_id, artist_id, name, status, created_at')
      .single()

    if (error) throw error

    return {
      data: data ? {
        id: data.id,
        eventId: data.event_id,
        name: data.name,
        status: data.status,
        createdAt: data.created_at,
      } : null,
    }
  } catch (err) {
    console.error('Error adding campaign:', err)
    return { data: null, error: 'Failed to create campaign' }
  }
}

export async function getCampaigns({ eventId }: { eventId: string }): Promise<{ data: Campaign[]; error?: string }> {
  if (!eventId) return { data: [], error: 'No eventId provided' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('artist_marketing_campaigns')
      .select('id, event_id, name, status, created_at')
      .eq('artist_id', user.id)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: (data ?? []).map(c => ({
        id: c.id,
        eventId: c.event_id,
        name: c.name,
        status: c.status,
        createdAt: c.created_at,
      })),
    }
  } catch (err) {
    console.error('Error fetching campaigns:', err)
    return { data: [], error: 'Failed to load campaigns' }
  }
}

export async function addPromoCode({ eventId, code, discount }: { eventId: string; code: string; discount: number }): Promise<{ data: PromoCode | null; error?: string }> {
  if (!eventId || !code || !discount) return { data: null, error: 'Missing required fields' }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('artist_marketing_campaigns')
      .insert({
        event_id: eventId,
        artist_id: user.id,
        name: `Promo: ${code}`,
        status: 'active',
        promo_code: code,
        discount_percent: discount,
      })
      .select('id, event_id, promo_code, discount_percent')
      .single()

    if (error) throw error

    return {
      data: data ? {
        id: data.id,
        eventId: data.event_id,
        code: data.promo_code ?? code,
        discount: data.discount_percent ?? discount,
        usageCount: 0,
      } : null,
    }
  } catch (err) {
    console.error('Error adding promo code:', err)
    return { data: null, error: 'Failed to create promo code' }
  }
}
