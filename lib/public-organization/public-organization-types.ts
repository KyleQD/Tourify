import type { OrganizationSubtype } from '@/lib/organizations/org-subtypes'

export interface PublicOrganizationRosterMember {
  membershipId: string
  role: string
  artistProfileId: string
  artistName: string
  artistSlug: string | null
  avatarUrl: string | null
  genres: string[]
}

export interface PublicOrganizationEvent {
  id: string
  title: string
  slug: string | null
  eventDate: string | null
  venueName: string | null
  city: string | null
  status: string | null
}

export interface PublicOrganizationJob {
  id: string
  title: string
  location: string | null
  status: string | null
  createdAt: string | null
}

export interface PublicOrganizationPost {
  id: string
  content: string
  createdAt: string | null
  likesCount: number
  commentsCount: number
}

export interface PublicOrganizationTour {
  id: string
  name: string
  status: string | null
  startDate: string | null
  endDate: string | null
}

export interface PublicOrganizationPageDTO {
  id: string
  slug: string
  name: string
  subtype: OrganizationSubtype
  subtypeLabel: string
  description: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  specialties: string[]
  contactInfo: Record<string, unknown>
  socialLinks: Record<string, unknown>
  ownerUserId: string
  accountId: string | null
  opsOrgId: string | null
  isVerified: boolean
  followerCount: number
  isOwnOrganization: boolean
  canManage: boolean
  roster: PublicOrganizationRosterMember[]
  upcomingEvents: PublicOrganizationEvent[]
  pastEvents: PublicOrganizationEvent[]
  tours: PublicOrganizationTour[]
  posts: PublicOrganizationPost[]
  openJobs: PublicOrganizationJob[]
  createdAt: string
}
