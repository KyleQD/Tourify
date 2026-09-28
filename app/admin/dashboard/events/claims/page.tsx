import { Suspense } from "react"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import ClaimsClient from "./claims-client"

export default function EventClaimsPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading claims..." fullScreen={false} />}>
      <ClaimsClient />
    </Suspense>
  )
}
