export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const AVATAR_BUCKET = 'avatars'
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 4 * 1024 * 1024

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length))
}

async function syncAvatarAuthMetadata(supabase: any, avatarUrl: string | null) {
  try {
    await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    })
  } catch (error) {
    console.warn('[upload-profile-image] Failed to sync auth avatar metadata', error)
  }
}

async function removeStoredImage(supabase: any, publicUrl: string | null | undefined) {
  if (!publicUrl) return
  const oldPath = extractStoragePath(publicUrl, AVATAR_BUCKET)
  if (!oldPath) return
  await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
}

async function persistProfileImage(params: {
  supabase: any
  userId: string
  type: 'avatar' | 'header'
  publicUrl: string | null
}) {
  const { supabase, userId, type, publicUrl } = params

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('metadata, avatar_url, cover_image')
    .eq('id', userId)
    .single()

  const existingMetadata =
    existingProfile?.metadata && typeof existingProfile.metadata === 'object'
      ? existingProfile.metadata
      : {}

  if (type === 'avatar') {
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) return { ok: false as const, error }
    await syncAvatarAuthMetadata(supabase, publicUrl)
    return { ok: true as const, previousUrl: existingProfile?.avatar_url as string | null }
  }

  const previousUrl =
    (existingProfile?.cover_image as string | null) ||
    (existingMetadata?.header_url as string | null) ||
    null

  const { error } = await supabase
    .from('profiles')
    .update({
      cover_image: publicUrl,
      metadata: {
        ...existingMetadata,
        header_url: publicUrl,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[upload-profile-image] cover_image update failed, trying metadata fallback', error)
    // Older envs may lack cover_image — fall back to metadata only
    const { error: metadataError } = await supabase
      .from('profiles')
      .update({
        metadata: {
          ...existingMetadata,
          header_url: publicUrl,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (metadataError) return { ok: false as const, error: metadataError }
    // Metadata-only persist still succeeds for clients that resolve header_url,
    // but surface a warning so callers know cover_image was not written.
    console.warn(
      '[upload-profile-image] Persisted header to metadata.header_url only (cover_image unavailable)'
    )
  }

  return { ok: true as const, previousUrl }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing file or type' },
        { status: 400 }
      )
    }

    if (!['avatar', 'header'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid upload type' },
        { status: 400 }
      )
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 4MB' },
        { status: 400 }
      )
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${type}-${Date.now()}.${fileExt}`
    // RLS for avatars expects first folder = auth.uid()
    const filePath = `${user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

    const persisted = await persistProfileImage({
      supabase,
      userId: user.id,
      type: type as 'avatar' | 'header',
      publicUrl,
    })

    if (!persisted.ok) {
      console.error('Profile update error:', persisted.error)
      return NextResponse.json(
        { success: false, error: 'Upload successful but failed to update profile' },
        { status: 500 }
      )
    }

    await removeStoredImage(supabase, persisted.previousUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type,
      message: 'Image uploaded successfully',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult
    const type = request.nextUrl.searchParams.get('type')

    if (!type || !['avatar', 'header'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use avatar or header.' },
        { status: 400 }
      )
    }

    const persisted = await persistProfileImage({
      supabase,
      userId: user.id,
      type: type as 'avatar' | 'header',
      publicUrl: null,
    })

    if (!persisted.ok) {
      console.error('Profile clear error:', persisted.error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove image from profile' },
        { status: 500 }
      )
    }

    await removeStoredImage(supabase, persisted.previousUrl)

    return NextResponse.json({
      success: true,
      url: null,
      type,
      message: 'Image removed successfully',
    })
  } catch (error) {
    console.error('Remove image error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
