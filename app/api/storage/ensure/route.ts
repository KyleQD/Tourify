import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient()
    // Check if buckets exist by trying to list them
    const { data: musicBucket } = await supabase.storage.getBucket('artist-music')
    const { data: photosBucket } = await supabase.storage.getBucket('artist-photos')

    const status = {
      musicBucket: !!musicBucket,
      photosBucket: !!photosBucket,
      ready: !!musicBucket && !!photosBucket
    }

    return NextResponse.json({ 
      ok: true, 
      status,
      message: status.ready ? 'Storage buckets are ready' : 'Some buckets may be missing - check Supabase dashboard'
    })
  } catch (error) {
    console.error('Storage ensure error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to check storage buckets',
      message: 'Buckets should be created via SQL migration'
    })
  }
}


