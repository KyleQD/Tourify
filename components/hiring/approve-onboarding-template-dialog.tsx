"use client"

import { useState } from "react"
import { ArrowUpRight, FileText, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { cn } from "@/lib/utils"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringTemplateListItem } from "@/types/hiring-dashboard"

interface ApproveOnboardingTemplateDialogProps {
  employer: HiringEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId?: string | null
  isSubmitting?: boolean
  onApprove: (options: { onboardingTemplateId?: string }) => void
}

export function ApproveOnboardingTemplateDialog({
  employer,
  open,
  onOpenChange,
  jobId,
  isSubmitting = false,
  onApprove,
}: ApproveOnboardingTemplateDialogProps) {
  const queryString = getEmployerQueryString(employer)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const {
    data: templates,
    isLoading,
    error,
  } = useHiringDashboardFetch<HiringTemplateListItem[]>({
    url: `/api/admin/onboarding/templates?${queryString}`,
    initialData: [],
    enabled: open,
  })

  const manageHref = `/admin/dashboard/hiring/templates/new?${queryString}`
  const attachHref = jobId ? `/admin/dashboard/jobs/${jobId}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign an onboarding template</DialogTitle>
          <DialogDescription>
            This job has no specific onboarding template yet. Pick one to send tailored onboarding on approval, or continue
            with the account default (New Staff).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-4 text-sm text-muted-foreground">
              No onboarding templates exist for this account yet. Build one to send onboarding instructions with the
              approval.
            </div>
          ) : (
            <RadioGroup
              value={selectedTemplateId ?? ""}
              onValueChange={setSelectedTemplateId}
              className="max-h-64 space-y-2 overflow-y-auto pr-1"
            >
              {templates.map((template) => (
                <Label
                  key={template.id}
                  htmlFor={`template-${template.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/35 p-3 transition-colors",
                    selectedTemplateId === template.id && "border-primary/60 bg-primary/10"
                  )}
                >
                  <RadioGroupItem id={`template-${template.id}`} value={template.id} className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{template.name}</span>
                      {template.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[template.department, template.position].filter(Boolean).join(" • ") || "General template"}
                    </p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <a href={manageHref}>
                <FileText className="h-4 w-4" />
                Build a template
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
            {attachHref ? (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                <a href={attachHref}>
                  Attach on job
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onApprove({})} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Use default template
          </Button>
          <Button
            onClick={() => selectedTemplateId && onApprove({ onboardingTemplateId: selectedTemplateId })}
            disabled={isSubmitting || !selectedTemplateId}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Approve with template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
