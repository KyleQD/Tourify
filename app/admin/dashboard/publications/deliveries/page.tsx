"use client"

import { Suspense } from "react"
import Link from "next/link"
import { Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "../../components/admin-page-header"
import { AdminPageSkeleton } from "../../components/admin-page-skeleton"
import { PublicationDeliveryDashboard } from "@/components/admin/publication/publication-delivery-dashboard"

export default function PublicationDeliveriesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Publication deliveries"
        subtitle="Queued, delivered, opened, acknowledged, and failed by channel and recipient"
        icon={Radio}
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-600 text-slate-200">
            <Link href="/admin/dashboard/communications">Communications</Link>
          </Button>
        }
      />
      <Suspense fallback={<AdminPageSkeleton />}>
        <PublicationDeliveryDashboard />
      </Suspense>
    </div>
  )
}
