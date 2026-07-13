import { apiRequest } from "@/lib/api/client"

export interface MarketplaceListing {
  id: string
  seller_user_id: string
  title: string
  description?: string | null
  product_type?: string | null
  category?: string | null
  currency?: string | null
  base_price?: number | null
  cover_image_url?: string | null
  tags?: string[]
}

interface MarketplaceDiscoverResponse {
  data?: MarketplaceListing[]
  warning?: string
}

export async function getMarketplaceDiscover(limit = 12) {
  const payload = await apiRequest<MarketplaceDiscoverResponse>(
    `/api/marketplace/discover?limit=${limit}`,
    { authRequired: false }
  )
  return Array.isArray(payload.data) ? payload.data : []
}
