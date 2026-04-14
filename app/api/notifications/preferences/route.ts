import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  enableLikes: z.boolean().optional(),
  enableComments: z.boolean().optional(),
  enableShares: z.boolean().optional(),
  enableFollows: z.boolean().optional(),
  enableMessages: z.boolean().optional(),
  enableEvents: z.boolean().optional(),
  enableSystem: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  digestFrequency: z.enum(['never', 'hourly', 'daily', 'weekly']).optional(),
  preferences: z.record(z.any()).optional()
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthenticatedUser(request: NextRequest) {
  // Try Bearer token first (mobile / API key clients)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) return user
  }

  // Fall back to SSR session cookie (web clients)
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (user) return user
  } catch {
    // ignore
  }

  return null
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/notifications/preferences - Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await OptimizedNotificationService.getPreferences(user.id)

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPreferences = await OptimizedNotificationService.updatePreferences(user.id, {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        enableLikes: true,
        enableComments: true,
        enableShares: true,
        enableFollows: true,
        enableMessages: true,
        enableEvents: true,
        enableSystem: true,
        quietHoursEnabled: false,
        digestFrequency: 'daily'
      })

      return NextResponse.json({
        preferences: defaultPreferences,
        isDefault: true
      })
    }

    return NextResponse.json({
      preferences,
      isDefault: false
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications/preferences - Update user's notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = notificationPreferencesSchema.parse(body)

    // Validate time format if provided
    if (validatedData.quietHoursStart && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(validatedData.quietHoursStart)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours start time format. Use HH:MM' },
        { status: 400 }
      )
    }

    if (validatedData.quietHoursEnd && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(validatedData.quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Invalid quiet hours end time format. Use HH:MM' },
        { status: 400 }
      )
    }

    const updatedPreferences = await OptimizedNotificationService.updatePreferences(
      user.id,
      validatedData
    )

    return NextResponse.json({
      preferences: updatedPreferences,
      message: 'Notification preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/preferences - Reset to default preferences
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'reset') {
      const defaultPreferences = await OptimizedNotificationService.updatePreferences(user.id, {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        enableLikes: true,
        enableComments: true,
        enableShares: true,
        enableFollows: true,
        enableMessages: true,
        enableEvents: true,
        enableSystem: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00:00',
        quietHoursEnd: '08:00:00',
        digestFrequency: 'daily',
        preferences: {}
      })

      return NextResponse.json({
        preferences: defaultPreferences,
        message: 'Notification preferences reset to defaults'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "reset"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error resetting notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    )
  }
}