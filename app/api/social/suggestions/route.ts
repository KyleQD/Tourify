import { NextRequest, NextResponse } from 'next/server'
import { friendSuggestionService } from '@/lib/services/friend-suggestions'
import { authenticateApiRequest } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest()
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const params = {
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 50),
      offset: parseInt(searchParams.get('offset') || '0'),
      exclude_user_ids: searchParams.get('exclude_user_ids')?.split(',').filter(Boolean) || [],
      include_mutual_friends: searchParams.get('include_mutual_friends') !== 'false',
      algorithm: (searchParams.get('algorithm') as 'popular' | 'mutual' | 'recent' | 'location') || 'popular',
      location: searchParams.get('location') || undefined,
      min_followers: parseInt(searchParams.get('min_followers') || '0'),
      max_followers: parseInt(searchParams.get('max_followers') || '1000000')
    }

    console.log('🔍 Getting friend suggestions for:', user.id, 'with params:', params)

    const result = await friendSuggestionService.getSuggestions(user.id, params)

    console.log('✅ Returning', result.suggestions.length, 'suggestions using', result.algorithm_used, 'algorithm')

    return NextResponse.json(result)

  } catch (error) {
    console.error('💥 Friend suggestions API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
