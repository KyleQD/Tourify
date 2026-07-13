import { Suspense } from 'react'
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'
import CalendarPageClient from './calendar-page-client'

export default function CalendarPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading calendar..." fullScreen={false} />}>
      <CalendarPageClient />
    </Suspense>
  )
}
