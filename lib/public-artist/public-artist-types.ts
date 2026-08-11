import type { EPKData } from '@/lib/services/epk.service'
import type { PublicArtistAppearance } from '@/lib/public-artist/public-artist-appearance'
import type { ArtistProfileAppearance } from '@/lib/public-artist/artist-profile-appearance'

export type PublicArtistId = string
export type PublicUserId = string

export type PublicArtistBannerKind = 'image' | 'video'
export type PublicArtistMediaKind = 'photo' | 'video'

export interface PublicArtistViewerDTO {
  isAuthenticated: boolean
  userId: PublicUserId | null
  isOwner: boolean
  /** False when settings.public_profile is disabled (owner can still view). */
  isPublicProfile: boolean
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
  publicAccountId?: string | null
  profileKind?: 'artist' | 'band'
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
   * Provider that owns the audio. 'tourify' (default) or 'audius'.
   */
  provider?: 'tourify' | 'audius' | null
  /** External provider track ID (e.g. Audius track id). */
  providerTrackId?: string | null
  /** Canonical external URL for attribution (e.g. Audius permalink). */
  canonicalUrl?: string | null
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
  accessMode: 'free' | 'paid'
  previewMode: 'full' | 'clip'
  previewDurationSeconds: number
  allowLibraryAdd: boolean
  allowProfileFeature: boolean
  listingId?: string | null
  trust: {
    originStatus: string
    certificationStatus: string
    certificationLevel: number
    certificationPublicId: string | null
    publicLabel: string
  }
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
  title?: string | null
  slug?: string | null
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
  authorUsername: string | null
  authorAvatarUrl: string | null
  authorProfilePath: string | null
  authorVerified: boolean
  createdAt: string
  content: string
  type: string
  contentRefType: string | null
  contentRefId: string | null
  visibility: string | null
  location: string | null
  hashtags: string[]
  mediaUrls: string[]
  mediaUnavailableCount?: number
  taggedUsers: string[]
  collaborators: Array<{
    userId: string | null
    profileId: string | null
    username: string
    avatarUrl: string | null
  }>
  metadata: Record<string, unknown> | null
  trackPreview?: Record<string, unknown> | null
  articlePreview?: Record<string, unknown> | null
  listingPreview?: Record<string, unknown> | null
  eventPreview?: Record<string, unknown> | null
  likesCount: number
  commentsCount: number
  sharesCount: number
  isPinned: boolean
  isLiked: boolean
  viewerCanManage: boolean
  appearance?: {
    template_id?: string | null
    template_version?: number | null
    schema_version?: number | null
    snapshot?: unknown
    snapshot_hash?: string | null
    status?: string | null
  } | null
  poll?: {
    question: string
    options: Array<{ id: string; text: string; votes: number; position: number }>
    endsAt: string | null
    totalVotes: number
    isClosed: boolean
    viewerVotedOptionId: string | null
    viewerHasVoted: boolean
  } | null
}

export interface PublicArtistPostsDTO {
  pinnedPosts: PublicArtistPostDTO[]
  posts: PublicArtistPostDTO[]
  nextCursor: string | null
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

export interface PublicArtistSocialLinkDTO {
  platform: string
  label: string
  url: string
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
  publicUrl: string | null
  isPublic: boolean
}

export interface PublicArtistOrganizationMembershipDTO {
  organizationId: string
  name: string
  slug: string | null
  role: string
  subtype: string | null
}

export interface PublicArtistBandMemberDTO {
  membershipId: string
  artistProfileId: string
  artistName: string
  artistSlug: string | null
  role: string
  avatarUrl: string | null
  genres: string[]
}

export interface PublicArtistPageDTO {
  pageKind?: 'artist' | 'band'
  viewer: PublicArtistViewerDTO
  hero: PublicArtistHeroDTO
  about: PublicArtistAboutDTO
  socialLinks: PublicArtistSocialLinkDTO[]
  tracks: PublicArtistTracksDTO
  events: PublicArtistEventsDTO
  media: PublicArtistMediaGalleryDTO
  products: PublicArtistProductsDTO
  posts: PublicArtistPostsDTO
  stats: PublicArtistStatsDTO
  creator: PublicArtistCreatorDTO
  epk: PublicArtistEPKDTO
  organizations: PublicArtistOrganizationMembershipDTO[]
  bandMembers?: PublicArtistBandMemberDTO[]
  /**
   * EPK-style public profile appearance. Null when never configured —
   * page keeps the default purple/dark chrome.
   */
  appearance: PublicArtistAppearance | null
  /**
   * Published full-page design. Drafts are never returned by the public loader.
   * Bands intentionally remain on their organization-owned presentation.
   */
  profileAppearance: ArtistProfileAppearance | null
  /** Resolved on the server to avoid unstyled content flashing before hydration. */
  postStylesRead?: boolean
}
