import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request, { user, supabase }) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at, read')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({
        success: true,
        notifications: [],
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Admin Notifications API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch notifications',
      notifications: [],
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}) 