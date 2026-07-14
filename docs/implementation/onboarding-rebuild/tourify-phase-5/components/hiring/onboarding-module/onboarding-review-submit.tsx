"use client"

import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnboardingField, OnboardingResponseValue } from "@/types/hiring-worker-onboarding"

interface OnboardingReviewSubmitProps {
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
  missingRequiredFields: OnboardingField[]
  isSubmitting?: boolean
  onBack: () => void
  onSubmit: () => void
}

function formatValue(value: OnboardingResponseValue): string {
  if (value === null || typeof value === "undefined") return "Not provided"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") {
    if ("fileName" in value && typeof value.fileName === "string") return value.fileName
    return "Provided"
  }

  return String(value)
}

/**
 * Final worker-facing review step. Sensitive object fields are summarized only.
 */
export function OnboardingReviewSubmit({
  fields,
  responses,
  missingRequiredFields,
  isSubmitting,
  onBack,
  onSubmit,
}: OnboardingReviewSubmitProps) {
  const canSubmit = missingRequiredFields.length === 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Review and submit</h2>
        <p className="text-sm text-slate-400">
          Check your information before submitting. Secure fields and uploaded files may be summarized here for privacy.
        </p>
      </div>

      {missingRequiredFields.length > 0 ? (
        <Card className="border-rose-500/40 bg-rose-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-rose-100">
              <AlertCircle className="h-5 w-5" />
              Required items missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-rose-100">
              {missingRequiredFields.map((field) => (
                <li key={field.id}>{field.label}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-100">
              <ShieldCheck className="h-5 w-5" />
              Ready to submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-100">
              All required fields are complete. Your hiring profile may still review documents before final roster activation.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
            <p className="mt-1 text-sm text-slate-100">{formatValue(responses[field.name])}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isSubmitting ? "Submitting..." : "Complete onboarding"}
        </Button>
      </div>
    </div>
  )
}
