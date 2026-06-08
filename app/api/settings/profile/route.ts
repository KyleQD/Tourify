import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult


    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        account_type,
        profile_data,
        avatar_url,
        cover_image,
        verified,
        bio,
        location,
        social_links,
        created_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }


    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[Settings Profile API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const body = await request.json()


    const inPersonConnectSettings = {
      ...(body.profile_data?.in_person_connect || {}),
      allowInPersonConnect: body.allow_in_person_connect ?? body.profile_data?.in_person_connect?.allowInPersonConnect ?? true,
      shareEmailOnConnect: body.share_email_on_connect ?? body.profile_data?.in_person_connect?.shareEmailOnConnect ?? false,
      sharePhoneOnConnect: body.share_phone_on_connect ?? body.profile_data?.in_person_connect?.sharePhoneOnConnect ?? false,
    }

    // Update the user's profile
    const updatePayload: any = {
      username: body.username,
      bio: body.bio,
      location: body.location,
      full_name: body.full_name,
      title: body.title,
      company: body.company,
      experience_level: body.experience_level,
      availability_status: body.availability_status,
      hourly_rate: body.hourly_rate,
      skills: body.skills,
      preferred_project_types: body.preferred_project_types,
      show_email: body.show_email,
      show_phone: body.show_phone,
      show_location: body.show_location,
      show_hourly_rate: body.show_hourly_rate,
      show_availability: body.show_availability,
      allow_project_offers: body.allow_project_offers,
      public_profile: body.public_profile,
      instagram: body.instagram,
      twitter: body.twitter,
      profile_data: {
        ...(body.profile_data || {}),
        name: body.full_name,
        phone: body.phone,
        website: body.website,
        in_person_connect: inPersonConnectSettings,
      },
      social_links: {
        ...(body.social_links || {}),
        instagram: body.instagram,
        twitter: body.twitter,
        website: body.website,
        linkedin: body.linkedin,
        github: body.github,
        behance: body.behance,
        dribbble: body.dribbble
      },
      updated_at: new Date().toISOString()
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single()

    if (profileError) {
      console.error('[Settings Profile API] Error updating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }


    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[Settings Profile API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 