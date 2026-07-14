"use client"

import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringTemplateListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface TemplateManagerProps {
  employer: HiringEntity
}

export function TemplateManager({ employer }: TemplateManagerProps) {
  const queryString = getEmployerQueryString(employer)
  const { data: templates, isLoading, error } = useHiringDashboardFetch<HiringTemplateListItem[]>({
    url: `/api/admin/onboarding/templates?${queryString}`,
    initialData: [],
  })

  return (
    <WorkforcePanel>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-white">Onboarding templates</CardTitle>
          <CardDescription>Entity-scoped forms used after an applicant is approved.</CardDescription>
        </div>
        <Button className="rounded-xl" asChild>
          <a href={`/admin/dashboard/onboarding?${queryString}`}>Manage templates</a>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading templates…</p> : null}
        {!isLoading && templates.length === 0 ? (
          <WorkforceEmptyState
            icon={FileText}
            title="No custom templates"
            description="Global safe defaults are available. Add custom templates when this account needs a specialized onboarding flow."
          />
        ) : null}
        {templates.length > 0 ? (
          <div className="overflow-hidden rounded-[1.15rem] border border-slate-700/60">
            {templates.map((template) => (
              <div key={template.id} className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-900/35 p-4 last:border-0 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{template.name}</h3>
                    {template.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[template.department, template.position].filter(Boolean).join(" • ") || "General template"}
                  </p>
                  <p className="text-xs text-muted-foreground">Updated {formatDashboardDate(template.updatedAt)}</p>
                </div>
                <Button className="rounded-xl" variant="outline" size="sm" asChild>
                  <a href={`/admin/dashboard/onboarding?template=${template.id}&${queryString}`}>Edit</a>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </WorkforcePanel>
  )
}
