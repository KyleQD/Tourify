import { Suspense } from "react"
import { GroupsPageClient } from "./groups-page-client"
import { GroupsSkeleton } from "./groups-skeleton"

export default function GroupsPage() {
  return (
    <Suspense fallback={<GroupsSkeleton />}>
      <GroupsPageClient />
    </Suspense>
  )
}
