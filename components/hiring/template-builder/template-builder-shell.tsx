"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, Loader2, Pencil, Plus, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkforceHero, WorkforcePanel, WorkforcePageShell } from "@/components/hiring/workforce-ui"
import { useToast } from "@/hooks/use-toast"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import {
  FIELD_PALETTE,
  createFieldFromPalette,
  isAgreementField,
} from "@/lib/hiring/template-builder-utils"
import type { FieldPaletteItem } from "@/lib/hiring/template-builder-utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { OnboardingFormField, StaffOnboardingTemplate } from "@/types/onboarding-template-resolver"
import { FieldEditorCard } from "./field-editor-card"
import { TemplatePreview } from "./template-preview"

interface TemplateBuilderShellProps {
  employer: HiringEntity
  templateId?: string
}

interface TemplateMeta {
  name: string
  description: string
  department: string
  position: string
  employmentType: string
  estimatedDays: number
  isDefault: boolean
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contractor", label: "Contractor" },
  { value: "volunteer", label: "Volunteer" },
  { value: "intern", label: "Intern" },
]

const EMPTY_META: TemplateMeta = {
  name: "",
  description: "",
  department: "",
  position: "",
  employmentType: "contractor",
  estimatedDays: 2,
  isDefault: false,
}

export function TemplateBuilderShell({ employer, templateId }: TemplateBuilderShellProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryString = getEmployerQueryString(employer)

  const [meta, setMeta] = useState<TemplateMeta>(EMPTY_META)
  const [fields, setFields] = useState<OnboardingFormField[]>([])
  const [requiredDocuments, setRequiredDocuments] = useState<string>("")
  const [isLoading, setIsLoading] = useState(Boolean(templateId))
  const [isSaving, setIsSaving] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateId) return

    let cancelled = false
    async function loadTemplate() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const response = await fetch(`/api/admin/onboarding/templates/${templateId}?${queryString}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to load template")

        const template = (payload.data ?? {}) as StaffOnboardingTemplate & { scope?: "employer" | "global" }
        if (cancelled) return

        setMeta({
          name: template.name ?? "",
          description: template.description ?? "",
          department: template.department ?? "",
          position: template.position ?? "",
          employmentType: template.employment_type ?? "contractor",
          estimatedDays: Number(template.estimated_days ?? 2),
          isDefault: Boolean(template.is_default),
        })
        setFields(Array.isArray(template.fields) ? template.fields : [])
        setRequiredDocuments((template.required_documents ?? []).join(", "))
        setIsReadOnly(template.scope === "global")
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load template")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadTemplate()
    return () => {
      cancelled = true
    }
  }, [templateId, queryString])

  const agreementCount = useMemo(() => fields.filter((field) => isAgreementField(field)).length, [fields])

  function addField(item: FieldPaletteItem) {
    setFields((current) => [...current, createFieldFromPalette(item, current)])
  }

  function updateField(index: number, next: OnboardingFormField) {
    setFields((current) => current.map((field, i) => (i === index ? next : field)))
  }

  function removeField(index: number) {
    setFields((current) => current.filter((_, i) => i !== index))
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next.map((field, i) => ({ ...field, order: (i + 1) * 10 }))
    })
  }

  async function saveTemplate() {
    if (!meta.name.trim()) {
      toast({ title: "Name required", description: "Give the template a name before saving.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const body = {
        entity_type: employer.entityType,
        entity_id: employer.entityId,
        name: meta.name,
        description: meta.description,
        department: meta.department,
        position: meta.position,
        employment_type: meta.employmentType,
        estimated_days: meta.estimatedDays,
        is_default: meta.isDefault,
        required_documents: requiredDocuments
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        fields: fields.map((field, index) => ({ ...field, order: field.order ?? (index + 1) * 10 })),
      }

      const url = templateId
        ? `/api/admin/onboarding/templates/${templateId}?${queryString}`
        : `/api/admin/onboarding/templates?${queryString}`

      const response = await fetch(url, {
        method: templateId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message ?? "Unable to save template")

      toast({ title: "Template saved", description: `${meta.name} is ready to assign.` })
      router.push(`/admin/dashboard/hiring/templates?${queryString}`)
      router.refresh()
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save template",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <WorkforcePageShell>
        <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading template…
        </div>
      </WorkforcePageShell>
    )
  }

  return (
    <WorkforcePageShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className="rounded-xl" asChild>
            <a href={`/admin/dashboard/hiring/templates?${queryString}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to templates
            </a>
          </Button>
          <Button className="rounded-xl" onClick={saveTemplate} disabled={isSaving || isReadOnly}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {templateId ? "Save changes" : "Create template"}
          </Button>
        </div>

        <WorkforceHero
          title={templateId ? "Edit onboarding template" : "New onboarding template"}
          description="Build the form and agreements a worker completes after they are approved."
          badge={employer.entityType}
        />

        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {isReadOnly ? (
          <WorkforcePanel className="border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-100">
            This is a global starter template and is read-only. Use “Clone” from the library to customize it.
          </WorkforcePanel>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <WorkforcePanel className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-white">Template details</h2>
            <div className="space-y-2">
              <Label htmlFor="template-name">Name</Label>
              <Input id="template-name" value={meta.name} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, name: e.target.value })} placeholder="e.g. Front of House Staff" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea id="template-description" rows={2} value={meta.description} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, description: e.target.value })} placeholder="When to use this template" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-department">Department</Label>
                <Input id="template-department" value={meta.department} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, department: e.target.value })} placeholder="e.g. Bar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-position">Position</Label>
                <Input id="template-position" value={meta.position} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, position: e.target.value })} placeholder="e.g. Bartender" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employment type</Label>
                <Select value={meta.employmentType} disabled={isReadOnly} onValueChange={(value) => setMeta({ ...meta, employmentType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-days">Estimated days</Label>
                <Input id="template-days" type="number" min={0} value={meta.estimatedDays} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, estimatedDays: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-docs">Required documents (comma separated)</Label>
              <Input id="template-docs" value={requiredDocuments} disabled={isReadOnly} onChange={(e) => setRequiredDocuments(e.target.value)} placeholder="Government ID, W-9" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={meta.isDefault} disabled={isReadOnly} onChange={(e) => setMeta({ ...meta, isDefault: e.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-900" />
              Use as this account&apos;s default template
            </label>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-white">Add a field</h3>
              <div className="space-y-3">
                {FIELD_PALETTE.map((group) => (
                  <div key={group.category}>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">{group.category}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <Button key={item.type} type="button" variant="outline" size="sm" className="rounded-xl" disabled={isReadOnly} onClick={() => addField(item)}>
                          <Plus className="mr-1 h-3 w-3" /> {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </WorkforcePanel>

          <WorkforcePanel className="p-5">
            <Tabs defaultValue="build" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList className="rounded-xl bg-slate-900/70">
                  <TabsTrigger value="build" className="gap-2 rounded-lg">
                    <Pencil className="h-4 w-4" /> Build
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2 rounded-lg">
                    <Eye className="h-4 w-4" /> Preview
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2 text-xs text-slate-400">
                  <Badge variant="outline">{fields.length} fields</Badge>
                  <Badge variant="outline">{agreementCount} agreements</Badge>
                </div>
              </div>

              <TabsContent value="build" className="space-y-3">
                {fields.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-6 text-center text-sm text-muted-foreground">
                    Add fields from the palette to start building the onboarding form.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <FieldEditorCard
                      key={field.id}
                      field={field}
                      index={index}
                      total={fields.length}
                      readOnly={isReadOnly}
                      onChange={(next) => updateField(index, next)}
                      onRemove={() => removeField(index)}
                      onMove={(direction) => moveField(index, direction)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="preview">
                <TemplatePreview fields={fields} />
              </TabsContent>
            </Tabs>
          </WorkforcePanel>
        </div>
      </div>
    </WorkforcePageShell>
  )
}
