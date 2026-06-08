import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Use the new authentication method that matches middleware
    const auth = await authenticateApiRequest()
    
    if (!auth) {
      console.error('❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPEG, PNG, and GIF images are allowed.'
      }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 })
    }

    // Get current profile to check for existing avatar
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    // Remove existing avatar if it exists
    if (profile?.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([oldPath])
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${user.id}_${timestamp}.${extension}`

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Error uploading avatar:', uploadError)
      return NextResponse.json({
        error: 'Failed to upload avatar'
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      return NextResponse.json({
        error: 'Failed to update profile with new avatar'
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      url: publicUrl
    })

  } catch (error) {
    console.error('💥 Avatar upload API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Use the new authentication method that matches middleware
    const auth = await authenticateApiRequest()
    
    if (!auth) {
      console.error('❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth

    // Get current profile to check for existing avatar
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    // Remove avatar from storage if it exists
    if (profile?.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop()
      if (oldPath) {
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([oldPath])

        if (removeError) {
          console.error('❌ Error removing avatar from storage:', removeError)
          // Continue anyway as we want to remove the URL from the profile
        }
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      return NextResponse.json({
        error: 'Failed to update profile'
      }, { status: 500 })
    }


    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully'
    })

  } catch (error) {
    console.error('💥 Avatar removal API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 