export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_FILE_SIZE = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth || !auth.user)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { user, supabase } = auth
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const certificationName = String(formData.get('certification_name') || 'credential')

    if (!file)
      return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 })
    if (!ACCEPTED_FILE_TYPES.includes(file.type))
      return NextResponse.json(
        { success: false, error: 'Only PDF, JPG, PNG, and WEBP files are allowed' },
        { status: 400 }
      )
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ success: false, error: 'File must be under 8MB' }, { status: 400 })

    const { data: buckets } = await supabase.storage.listBuckets()
    const profileImagesBucket = buckets?.find((bucket: any) => bucket.name === 'profile-images')
    if (!profileImagesBucket)
      return NextResponse.json(
        { success: false, error: 'Storage is not configured. Contact support.' },
        { status: 503 }
      )

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const safeCertKey = certificationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filePath = `staff-credentials/${user.id}/${safeCertKey || 'credential'}-${Date.now()}.${fileExtension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )

    const { data: signedUrlData } = await supabase.storage
      .from('profile-images')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7)
    const storageUri = `storage://profile-images/${filePath}`

    const { error: registryErr } = await supabase.from('staff_documents').insert({
      owner_user_id: user.id,
      document_type: `certification:${safeCertKey || 'credential'}`,
      storage_bucket: 'profile-images',
      storage_path: filePath,
      verified_status: 'pending',
      metadata: { source: 'settings_certifications_upload' },
    })
    if (registryErr)
      console.warn('[certifications upload] staff_documents registry skipped:', registryErr.message)

    return NextResponse.json({
      success: true,
      storage_uri: storageUri,
      signed_url: signedUrlData?.signedUrl || null,
      message: 'Credential uploaded to wallet',
    })
  } catch (error) {
    console.error('💥 [Credential Upload API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
