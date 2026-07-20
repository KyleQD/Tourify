import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length))
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.avatar_url) {
      const oldPath = extractStoragePath(profile.avatar_url, 'avatars')
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }

    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `avatar-${timestamp}.${extension}`
    const filePath = `${user.id}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile with new avatar' },
        { status: 500 }
      )
    }

    try {
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    } catch (error) {
      console.warn('Failed to sync auth avatar metadata', error)
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error) {
    console.error('Avatar upload API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (profile?.avatar_url) {
      const oldPath = extractStoragePath(profile.avatar_url, 'avatars')
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath])
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    try {
      await supabase.auth.updateUser({ data: { avatar_url: null } })
    } catch (error) {
      console.warn('Failed to sync auth avatar metadata', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully',
    })
  } catch (error) {
    console.error('Avatar removal API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
