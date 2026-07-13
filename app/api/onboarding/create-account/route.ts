import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { generateUniqueSlug } from '@/lib/accounts/generate-unique-slug'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, account_type } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, account_type: account_type || 'artist' },
    })

    if (authError) {
      console.error('[Onboarding] Create user error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: full_name || '',
        account_type: account_type || 'artist',
        email,
        onboarding_completed: false,
      })

    if (profileError) {
      console.error('[Onboarding] Profile creation error:', profileError)
    }

    const resolvedAccountType = account_type || 'artist'
    if (resolvedAccountType === 'artist') {
      const { data: existingArtist } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (!existingArtist) {
        const artistName = (full_name || email.split('@')[0] || 'Artist').trim()
        const urlSlug = await generateUniqueSlug({
          client: supabase,
          table: 'artist_profiles',
          base: artistName,
          fallbackPrefix: `artist-${userId.slice(0, 8)}`,
        })

        const { error: artistError } = await supabase
          .from('artist_profiles')
          .insert({
            user_id: userId,
            artist_name: artistName,
            url_slug: urlSlug,
            bio: null,
            genres: [],
            social_links: {},
            verification_status: 'unverified',
            account_tier: 'pro',
            settings: {
              allow_bookings: true,
              public_profile: true,
              show_contact_info: false,
              auto_accept_follows: true,
            },
          })

        if (artistError) {
          console.error('[Onboarding] Artist profile creation error:', artistError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email },
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Onboarding] Create account exception:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}
