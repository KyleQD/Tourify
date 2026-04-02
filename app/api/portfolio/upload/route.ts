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
    const kind = (formData.get('kind') as string | null) || 'image' // 'image' | 'video' | 'audio' | 'file'
    const tos = formData.get('tos') as string | null

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    if (tos !== 'accepted') return NextResponse.json({ error: 'You must accept the terms to upload' }, { status: 400 })

    // Determine account tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_tier')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.account_tier as string) || 'free'

    // Enforce size limits for free tier
    if (tier === 'free') {
      const sizeLimit = kind === 'video' ? 100 * MB : 8 * MB
      if (file.size > sizeLimit) {
        return NextResponse.json({ error: `File exceeds limit (${kind === 'video' ? '100MB video' : '8MB'}) for free accounts` }, { status: 400 })
      }

      // Count existing media to enforce totals: <=100 images, <=1 video
      const { data: items } = await supabase
        .from('portfolio_items')
        .select('media')
        .eq('user_id', user.id)

      let imageCount = 0
      let videoCount = 0
      for (const it of items || []) {
        const media: any[] = Array.isArray((it as any).media) ? (it as any).media : []
        for (const m of media) {
          if (m?.kind === 'image') imageCount++
          if (m?.kind === 'video') videoCount++
        }
      }

      if (kind === 'image' && imageCount >= 100) {
        return NextResponse.json({ error: 'Free accounts can upload up to 100 photos' }, { status: 400 })
      }
      if (kind === 'video' && videoCount >= 1) {
        return NextResponse.json({ error: 'Free accounts can upload one high-quality video' }, { status: 400 })
      }
    }

    // Storage bucket must be provisioned through setup/migrations, not user uploads
    console.log('Checking for portfolio storage bucket...')
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

    console.log('Uploading file:', { path, size: file.size, type: file.type })

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
    console.log('Upload successful, public URL:', publicUrl)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Portfolio upload error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred during upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


