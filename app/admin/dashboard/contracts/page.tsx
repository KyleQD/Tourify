"use client"

import { FileText } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminEmptyState } from "../components/admin-empty-state"

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Contracts"
        subtitle="Artist and vendor contract management"
        icon={FileText}
      />
      <AdminEmptyState
        icon={FileText}
        title="Contract management coming soon"
        description="Digital contract creation, e-signing, and tracking will be built here in a future phase."
      />
    </div>
  )
}
