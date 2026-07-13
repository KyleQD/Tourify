import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { getAccountAuthor, getAccountAuthorPath } from '@/lib/accounts/account-author'

function normalizeUserPost(post: any) {
  const author = getAccountAuthor(post)
  const ownerProfile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  const profile = {
    id: author.id || post.user_id,
    username: author.username || ownerProfile?.username || 'user',
    full_name: author.name,
    avatar_url: author.avatarUrl || ownerProfile?.avatar_url || '',
    is_verified: author.isVerified || Boolean(ownerProfile?.is_verified),
    account_context: {
      type: author.type,
      profile_id: author.id || post.user_id,
      display_name: author.name,
      profile_path: getAccountAuthorPath(author),
    },
  }

  return {
    ...post,
    profiles: profile,
    user: profile,
    posted_as_profile_id: author.id || post.posted_as_profile_id || post.user_id,
    posted_as_type: author.type,
    account_display_name: author.name,
    account_username: author.username,
    account_avatar_url: author.avatarUrl,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase } = authResult
    const { userId } = await params
    const profileId = request.nextUrl.searchParams.get('profile_id')


    // Get the user's posts with profile data
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        type,
        visibility,
        location,
        hashtags,
        media_urls,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        updated_at,
        user_id,
        posted_as_profile_id,
        posted_as_type,
        account_display_name,
        account_username,
        account_avatar_url,
        profiles:user_id (
          id,
          username,
          avatar_url,
          full_name,
          is_verified
        )
      `)
      .eq('visibility', 'public') // Only show public posts
      .order('created_at', { ascending: false })

    query = profileId
      ? query.eq('posted_as_profile_id', profileId)
      : query.eq('user_id', userId)

    const { data: posts, error: postsError } = await query

    if (postsError) {
      console.error('[User Posts API] Error fetching posts:', postsError)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ posts: (posts || []).map(normalizeUserPost) })
  } catch (error) {
    console.error('[User Posts API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
