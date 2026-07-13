"use client"

import { AlertCircle, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OnboardingField, OnboardingResponseValue } from "@/types/hiring-worker-onboarding"

interface OnboardingReviewSubmitProps {
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
  missingRequiredFields: OnboardingField[]
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
 * Submit/Back actions live in the wizard footer to avoid duplicate Complete buttons.
 */
export function OnboardingReviewSubmit({
  fields,
  responses,
  missingRequiredFields,
}: OnboardingReviewSubmitProps) {
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
              All required fields are complete. Use Complete onboarding below to send your answers for review.
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
    </div>
  )
}
