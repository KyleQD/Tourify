import { apiRequest } from "@/lib/api/client"

export interface HubDiscoverEvent {
  id: string
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
}

export interface HubNewsItem {
  id: string
  title: string
  summary: string
  sourceName: string
  publishedAt: string
  url?: string
  topics: string[]
}

export interface HubJobItem {
  id: string
  title: string
  city?: string | null
  state?: string | null
  country?: string | null
  payment_type?: string | null
  payment_amount?: number | null
}

export interface HubResponse {
  success: boolean
  context?: {
    location?: string | null
    intent?: "grow" | "network" | "book" | "learn"
  }
  sections?: {
    discover?: HubDiscoverEvent[]
    pulse?: HubNewsItem[]
    jobs?: HubJobItem[]
  }
}

export function getHubFeed(params: { location?: string; intent?: "grow" | "network" | "book" | "learn" }) {
  const searchParams = new URLSearchParams()
  if (params.location?.trim()) searchParams.set("location", params.location.trim())
  if (params.intent) searchParams.set("intent", params.intent)
  const query = searchParams.toString()
  return apiRequest<HubResponse>(`/api/hub${query ? `?${query}` : ""}`, { authRequired: false })
}
