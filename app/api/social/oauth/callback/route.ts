import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const platform = (url.searchParams.get('platform') || 'instagram') as 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'twitter'
  const redirect_uri = url.origin + '/api/social/oauth/callback?platform=' + platform

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.redirect(url.origin + '/login')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return NextResponse.redirect(url.origin + '/login')

  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-oauth`
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ platform, code, redirect_uri })
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.redirect(url.origin + `/artist/content?oauth_error=${encodeURIComponent(err)}`)
  }

  return NextResponse.redirect(url.origin + '/artist/content?connected=1')
}


