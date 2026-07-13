"use client"

import { Suspense } from "react"
import { MessageSquare } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminUnifiedInbox } from "../components/admin-unified-inbox"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"

export default function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Communications"
        subtitle="Unified inbox for group threads and direct messages"
        icon={MessageSquare}
      />
      <Suspense fallback={<AdminPageSkeleton />}>
        <AdminUnifiedInbox />
      </Suspense>
    </div>
  )
}
