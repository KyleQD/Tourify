"use client"

import { Suspense } from "react"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
            <Link href="/admin/dashboard/network">Network</Link>
          </Button>
        }
      />
      <Suspense fallback={<AdminPageSkeleton />}>
        <AdminUnifiedInbox />
      </Suspense>
    </div>
  )
}
