"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkforceHero, WorkforcePageShell } from "@/components/hiring/workforce-ui"

export function OpsWorkspaceChrome({
  eventId,
  title,
  description,
  badge,
  actions,
  children,
  backHref,
  backLabel = "Back to event hub",
}: {
  eventId?: string
  title: string
  description: string
  badge?: string
  actions?: React.ReactNode
  children: React.ReactNode
  backHref?: string
  backLabel?: string
}) {
  const href = backHref || (eventId ? `/admin/dashboard/events/${eventId}` : "/admin/dashboard/events")

  return (
    <WorkforcePageShell>
      <div className="mb-2">
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
          <Link href={href}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
      <WorkforceHero
        eyebrow="Event workspace"
        title={title}
        description={description}
        badge={badge}
        actions={actions}
      />
      <div className="space-y-6">{children}</div>
    </WorkforcePageShell>
  )
}
