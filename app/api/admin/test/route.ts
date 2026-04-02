import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    console.log('[Admin Test API] GET request started')
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Check admin permissions
    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin API is working',
      user: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Admin Test API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to access admin API',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 