import { Suspense } from "react"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"
import SyncClient from "./sync-client"

export default function EventSyncPage() {
  return (
    <Suspense fallback={<BrandLoadingScreen message="Loading sync..." fullScreen={false} />}>
      <SyncClient />
    </Suspense>
  )
}
