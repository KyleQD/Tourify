import { Suspense } from "react"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import DuplicatesClient from "./duplicates-client"

export default function EventDuplicatesPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading duplicates..." fullScreen={false} />}>
      <DuplicatesClient />
    </Suspense>
  )
}
