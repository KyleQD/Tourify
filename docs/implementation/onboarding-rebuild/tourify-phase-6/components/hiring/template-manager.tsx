"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringTemplateListItem } from "@/types/hiring-dashboard"
import { formatDashboardDate, getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Onboarding templates</CardTitle>
          <CardDescription>Entity-scoped forms used after an applicant is approved.</CardDescription>
        </div>
        <Button asChild>
          <a href={`/admin/dashboard/onboarding/templates/new?${queryString}`}>New template</a>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading templates…</p> : null}
        {!isLoading && templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom templates exist for this account yet. The resolver can still use global safe defaults.
          </p>
        ) : null}
        {templates.length > 0 ? (
          <div className="divide-y rounded-lg border">
            {templates.map((template) => (
              <div key={template.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{template.name}</h3>
                    {template.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[template.department, template.position].filter(Boolean).join(" • ") || "General template"}
                  </p>
                  <p className="text-xs text-muted-foreground">Updated {formatDashboardDate(template.updatedAt)}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/dashboard/onboarding/templates/${template.id}?${queryString}`}>Edit</a>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
