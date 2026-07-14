import type { EventHostArtist, EventLinkedVenue } from "@/lib/events/get-public-event-page"
import type { EventPageSkinId } from "@/lib/events/event-skin-tokens"

export interface EventData {
  id: string
  title: string
  description?: string
  type: string
  venue_id?: string | null
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_country?: string
  event_date: string
  start_time?: string
  end_time?: string
  doors_open?: string
  ticket_url?: string
  ticket_price_min?: number
  ticket_price_max?: number
  /** events_v2 id used for native Tourify ticketing */
  ticketing_event_id?: string | null
  ticketing_enabled?: boolean
  capacity?: number
  status: string
  is_public: boolean
  poster_url?: string
  setlist?: string[]
  tags?: string[]
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    website?: string
  }
  user_id: string
  slug: string
  created_at: string
  updated_at: string
  creator?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
    bio?: string | null
    url_slug?: string | null
    profile_path?: string | null
  }
  hostArtist?: EventHostArtist | null
  linkedVenue?: EventLinkedVenue | null
  pageTemplate?: EventPageSkinId
}

export interface EventPost {
  id: string
  content: string
  type: "text" | "image" | "video" | "announcement"
  media_urls?: string[]
  is_announcement: boolean
  is_pinned: boolean
  visibility: "public" | "attendees" | "organizers"
  likes_count: number
  comments_count: number
  created_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

export interface AttendanceUserSnippet {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  is_verified: boolean
}

export interface AttendanceRecord {
  user_id: string
  status: string
  user?: AttendanceUserSnippet | null
  profiles?: AttendanceUserSnippet | null
}

export interface AttendanceData {
  attending: number
  interested: number
  not_going: number
  user_status: "attending" | "interested" | "not_going" | null
  attendees: AttendanceRecord[]
  interested_users: AttendanceRecord[]
}

export type AttendanceStatus = "attending" | "interested" | "not_going"

export type EventPageTab = "overview" | "posts" | "attendance" | "details" | "media"
