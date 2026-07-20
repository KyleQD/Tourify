export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const AVATAR_BUCKET = 'avatars'
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 4 * 1024 * 1024

async function resolveBucket(supabase: any): Promise<string | null> {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some((bucket: any) => bucket.name === AVATAR_BUCKET)) return AVATAR_BUCKET
  if (buckets?.some((bucket: any) => bucket.name === 'profile-images')) return 'profile-images'
  return null
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
    return { ok: true as const }
  }

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
  }

  return { ok: true as const }
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

    const bucket = await resolveBucket(supabase)
    if (!bucket) {
      return NextResponse.json(
        { success: false, error: 'Storage is not configured. Contact support.' },
        { status: 503 }
      )
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${type}-${Date.now()}.${fileExt}`
    // RLS for avatars expects first folder = auth.uid()
    const filePath = `${user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
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
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

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
