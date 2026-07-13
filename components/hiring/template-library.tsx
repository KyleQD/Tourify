"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, FileText, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatDashboardDate, getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringTemplateListItem } from "@/types/hiring-dashboard"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface TemplateLibraryProps {
  employer: HiringEntity
}

function getPayloadError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const error = (payload as { error?: unknown }).error
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message
  return null
}

export function TemplateLibrary({ employer }: TemplateLibraryProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryString = getEmployerQueryString(employer)

  const [templates, setTemplates] = useState<HiringTemplateListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/onboarding/templates?${queryString}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(getPayloadError(payload) ?? "Unable to load templates")
      setTemplates((payload.data ?? []) as HiringTemplateListItem[])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load templates")
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  async function cloneTemplate(templateId: string) {
    setBusyId(templateId)
    try {
      const response = await fetch(`/api/admin/onboarding/templates/clone?${queryString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ entity_type: employer.entityType, entity_id: employer.entityId, template_id: templateId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(getPayloadError(payload) ?? "Unable to clone template")

      toast({ title: "Template cloned", description: "Opening your editable copy." })
      const newId = (payload.data as HiringTemplateListItem | undefined)?.id
      if (newId) router.push(`/admin/dashboard/hiring/templates/${newId}?${queryString}`)
      else await fetchTemplates()
    } catch (cloneError) {
      toast({
        title: "Clone failed",
        description: cloneError instanceof Error ? cloneError.message : "Unable to clone template",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTemplate(templateId: string) {
    setBusyId(templateId)
    try {
      const response = await fetch(`/api/admin/onboarding/templates/${templateId}?${queryString}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(getPayloadError(payload) ?? "Unable to delete template")

      toast({ title: "Template deleted" })
      await fetchTemplates()
    } catch (deleteError) {
      toast({
        title: "Delete failed",
        description: deleteError instanceof Error ? deleteError.message : "Unable to delete template",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const employerTemplates = templates.filter((template) => template.scope === "employer")
  const globalTemplates = templates.filter((template) => template.scope !== "employer")

  return (
    <WorkforcePanel>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-white">Onboarding templates</CardTitle>
          <CardDescription>Forms and agreements sent to a worker once they are approved.</CardDescription>
        </div>
        <Button className="rounded-xl" asChild>
          <a href={`/admin/dashboard/hiring/templates/new?${queryString}`}>
            <Plus className="mr-2 h-4 w-4" /> Create template
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
          </div>
        ) : null}

        {!isLoading ? (
          <>
            <TemplateSection
              title="Your templates"
              description="Custom templates for this account. Edit or delete as needed."
              templates={employerTemplates}
              queryString={queryString}
              busyId={busyId}
              emptyLabel="No custom templates yet. Clone a starter below or create one from scratch."
              onClone={cloneTemplate}
              onDelete={deleteTemplate}
            />
            <TemplateSection
              title="Starter templates"
              description="Curated base templates. Clone one to customize its fields and agreements."
              templates={globalTemplates}
              queryString={queryString}
              busyId={busyId}
              emptyLabel="No starter templates available."
              onClone={cloneTemplate}
              isGlobal
            />
          </>
        ) : null}
      </CardContent>
    </WorkforcePanel>
  )
}

interface TemplateSectionProps {
  title: string
  description: string
  templates: HiringTemplateListItem[]
  queryString: string
  busyId: string | null
  emptyLabel: string
  isGlobal?: boolean
  onClone: (templateId: string) => void
  onDelete?: (templateId: string) => void
}

function TemplateSection({ title, description, templates, queryString, busyId, emptyLabel, isGlobal, onClone, onDelete }: TemplateSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {templates.length === 0 ? (
        <WorkforceEmptyState icon={FileText} title="Nothing here yet" description={emptyLabel} />
      ) : (
        <div className="overflow-hidden rounded-[1.15rem] border border-slate-700/60">
          {templates.map((template) => (
            <div key={template.id} className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-900/35 p-4 last:border-0 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-white">{template.name}</h4>
                  {template.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  {isGlobal ? <Badge variant="outline">Starter</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[template.department, template.position].filter(Boolean).join(" • ") || "General template"}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{template.fieldCount ?? 0} fields</span>
                  {template.agreementCount ? (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> {template.agreementCount} agreements
                    </span>
                  ) : null}
                  <span>Updated {formatDashboardDate(template.updatedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="rounded-xl" variant="outline" size="sm" disabled={busyId === template.id} onClick={() => onClone(template.id)}>
                  {busyId === template.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Copy className="mr-1 h-3 w-3" />}
                  Clone
                </Button>
                {!isGlobal ? (
                  <>
                    <Button className="rounded-xl" variant="outline" size="sm" asChild>
                      <a href={`/admin/dashboard/hiring/templates/${template.id}?${queryString}`}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </a>
                    </Button>
                    {onDelete ? (
                      <Button className="rounded-xl text-rose-300" variant="ghost" size="sm" disabled={busyId === template.id} onClick={() => onDelete(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button className="rounded-xl" variant="ghost" size="sm" asChild>
                    <a href={`/admin/dashboard/hiring/templates/${template.id}?${queryString}`}>Preview</a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
