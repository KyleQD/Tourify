import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { z } from 'zod'

const colorSchemeSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i),
  background_gradient: z.enum(['emerald', 'blue', 'purple', 'rose', 'amber', 'cyan', 'indigo', 'custom']),
  custom_gradient_start: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  custom_gradient_end: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  use_dark_mode: z.boolean().default(false),
  enable_animations: z.boolean().default(true),
  enable_glow_effects: z.boolean().default(true),
})

const patchProfileSchema = z.object({
  color_scheme: colorSchemeSchema.optional(),
  profile_colors: colorSchemeSchema.optional(),
  full_name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const body = await request.json()
    const parsed = patchProfileSchema.parse(body)

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('metadata, full_name, username, bio, location')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    const existingMetadata = existingProfile?.metadata || {}
    const updatePayload: Record<string, unknown> = {}

    if (parsed.full_name !== undefined) updatePayload.full_name = parsed.full_name
    if (parsed.username !== undefined) updatePayload.username = parsed.username
    if (parsed.bio !== undefined) updatePayload.bio = parsed.bio
    if (parsed.location !== undefined) updatePayload.location = parsed.location

    const colorScheme = parsed.color_scheme ?? parsed.profile_colors
    if (colorScheme) {
      updatePayload.metadata = {
        ...existingMetadata,
        color_scheme: colorScheme,
        profile_colors: colorScheme,
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      color_scheme: colorScheme,
      profile_colors: colorScheme,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
