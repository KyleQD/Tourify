import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  try {
    
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

    const body = await request.json()
    const { error, component, timestamp, userAgent } = body


    // For now, just log the error. In the future, this could store to database
    return NextResponse.json({
      success: true,
      message: 'Error reported successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Admin Error Reporting API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to report error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 