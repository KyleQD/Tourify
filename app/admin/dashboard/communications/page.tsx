"use client"

import { MessageSquare } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminUnifiedInbox } from "../components/admin-unified-inbox"

export default function CommunicationsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Communications"
        subtitle="Unified inbox for group threads and direct messages"
        icon={MessageSquare}
      />
      <AdminUnifiedInbox />
    </div>
  )
}
