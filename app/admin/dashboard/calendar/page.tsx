"use client"

import { Calendar } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminEmptyState } from "../components/admin-empty-state"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        subtitle="Events and tours calendar view with sync"
        icon={Calendar}
        actions={
          <>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
              <Link href="/admin/dashboard/events">Events</Link>
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
              <Link href="/admin/dashboard/tours">Tours</Link>
            </Button>
          </>
        }
      />
      <AdminEmptyState
        icon={Calendar}
        title="Calendar sync coming in Phase 3"
        description="iCal/Google/Outlook subscription feeds for all your tours and events will be available here. You will be able to subscribe from any calendar app and share public event feeds."
        action={{ label: "View Events List", href: "/admin/dashboard/events" }}
      />
    </div>
  )
}
