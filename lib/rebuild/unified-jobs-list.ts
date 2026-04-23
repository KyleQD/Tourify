/**
 * Unified job discovery DTOs for GET /api/jobs (artist_jobs + job_posting_templates).
 */

export type UnifiedJobSource = 'artist' | 'venue'

export interface UnifiedJobListItem {
  source: UnifiedJobSource
  id: string
  title: string
  description: string | null
  location: string | null
  organization_name: string | null
  employment_type: string | null
  experience_level: string | null
  applications_count: number
  views_count: number
  urgent: boolean
  remote: boolean | null
  created_at: string
  /** Deep link: /jobs/[id]?source=artist|venue */
  detail_href: string
}

interface ArtistJobRow {
  id: string
  title: string
  description: string | null
  location: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  location_type?: string | null
  required_experience?: string | null
  applications_count?: number
  views_count?: number
  priority?: string | null
  created_at: string
}

interface VenueJobRow {
  id: string
  title: string
  description: string | null
  location: string | null
  employment_type?: string | null
  experience_level?: string | null
  applications_count?: number
  views_count?: number
  urgent?: boolean | null
  remote?: boolean | null
  created_at: string
  venue?: { name: string | null } | null
}

export function mapArtistJobToUnified(row: ArtistJobRow): UnifiedJobListItem {
  const loc =
    row.location ||
    [row.city, row.state, row.country].filter(Boolean).join(', ') ||
    null
  const remote = row.location_type === 'remote' || row.location_type === 'hybrid'
  return {
    source: 'artist',
    id: row.id,
    title: row.title,
    description: row.description,
    location: loc,
    organization_name: null,
    employment_type: null,
    experience_level: row.required_experience ?? null,
    applications_count: Number(row.applications_count ?? 0),
    views_count: Number(row.views_count ?? 0),
    urgent: row.priority === 'urgent' || row.priority === 'high',
    remote,
    created_at: row.created_at,
    detail_href: `/jobs/${row.id}?source=artist`,
  }
}

export function mapVenueTemplateToUnified(row: VenueJobRow): UnifiedJobListItem {
  const orgName = row.venue?.name ?? null
  return {
    source: 'venue',
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    organization_name: orgName,
    employment_type: row.employment_type ?? null,
    experience_level: row.experience_level ?? null,
    applications_count: Number(row.applications_count ?? 0),
    views_count: Number(row.views_count ?? 0),
    urgent: Boolean(row.urgent),
    remote: row.remote ?? null,
    created_at: row.created_at,
    detail_href: `/jobs/${row.id}?source=venue`,
  }
}

export function mergeUnifiedJobsByDate(
  artist: UnifiedJobListItem[],
  venue: UnifiedJobListItem[]
): UnifiedJobListItem[] {
  return [...artist, ...venue].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
