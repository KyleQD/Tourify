import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistPageClient } from '@/components/dashboard/artist-page-client'
import ArtistLoading from './loading'

export default async function ArtistDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  await supabase
    .from('artist_profiles')
    .select('id, artist_name, bio, genres')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <Suspense fallback={<ArtistLoading />}>
      <ArtistPageClient />
    </Suspense>
  )
}
