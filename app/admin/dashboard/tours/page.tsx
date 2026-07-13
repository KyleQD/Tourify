import { Suspense } from 'react'
import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'
import ToursPageClient from './tours-page-client'

export default function ToursPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading tours..." fullScreen={false} />}>
      <ToursPageClient />
    </Suspense>
  )
}