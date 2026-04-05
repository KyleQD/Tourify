import { apiRequest } from "@/lib/api/client"

export interface DiscoverProfile {
  id: string
  username: string
  account_type: "artist" | "venue" | "general"
  display_name: string
  location?: string | null
  creator_type?: string | null
  service_offerings?: string[]
  available_for_hire?: boolean
}

export interface DiscoverEvent {
  id: string
  title: string
  event_date?: string | null
  venue_name?: string | null
}

export interface DiscoverPost {
  id: string
  content: string
  created_at: string
}

export interface DiscoverResponse {
  success: boolean
  sections: {
    trending: DiscoverPost[]
    upcoming: DiscoverEvent[]
    people: DiscoverProfile[]
    hire_matches?: DiscoverProfile[]
  }
}

export function getDiscoverFeed(params: {
  intent: "grow" | "network" | "book" | "learn"
  location?: string
  creatorType?: string
  service?: string
  availableForHire?: boolean
}) {
  const searchParams = new URLSearchParams({ limit: "12", intent: params.intent })
  if (params.location?.trim()) searchParams.set("location", params.location.trim())
  if (params.creatorType?.trim()) searchParams.set("creatorType", params.creatorType.trim())
  if (params.service?.trim()) searchParams.set("service", params.service.trim())
  if (params.availableForHire) searchParams.set("availableForHire", "true")
  return apiRequest<DiscoverResponse>(`/api/discover?${searchParams.toString()}`, { authRequired: false })
}
