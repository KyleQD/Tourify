import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Clean the URL
    const cleanedUrl = url.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '')
    
    // Check if URL is reserved
    const reservedUrls = [
      'admin', 'api', 'www', 'app', 'settings', 'profile', 'user', 'account', 
      'dashboard', 'login', 'signup', 'auth', 'help', 'support', 'about', 
      'contact', 'terms', 'privacy', 'events', 'artist', 'venue', 'search', 
      'discover', 'feed', 'messages', 'notifications', 'billing', 'security', 
      'integrations', 'onboarding', 'create', 'edit', 'delete', 'update'
    ]
    
    if (reservedUrls.includes(cleanedUrl)) {
      return NextResponse.json({ 
        available: false,
        message: 'This URL is reserved and cannot be used',
        url: cleanedUrl,
        reason: 'reserved'
      })
    }

    // Check if the handle is already taken by another user.
    // DB-008 / Wave 35: this filtered on `profiles.custom_url`, which exists in no
    // active migration and in no generated contract. PostgREST rejected the filter,
    // the error was not PGRST116, and the endpoint answered 500 "Failed to check URL
    // availability" for every handle. The canonical public handle is `username`.
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanedUrl)
      .neq('id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile handle:', checkError)
      return NextResponse.json({ error: 'Failed to check URL availability' }, { status: 500 })
    }

    const available = !existingProfile
    const message = available ? 'URL is available' : 'URL is already taken'

    return NextResponse.json({ 
      available, 
      message,
      url: cleanedUrl,
      reason: available ? 'available' : 'taken'
    })

  } catch (error) {
    console.error('URL check API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 