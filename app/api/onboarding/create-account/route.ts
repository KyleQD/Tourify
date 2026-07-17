import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestPublicOrigin } from '@/lib/auth/request-public-origin'

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const formData =
      body?.form_data && typeof body.form_data === 'object' ? body.form_data : {}

    const email = readString(body.email, formData.email)
    const password = readString(body.password, formData.password)
    const fullName = readString(
      body.full_name,
      body.fullName,
      formData.full_name,
      formData.fullName,
      formData.name,
    )
    const accountType = readString(body.account_type, body.accountType, formData.account_type, formData.accountType) || 'artist'
    const invitationToken = readString(body.invitation_token, body.invitationToken)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Authentication service is not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const publicOrigin = getRequestPublicOrigin(request)
    const emailRedirectTo = `${publicOrigin}/auth/callback?type=signup&redirectTo=%2Flogin`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName || undefined,
          account_type: accountType,
          invitation_token: invitationToken || undefined,
          onboarding_source: invitationToken ? 'invitation' : 'onboarding',
        },
      },
    })

    if (authError) {
      console.error('[Onboarding] Signup error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      needsEmailConfirmation: !authData.session,
      user: { id: userId, email },
      message: authData.session
        ? 'Account created successfully.'
        : 'Account created. Check your email to confirm your account before signing in.',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Onboarding] Create account exception:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}
