import type { EPKData } from '@/lib/services/epk.service'

export type PublicArtistId = string
export type PublicUserId = string

export type PublicArtistBannerKind = 'image' | 'video'
export type PublicArtistMediaKind = 'photo' | 'video'

export interface PublicArtistViewerDTO {
  isAuthenticated: boolean
  userId: PublicUserId | null
  isOwner: boolean
}

export interface PublicArtistBannerDTO {
  kind: PublicArtistBannerKind
  url: string
  /**
   * Optional preview image for video banners (poster).
   * If missing, UI can fall back to the `url` when rendering previews.
   */
  thumbnailUrl?: string | null
}

export interface PublicArtistHeroDTO {
  artistId: PublicArtistId
  userId: PublicUserId
  artistName: string
  verified: boolean
  genres: string[]
  location: string | null
  avatarUrl: string | null
  banner: PublicArtistBannerDTO | null
  followersCount: number
  /**
   * “Future” monthly listeners as calculated by `get_enhanced_artist_stats`.
   */
  futureMonthlyListeners: number
}

export interface PublicArtistTrackDTO {
  id: PublicArtistId
  title: string
  genre: string | null
  durationSeconds: number | null
  releaseDate: string | null
  /**
   * Audio URL used by the public player.
   */
  audioUrl: string | null
  artworkUrl: string | null
  /**
   * Spotify/Apple/etc deep links (optional).
   */
  platformUrls: {
    spotify?: string | null
    appleMusic?: string | null
    soundcloud?: string | null
    youtube?: string | null
  }
  /**
   * Derived from `artist_music.stats` JSONB.
   */
  playCount: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  downloadsCount: number
  isPinned: boolean
  isFeatured: boolean
}

export interface PublicArtistTracksDTO {
  featuredTrack: PublicArtistTrackDTO | null
  /**
   * Track list shown in the “Featured/Music” section.
   * Ordering should be pinned-first, then featured, then newest.
   */
  tracks: PublicArtistTrackDTO[]
  /**
   * Recommended initial track for the persistent player.
   */
  defaultTrackId: PublicArtistId | null
}

export interface PublicArtistEventDTO {
  id: PublicArtistId
  eventDate: string
  venueName: string | null
  location: string | null
  /**
   * External ticket link.
   */
  ticketUrl: string | null
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | string
}

export interface PublicArtistEventsDTO {
  upcomingEvents: PublicArtistEventDTO[]
}

export interface PublicArtistMediaItemDTO {
  id: PublicArtistId
  kind: PublicArtistMediaKind
  url: string
  thumbnailUrl?: string | null
  caption: string | null
  /**
   * Used to optionally render “hero” media.
   */
  isHero: boolean
}

export interface PublicArtistMediaGalleryDTO {
  items: PublicArtistMediaItemDTO[]
}

export interface PublicArtistProductDTO {
  id: PublicArtistId
  name: string
  description: string | null
  type: string | null
  price: number | null
  currency: string | null
  inventoryCount: number | null
  imageUrl: string | null
  isFeatured: boolean
  status: string | null
}

export interface PublicArtistProductsDTO {
  featuredProducts: PublicArtistProductDTO[]
  products: PublicArtistProductDTO[]
}

export interface PublicArtistPostDTO {
  id: PublicArtistId
  authorUserId: PublicUserId
  authorName: string
  createdAt: string
  content: string
  type: string
  visibility: string | null
  location: string | null
  hashtags: string[]
  mediaUrls: string[]
  likesCount: number
  commentsCount: number
  sharesCount: number
  isPinned: boolean
}

export interface PublicArtistPostsDTO {
  pinnedPosts: PublicArtistPostDTO[]
  posts: PublicArtistPostDTO[]
}

export interface PublicArtistStatsDTO {
  followersCount: number
  futureMonthlyListeners: number
  /**
   * Streams/plays used for “music” engagement signals.
   */
  totalPlays: number
  totalStreams: number
  engagementRate: number
  totalTracks: number
  totalEvents: number
  totalRevenue: number
}

export interface PublicArtistAboutDTO {
  bio: string | null
}

export interface PublicArtistCreatorDTO {
  primaryCreatorType: string | null
  serviceOfferings: string[]
  productsForSale: string[]
  credentials: string[]
  workHighlights: string[]
  availableForHire: boolean
  collaborationInterest: boolean
  bookingRate: string | null
  availability: string | null
  preferredContact: string | null
}

export interface PublicArtistEPKDTO {
  epk: EPKData | null
}

export interface PublicArtistPageDTO {
  viewer: PublicArtistViewerDTO
  hero: PublicArtistHeroDTO
  about: PublicArtistAboutDTO
  tracks: PublicArtistTracksDTO
  events: PublicArtistEventsDTO
  media: PublicArtistMediaGalleryDTO
  products: PublicArtistProductsDTO
  posts: PublicArtistPostsDTO
  stats: PublicArtistStatsDTO
  creator: PublicArtistCreatorDTO
  epk: PublicArtistEPKDTO
}

