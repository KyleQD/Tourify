export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateApiRequest(request)
    if (!authResult || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { user, supabase } = authResult

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'avatar' or 'header'

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

    console.log('Uploading profile image:', { type, fileName: file.name, size: file.size })

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!acceptedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (4MB)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 4MB' },
        { status: 400 }
      )
    }

    // Storage bucket must be provisioned through setup/migrations, not user uploads
    const { data: buckets } = await supabase.storage.listBuckets()
    const profileImagesBucket = buckets?.find((b: any) => b.name === 'profile-images')
    
    if (!profileImagesBucket) {
      return NextResponse.json(
        { success: false, error: 'Storage is not configured. Contact support.' },
        { status: 503 }
      )
    }

    // Generate file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${type}_${user.id}_${Date.now()}.${fileExt}`
    const filePath = `${type}s/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload file using server-side Supabase client
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath)

    console.log('Upload successful:', publicUrl)

    // First, try updating the specific column
    const updateData = type === 'avatar' 
      ? { avatar_url: publicUrl }
      : { cover_image: publicUrl }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      
      // If cover_image column doesn't exist (older env), try using metadata approach
      if (type === 'header') {
        console.log('Trying metadata approach for header_url...')
        
        // Get existing profile data
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single()

        const existingMetadata = existingProfile?.metadata || {}
        
        // Update metadata with header URL and attempt a secondary write to cover_image if it exists now
        const { error: metadataError } = await supabase
          .from('profiles')
          .update({
            metadata: {
              ...existingMetadata,
              header_url: publicUrl
            }
          })
          .eq('id', user.id)

        if (metadataError) {
          console.error('Metadata update error:', metadataError)
          return NextResponse.json(
            { success: false, error: 'Upload successful but failed to update profile metadata' },
            { status: 500 }
          )
        } else {
          console.log('Profile updated successfully using metadata approach')
          console.log('Header URL saved to metadata:', publicUrl)
          // Best-effort: try to set cover_image in case migration ran after first attempt
          await supabase
            .from('profiles')
            .update({ cover_image: publicUrl })
            .eq('id', user.id)
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Upload successful but failed to update profile' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 