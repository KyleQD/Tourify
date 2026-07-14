export interface FollowRequestProfile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_verified?: boolean | null
}

export interface FollowRequestRow {
  id: string
  requester_id: string
  created_at: string
}

export interface PresentedFollowRequest {
  id: string
  requester_id: string
  created_at: string
  profiles: FollowRequestProfile | null
}

export function presentFollowRequests(params: {
  rows: FollowRequestRow[]
  profiles: FollowRequestProfile[]
}): PresentedFollowRequest[] {
  const profileMap = new Map(params.profiles.map((profile) => [profile.id, profile]))

  return params.rows.map((row) => ({
    id: row.id,
    requester_id: row.requester_id,
    created_at: row.created_at,
    profiles: profileMap.get(row.requester_id) ?? {
      id: row.requester_id,
      username: 'unknown',
      full_name: null,
      avatar_url: null,
      is_verified: false,
    },
  }))
}
