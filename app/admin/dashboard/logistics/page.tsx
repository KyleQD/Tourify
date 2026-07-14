import { Suspense } from 'react'
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'
import LogisticsPageClient from './logistics-page-client'

export default function LogisticsPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading logistics..." fullScreen={false} />}>
      <LogisticsPageClient />
    </Suspense>
  )
}
