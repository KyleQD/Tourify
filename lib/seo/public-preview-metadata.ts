import type { Metadata } from 'next'

import {
  DEFAULT_OG_IMAGE_PATH,
  compactList,
  toAbsoluteUrl,
  truncateDescription,
} from '@/lib/seo/site'

type PreviewImageInput = {
  url?: string | null
  alt?: string | null
}

export interface BasePreviewMetadataInput {
  title: string
  description?: string | null
  path: string
  image?: PreviewImageInput | null
  noIndex?: boolean
  type?: 'website' | 'article' | 'profile'
}

export interface EventPreviewInput {
  title: string
  description?: string | null
  eventDate?: string | null
  venueName?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  path: string
  imageUrl?: string | null
}

export interface ArtistPreviewInput {
  artistName: string
  bio?: string | null
  genres?: string[]
  location?: string | null
  path: string
  imageUrl?: string | null
}

export interface ProfilePreviewInput {
  displayName: string
  accountType?: string | null
  bio?: string | null
  location?: string | null
  path: string
  imageUrl?: string | null
}

export interface OrganizationPreviewInput {
  name: string
  subtypeLabel?: string | null
  description?: string | null
  specialties?: string[]
  path: string
  imageUrl?: string | null
}

export interface EpkPreviewInput {
  artistName: string
  bio?: string | null
  genre?: string | null
  location?: string | null
  path: string
  imageUrl?: string | null
}

export interface JobPreviewInput {
  title: string
  employerName?: string | null
  description?: string | null
  location?: string | null
  path: string
}

export interface VenuePreviewInput {
  venueName: string
  description?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  path: string
  imageUrl?: string | null
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function sentence(parts: Array<string | null | undefined>, fallback: string) {
  return compactList(parts).join(' · ') || fallback
}

function locationLabel(input: {
  city?: string | null
  state?: string | null
  country?: string | null
}) {
  return compactList([input.city, input.state, input.country]).join(', ') || null
}

export function buildPublicPreviewMetadata(input: BasePreviewMetadataInput): Metadata {
  const title = input.title.trim() || 'Tourify'
  const description = truncateDescription(input.description || 'Tourify is the live-music network for artists, venues, and teams.')
  const imageUrl =
    toAbsoluteUrl(input.image?.url) || toAbsoluteUrl(DEFAULT_OG_IMAGE_PATH) || DEFAULT_OG_IMAGE_PATH
  const imageAlt = input.image?.alt || title

  return {
    title,
    description,
    alternates: {
      canonical: input.path,
    },
    robots: input.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
          },
        },
    openGraph: {
      title,
      description,
      type: input.type || 'website',
      url: input.path,
      siteName: 'Tourify',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export function buildUnavailablePreviewMetadata(path: string): Metadata {
  return buildPublicPreviewMetadata({
    title: 'Tourify',
    description: 'This Tourify page is not available publicly.',
    path,
    noIndex: true,
  })
}

export function buildEventPreviewMetadata(input: EventPreviewInput): Metadata {
  const date = formatDateLabel(input.eventDate)
  const location = input.venueName || locationLabel(input)
  const fallbackDescription = sentence(
    [`${input.title} on Tourify`, date, location],
    'A live music event on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: input.title,
    description: input.description || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.title },
    type: 'article',
  })
}

export function buildArtistPreviewMetadata(input: ArtistPreviewInput): Metadata {
  const genreLabel = input.genres?.slice(0, 3).join(', ') || null
  const fallbackDescription = sentence(
    [genreLabel, input.location, 'Artist profile on Tourify'],
    'Artist profile on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: input.artistName,
    description: input.bio || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.artistName },
    type: 'profile',
  })
}

export function buildProfilePreviewMetadata(input: ProfilePreviewInput): Metadata {
  const accountLabel = input.accountType ? `${input.accountType} profile` : 'Profile'
  const fallbackDescription = sentence(
    [accountLabel, input.location, 'on Tourify'],
    'Profile on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: `${input.displayName} on Tourify`,
    description: input.bio || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.displayName },
    type: 'profile',
  })
}

export function buildOrganizationPreviewMetadata(input: OrganizationPreviewInput): Metadata {
  const fallbackDescription = sentence(
    [input.subtypeLabel, ...(input.specialties || []).slice(0, 3), 'Organization on Tourify'],
    'Organization on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: input.name,
    description: input.description || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.name },
  })
}

export function buildEpkPreviewMetadata(input: EpkPreviewInput): Metadata {
  const fallbackDescription = sentence(
    [input.genre, input.location, 'Electronic press kit on Tourify'],
    'Electronic press kit on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: `${input.artistName} EPK`,
    description: input.bio || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.artistName },
    type: 'profile',
  })
}

export function buildJobPreviewMetadata(input: JobPreviewInput): Metadata {
  const fallbackDescription = sentence(
    [input.employerName, input.location, 'Open role on Tourify'],
    'Open role on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: input.title,
    description: input.description || fallbackDescription,
    path: input.path,
  })
}

export function buildVenuePreviewMetadata(input: VenuePreviewInput): Metadata {
  const location = locationLabel(input)
  const fallbackDescription = sentence(
    [location, 'Venue profile on Tourify'],
    'Venue profile on Tourify.'
  )

  return buildPublicPreviewMetadata({
    title: input.venueName,
    description: input.description || fallbackDescription,
    path: input.path,
    image: { url: input.imageUrl, alt: input.venueName },
  })
}
