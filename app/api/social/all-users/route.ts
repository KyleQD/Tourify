import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? (value as Record<string, any>) : null
}

function resolveUsername(profile: {
  id: string
  username?: string | null
  metadata?: unknown
}): string {
  const metadata = asRecord(profile.metadata)
  const fromColumn = profile.username?.trim()
  const fromMetadata = typeof metadata?.username === 'string' ? metadata.username.trim() : ''
  if (fromColumn) return fromColumn
  if (fromMetadata) return fromMetadata
  return `user-${profile.id.slice(0, 8)}`
}

function resolveFullName(profile: {
  full_name?: string | null
  metadata?: unknown
  username: string
}): string {
  const metadata = asRecord(profile.metadata)
  const fromColumn = profile.full_name?.trim()
  const fromMetadata = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : ''
  if (fromColumn && fromColumn !== 'Anonymous User') return fromColumn
  if (fromMetadata && fromMetadata !== 'Anonymous User') return fromMetadata
  return profile.username
}

function resolveAvatarUrl(profile: {
  avatar_url?: string | null
  metadata?: unknown
}): string | null {
  const fromColumn = profile.avatar_url?.trim()
  if (fromColumn) return fromColumn
  const metadata = asRecord(profile.metadata)
  const fromMetadata = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url.trim() : ''
  return fromMetadata || null
}

async function resolveRequestUser(request: NextRequest): Promise<User | null> {
  try {
    const authClient = await createClient()
    const { data: { user }, error } = await authClient.auth.getUser()
    if (!error && user) return user
  } catch (error) {
    console.warn('all-users getUser failed, trying cookie fallback:', error)
  }

  return parseUserFromRequestCookieHeader(request.headers.get('cookie'))
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveRequestUser(request)

    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 48)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const supabase = createServiceRoleClient()

    const [followsResult, pendingResult] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id),
      supabase
        .from('follow_requests')
        .select('target_id')
        .eq('requester_id', user.id)
        .eq('status', 'pending'),
    ])

    const excludedIds = Array.from(new Set([
      user.id,
      ...(followsResult.data?.map((row) => row.following_id).filter(Boolean) || []),
      ...(pendingResult.data?.map((row) => row.target_id).filter(Boolean) || []),
    ]))

    let query = supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        bio,
        location,
        is_verified,
        followers_count,
        following_count,
        created_at,
        account_type,
        metadata
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (excludedIds.length === 1)
      query = query.neq('id', excludedIds[0])
    else if (excludedIds.length > 1)
      query = query.not('id', 'in', `(${excludedIds.join(',')})`)

    const { data: usersData, error: usersError, count } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const transformedUsers = (usersData || []).map((profile: any) => {
      const username = resolveUsername(profile)
      const fullName = resolveFullName({ ...profile, username })
      const metadata = asRecord(profile.metadata)

      if (fullName === 'Anonymous User' && !profile.username && !metadata?.username)
        return null

      return {
        id: profile.id,
        username,
        full_name: fullName,
        avatar_url: resolveAvatarUrl(profile),
        bio: profile.bio || metadata?.bio || '',
        location: profile.location || metadata?.location || '',
        is_verified: profile.is_verified || false,
        followers_count: profile.followers_count || 0,
        following_count: profile.following_count || 0,
        created_at: profile.created_at,
        account_type: profile.account_type || null,
      }
    }).filter(Boolean)

    const totalAvailable = typeof count === 'number' ? count : transformedUsers.length

    return NextResponse.json({
      users: transformedUsers,
      count: transformedUsers.length,
      has_more: offset + transformedUsers.length < totalAvailable,
      total_available: totalAvailable,
      limit,
      offset,
      sort: 'created_at_desc',
    })
  } catch (error) {
    console.error('All users API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
