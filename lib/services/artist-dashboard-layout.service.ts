import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type ArtistDashboardWidgetId = 'recommendations' | 'analytics' | 'notifications'

export interface ArtistDashboardLayoutState {
  order: ArtistDashboardWidgetId[]
  hidden: ArtistDashboardWidgetId[]
}

const DEFAULT_LAYOUT: ArtistDashboardLayoutState = {
  order: ['recommendations', 'analytics', 'notifications'],
  hidden: [],
}

function parseLayout(raw: unknown): ArtistDashboardLayoutState {
  if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT
  const o = raw as Record<string, unknown>
  const order = Array.isArray(o.order) ? o.order.filter(Boolean) : []
  const hidden = Array.isArray(o.hidden) ? o.hidden.filter(Boolean) : []
  const allowed = new Set<ArtistDashboardWidgetId>(['recommendations', 'analytics', 'notifications'])
  const cleanOrder = (order as string[]).filter((id): id is ArtistDashboardWidgetId =>
    allowed.has(id as ArtistDashboardWidgetId)
  ) as ArtistDashboardWidgetId[]
  const cleanHidden = (hidden as string[]).filter((id): id is ArtistDashboardWidgetId =>
    allowed.has(id as ArtistDashboardWidgetId)
  ) as ArtistDashboardWidgetId[]
  if (cleanOrder.length === 0) return { ...DEFAULT_LAYOUT, hidden: cleanHidden }
  return { order: cleanOrder, hidden: cleanHidden }
}

export const artistDashboardLayoutService = {
  async getLayout(userId: string): Promise<ArtistDashboardLayoutState> {
    // Table may be absent from generated Database types; use untyped client for this table only.
    const supabase = createClientComponentClient() as any
    const { data, error } = await supabase
      .from('artist_dashboard_layouts')
      .select('layout')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('[artist-dashboard-layout] load failed', error.message)
      return DEFAULT_LAYOUT
    }
    if (!data?.layout) return DEFAULT_LAYOUT
    return parseLayout(data.layout)
  },

  async saveLayout(userId: string, layout: ArtistDashboardLayoutState): Promise<void> {
    const supabase = createClientComponentClient() as any
    const { error } = await supabase.from('artist_dashboard_layouts').upsert(
      {
        user_id: userId,
        layout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (error) throw error
  },
}
