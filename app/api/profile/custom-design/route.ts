import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  buildCustomProfileDesignPayload,
  buildFixPrompt,
  DEFAULT_CUSTOM_PROFILE_DESIGN,
  getCustomProfileDesignState,
  parseCustomProfileLayout,
  type CustomProfileDesignState,
  type CustomProfileLayout,
} from '@/lib/profile/custom-profile-layout'
import { buildCustomProfileAiPromptFromProfile } from '@/lib/profile/custom-profile-prompt'

const postBodySchema = z.object({
  action: z.enum(['validate', 'save_draft', 'publish', 'revert']),
  layout: z.unknown().optional(),
})

async function loadRelatedRows(
  query: PromiseLike<{ data: any[] | null; error: any }>
): Promise<any[]> {
  try {
    const { data, error } = await query
    if (error) {
      console.warn('[custom-design] related query failed:', error.message || error)
      return []
    }
    return data || []
  } catch (error) {
    console.warn('[custom-design] related query threw:', error)
    return []
  }
}

async function loadProfileBundle(supabase: any, userId: string) {
  const profileRes = await supabase.from('profiles').select('*').eq('id', userId).single()

  const [portfolio, experiences, certifications] = await Promise.all([
    loadRelatedRows(
      supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ),
    loadRelatedRows(
      supabase
        .from('profile_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ),
    loadRelatedRows(
      supabase
        .from('profile_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ),
  ])

  return {
    profile: profileRes.data,
    profileError: profileRes.error,
    portfolio,
    experiences,
    certifications,
  }
}

function getSiteOrigin(request: NextRequest): string {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (envOrigin) return envOrigin.replace(/\/$/, '')
  try {
    return request.nextUrl.origin
  } catch {
    return 'https://tourify.live'
  }
}

async function persistDesign(
  supabase: any,
  userId: string,
  existingMetadata: Record<string, unknown>,
  state: CustomProfileDesignState
) {
  const updated_at = new Date().toISOString()
  const nextState: CustomProfileDesignState = {
    ...state,
    updated_at,
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      metadata: {
        ...existingMetadata,
        custom_profile_design: buildCustomProfileDesignPayload(nextState),
      },
      updated_at,
    })
    .eq('id', userId)
    .select('metadata')
    .single()

  return { data, error, state: nextState }
}

function buildProfilePreview(profile: any) {
  return {
    id: profile.id,
    username: profile.username,
    full_name: profile.full_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    cover_image: profile.cover_image || profile.metadata?.header_url || null,
    location: profile.location,
    title: profile.title,
    company: profile.company,
    skills: profile.skills || [],
    top_skills: profile.top_skills || [],
    social_links: profile.social_links || {},
    website: profile.website,
    show_email: profile.show_email === true,
    show_phone: profile.show_phone === true,
    show_location: profile.show_location !== false,
    email: profile.show_email === true ? profile.email : null,
    phone: profile.show_phone === true ? profile.phone : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = auth
    const { profile, profileError, portfolio, experiences, certifications } =
      await loadProfileBundle(supabase, user.id)

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: profileError?.message || 'Profile not found' },
        { status: 404 }
      )
    }

    const design = getCustomProfileDesignState(profile.metadata)
    const prompt = buildCustomProfileAiPromptFromProfile({
      profile,
      portfolio,
      experiences,
      certifications,
      siteOrigin: getSiteOrigin(request),
    })

    return NextResponse.json({
      success: true,
      design,
      prompt,
      profilePreview: buildProfilePreview(profile),
      portfolio,
      experiences,
      certifications,
    })
  } catch (error) {
    console.error('[custom-design GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load custom profile design' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { user, supabase } = auth

    let body: z.infer<typeof postBodySchema>
    try {
      body = postBodySchema.parse(await request.json())
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { profile, profileError, portfolio, experiences, certifications } =
      await loadProfileBundle(supabase, user.id)

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: profileError?.message || 'Profile not found' },
        { status: 404 }
      )
    }

    const existingMetadata =
      profile.metadata && typeof profile.metadata === 'object' && !Array.isArray(profile.metadata)
        ? { ...profile.metadata }
        : {}
    const currentDesign = getCustomProfileDesignState(existingMetadata)

    if (body.action === 'revert') {
      const nextState: CustomProfileDesignState = {
        ...DEFAULT_CUSTOM_PROFILE_DESIGN,
        draft: currentDesign.draft,
        status: 'none',
        published: null,
      }
      const { error, state } = await persistDesign(
        supabase,
        user.id,
        existingMetadata,
        nextState
      )
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({
        success: true,
        design: state,
        message: 'Reverted to the default public profile',
      })
    }

    const submittedRaw =
      body.layout !== undefined
        ? body.layout
        : body.action === 'publish'
          ? currentDesign.draft
          : undefined

    if (submittedRaw === undefined || submittedRaw === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            body.action === 'publish'
              ? 'No valid draft to publish — validate and save a draft first'
              : 'layout JSON is required',
        },
        { status: 400 }
      )
    }

    const submittedJson =
      typeof submittedRaw === 'string' ? submittedRaw : JSON.stringify(submittedRaw, null, 2)
    const parsed = parseCustomProfileLayout(submittedRaw)

    if (!parsed.ok) {
      return NextResponse.json({
        success: false,
        valid: false,
        errors: parsed.errors,
        fixPrompt: buildFixPrompt(parsed.errors, submittedJson),
      })
    }

    const layout: CustomProfileLayout = parsed.layout

    if (body.action === 'validate') {
      const preview = buildProfilePreview(profile)
      return NextResponse.json({
        success: true,
        valid: true,
        layout,
        profilePreview: {
          id: preview.id,
          username: preview.username,
          account_type: 'general' as const,
          profile_data: {
            ...(profile.profile_data || {}),
            name: preview.full_name,
            title: preview.title,
            company: preview.company,
            bio: preview.bio,
            skills: preview.skills,
            top_skills: preview.top_skills,
            email: preview.email,
            phone: preview.phone,
          },
          avatar_url: preview.avatar_url,
          cover_image: preview.cover_image,
          verified: Boolean(profile.is_verified),
          bio: preview.bio,
          location: preview.location,
          social_links: preview.social_links,
          stats: {
            followers: profile.followers_count || 0,
            following: profile.following_count || 0,
            posts: profile.posts_count || 0,
            likes: 0,
            views: 0,
          },
          created_at: profile.created_at,
        },
        portfolio,
        experiences,
        certifications,
      })
    }

    if (body.action === 'save_draft') {
      const nextState: CustomProfileDesignState = {
        status: currentDesign.status === 'published' ? 'published' : 'draft',
        draft: layout,
        published: currentDesign.published,
        updated_at: null,
      }
      const { error, state } = await persistDesign(
        supabase,
        user.id,
        existingMetadata,
        nextState
      )
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({
        success: true,
        valid: true,
        layout,
        design: state,
        message: 'Draft saved',
      })
    }

    const nextState: CustomProfileDesignState = {
      status: 'published',
      draft: layout,
      published: layout,
      updated_at: null,
    }
    const { error, state } = await persistDesign(
      supabase,
      user.id,
      existingMetadata,
      nextState
    )
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      valid: true,
      layout,
      design: state,
      message: 'Custom public profile published',
    })
  } catch (error) {
    console.error('[custom-design POST]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update custom profile design' },
      { status: 500 }
    )
  }
}
