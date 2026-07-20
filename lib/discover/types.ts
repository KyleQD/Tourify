export interface DiscoverTopTrack {
  id: string
  title: string
  file_url?: string
  cover_art_url?: string | null
  duration?: number | null
  plays?: number
  likes?: number
}

export interface DiscoverProfile {
  id: string
  username: string
  account_type: "artist" | "venue" | "organization" | "general"
  display_name: string
  avatar_url?: string | null
  bio?: string
  location?: string | null
  verified: boolean
  stats: {
    followers: number
    following: number
    posts: number
  }
  creator_type?: string | null
  service_offerings?: string[]
  available_for_hire?: boolean
  owner_user_id?: string | null
  account_id?: string | null
  genres?: string[]
  created_at?: string | null
  top_track?: DiscoverTopTrack | null
}

export interface DiscoverEvent {
  id: string
  slug: string | null
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
  poster_url?: string | null
  ticket_price_min?: number | null
  ticket_price_max?: number | null
  ticket_currency?: string | null
  attendance: {
    attending: number
    interested: number
    total: number
  }
}

export interface DiscoverMusicTrack {
  id: string
  title: string
  artist_name: string
  artist_id?: string
  artist_username?: string | null
  cover_art_url?: string | null
  file_url?: string
  genre?: string | null
  duration?: number | null
  plays?: number
  likes?: number
  created_at?: string | null
}

export interface DiscoverAlbum {
  id: string
  title: string
  artist_name: string
  artist_id?: string
  artist_username?: string | null
  cover_art_url?: string | null
  file_url?: string
  genre: string
  plays?: number
  likes?: number
  release_date?: string | null
}

export interface DiscoverTour {
  id: string
  slug: string
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  event_count: number
  next_event_date?: string | null
  cities?: string[]
  artist_names?: string[]
  cover_url?: string | null
}

export interface DiscoverTourStop {
  id: string
  slug: string | null
  title: string
  event_date: string | null
  venue_name: string | null
  venue_city: string | null
  venue_state: string | null
}
