import { Suspense } from "react"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import ProvidersClient from "./providers-client"

export default function EventProvidersPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading providers..." fullScreen={false} />}>
      <ProvidersClient />
    </Suspense>
  )
}
