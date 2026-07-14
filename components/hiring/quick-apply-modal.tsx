"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { ApplyProfilePreviewCard } from "@/components/hiring/apply-profile-preview-card"
import { ApplyScreeningFieldsForm } from "@/components/hiring/apply-screening-fields-form"
import type { ApplicantProfileSnapshot } from "@/types/hiring-application-review"
import type { ApplicationFormField } from "@/types/admin-onboarding"

interface QuickApplyPreview {
  snapshot: ApplicantProfileSnapshot | null
  screeningFields: ApplicationFormField[]
  completeness: { isComplete: boolean; warnings: string[] }
  alreadyApplied: boolean
}

interface QuickApplyModalProps {
  jobPostingId: string
  jobTitle: string
  employerName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
  onUseFullForm?: () => void
}

export function QuickApplyModal({
  jobPostingId,
  jobTitle,
  employerName,
  open,
  onOpenChange,
  onSubmitted,
  onUseFullForm,
}: QuickApplyModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<QuickApplyPreview | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [consent, setConsent] = useState(false)

  const loadPreview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/hiring/apply/profile-preview?job_posting_id=${jobPostingId}`, {
        credentials: "include",
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || "Failed to load your profile")
      setPreview(data.data as QuickApplyPreview)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your profile")
    } finally {
      setIsLoading(false)
    }
  }, [jobPostingId])

  useEffect(() => {
    if (!open) {
      setPreview(null)
      setValues({})
      setConsent(false)
      setError(null)
      return
    }
    void loadPreview()
  }, [open, loadPreview])

  function handleFieldChange(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function getMissingRequiredField(): string | null {
    for (const field of preview?.screeningFields ?? []) {
      if (!field.required) continue
      const value = values[field.name]
      const isEmpty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (field.type === "checkbox" && value !== true)
      if (isEmpty) return field.label
    }
    return null
  }

  async function handleSubmit() {
    if (!consent) {
      toast({ title: "Consent required", description: "Please agree to share your profile.", variant: "destructive" })
      return
    }

    const missing = getMissingRequiredField()
    if (missing) {
      toast({ title: "Missing answer", description: `Please complete: ${missing}`, variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ job_posting_id: jobPostingId, form_responses: values, share_profile: true }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || "Failed to submit application")
      toast({
        title: "Application submitted",
        description: "Your profile was shared with the hiring team. Track it under Jobs → Applied.",
      })
      onOpenChange(false)
      onSubmitted?.()
    } catch (err) {
      toast({
        title: "Application failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const snapshot = preview?.snapshot ?? null
  const shareTarget = employerName ? `the team at ${employerName}` : "the hiring team"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-800 bg-slate-950 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Quick Apply — {jobTitle}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Share your Tourify profile as your resume and answer any role-specific questions.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !snapshot ? (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need a profile before applying. Create one to use Quick Apply.
              </AlertDescription>
            </Alert>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <Link href="/settings" target="_blank">
                Set up your profile
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {preview?.alreadyApplied ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>You already applied to this role. Submitting again will update your application.</AlertDescription>
              </Alert>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Your profile</h4>
                <Link href="/settings" target="_blank" className="text-xs text-purple-300 hover:text-purple-200">
                  Edit profile
                </Link>
              </div>
              <ApplyProfilePreviewCard snapshot={snapshot} />
            </div>

            {preview && preview.completeness.warnings.length > 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-1 font-medium">Strengthen your application:</p>
                  <ul className="list-inside list-disc text-sm">
                    {preview.completeness.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {preview && preview.screeningFields.length > 0 ? (
              <>
                <Separator className="bg-slate-800" />
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    A few questions from {employerName || "the employer"}
                  </h4>
                  <ApplyScreeningFieldsForm
                    fields={preview.screeningFields}
                    values={values}
                    onChange={handleFieldChange}
                  />
                </div>
              </>
            ) : null}

            <Separator className="bg-slate-800" />

            <label className="flex items-start gap-2 text-sm text-slate-300">
              <Checkbox checked={consent} onCheckedChange={(next) => setConsent(next === true)} className="mt-0.5" />
              <span className="flex items-start gap-1">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                I agree to share my Tourify profile, including my contact details, with {shareTarget} for this application.
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  onUseFullForm?.()
                }}
                className="text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                Use the full application form instead
              </button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !consent} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit application
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
