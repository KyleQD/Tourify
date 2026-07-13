import { Suspense } from 'react'
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'
import EventsPageClient from './events-page-client'

export default function EventsPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading events..." fullScreen={false} />}>
      <EventsPageClient />
    </Suspense>
  )
}
