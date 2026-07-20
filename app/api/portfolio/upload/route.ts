export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const MB = 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const portfolioType = formData.get('portfolioType') as string | null
    const rawKind = (formData.get('kind') as string | null) || portfolioType
    const kind =
      rawKind === 'photo' ? 'image'
        : rawKind === 'music' ? 'audio'
          : rawKind || 'image' // 'image' | 'video' | 'audio' | 'file'
    const tos = formData.get('tos') as string | null

    if (!file) return NextResponse.json({ error: 'Missing file', code: 'missing_file' }, { status: 400 })
    if (tos !== 'accepted') {
      return NextResponse.json(
        { error: 'You must accept the terms to upload', code: 'tos_required' },
        { status: 400 }
      )
    }

    // All accounts are treated as pro during beta — no upload limits enforced

    // Storage bucket must be provisioned through setup/migrations, not user uploads
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return NextResponse.json({ error: 'Failed to access storage' }, { status: 500 })
    }

    const bucket = buckets?.find((b: any) => b.name === 'portfolio')
    
    if (!bucket) {
      return NextResponse.json({
        error: 'Portfolio storage is not configured. Please contact support.'
      }, { status: 503 })
    }

    // Upload file
    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${kind}_${user.id}_${Date.now()}.${ext}`
    const path = `${user.id}/${fileName}`
    const buffer = Buffer.from(await file.arrayBuffer())


    const { error: uploadError } = await supabase.storage
      .from('portfolio')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      })
      
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}`,
        details: uploadError.message 
      }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Portfolio upload error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred during upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


