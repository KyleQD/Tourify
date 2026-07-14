"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HiringStateCard } from "@/components/hiring/hiring-state-card"
import { useToast } from "@/hooks/use-toast"
import type {
  OnboardingField,
  OnboardingResponseValue,
  OnboardingSectionKey,
  TokenOnboardingPayload,
} from "@/types/hiring-worker-onboarding"
import { DynamicOnboardingForm } from "./dynamic-onboarding-form"
import { OnboardingReviewSubmit } from "./onboarding-review-submit"
import { OnboardingWizardShell } from "./onboarding-wizard-shell"
import type { OnboardingStepItem } from "./onboarding-stepper"

interface TokenOnboardingFlowProps {
  token: string
}

interface TokenApiResponse {
  data?: TokenOnboardingPayload
  ok?: boolean
  error?: string
  invitation?: TokenOnboardingPayload["invitation"]
  candidate?: TokenOnboardingPayload["candidate"]
  employer?: TokenOnboardingPayload["employer"]
  template?: TokenOnboardingPayload["template"]
  position?: string | null
  department?: string | null
  existingResponses?: Record<string, unknown> | null
  progress?: number | null
}

const SECTION_LABELS: Record<OnboardingSectionKey, string> = {
  identity: "Identity",
  contact: "Contact",
  emergency_contact: "Emergency",
  work_eligibility: "Work eligibility",
  certifications: "Certifications",
  tax_payment: "Tax / payment",
  documents: "Documents",
  waiver: "Waiver",
  review: "Review",
  custom: "Additional info",
}

function normalizePayload(response: TokenApiResponse): TokenOnboardingPayload | null {
  if (response.data) return response.data
  if (response.invitation && response.candidate && response.employer && response.template) {
    return {
      invitation: response.invitation,
      candidate: response.candidate,
      employer: response.employer,
      template: response.template,
      position: response.position,
      department: response.department,
      existingResponses: response.existingResponses,
      progress: response.progress,
    }
  }

  return null
}

function getFieldSection(field: OnboardingField): OnboardingSectionKey {
  return field.section || "custom"
}

function groupFieldsBySection(fields: OnboardingField[]) {
  return fields.reduce<Record<string, OnboardingField[]>>((groups, field) => {
    const section = getFieldSection(field)
    groups[section] = [...(groups[section] || []), field]
    return groups
  }, {})
}

function isValueComplete(value: OnboardingResponseValue | undefined): boolean {
  if (value === null || typeof value === "undefined") return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return value
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.values(value).some(Boolean)
  return false
}

function getRequiredFields(fields: OnboardingField[]) {
  return fields.filter((field) => field.required || field.blocking)
}

function getMissingRequiredFields({ fields, responses }: { fields: OnboardingField[]; responses: Record<string, OnboardingResponseValue> }) {
  return getRequiredFields(fields).filter((field) => !isValueComplete(responses[field.name]))
}

function getCompletionProgress({ fields, responses }: { fields: OnboardingField[]; responses: Record<string, OnboardingResponseValue> }): number {
  const requiredFields = getRequiredFields(fields)
  if (requiredFields.length === 0) return 100

  const completedCount = requiredFields.filter((field) => isValueComplete(responses[field.name])).length
  return Math.round((completedCount / requiredFields.length) * 100)
}

function sectionIsComplete({ fields, responses }: { fields: OnboardingField[]; responses: Record<string, OnboardingResponseValue> }): boolean {
  const requiredFields = getRequiredFields(fields)
  if (requiredFields.length === 0) return true
  return requiredFields.every((field) => isValueComplete(responses[field.name]))
}

/**
 * Worker-facing onboarding flow for token-based hiring onboarding.
 * This component loads real onboarding payload data from /api/onboarding/[token].
 */
export function TokenOnboardingFlow({ token }: TokenOnboardingFlowProps) {
  const { toast } = useToast()
  const [payload, setPayload] = useState<TokenOnboardingPayload | null>(null)
  const [responses, setResponses] = useState<Record<string, OnboardingResponseValue>>({})
  const [activeStepId, setActiveStepId] = useState<string>("custom")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  async function loadPayload() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/onboarding/${token}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      const json = (await response.json().catch(() => null)) as TokenApiResponse | null

      if (!response.ok || !json) {
        setError(json?.error || "Unable to load this onboarding link.")
        return
      }

      const normalizedPayload = normalizePayload(json)
      if (!normalizedPayload) {
        setError("The onboarding link returned an invalid payload.")
        return
      }

      const fields = normalizedPayload.template.fields || []
      const grouped = groupFieldsBySection(fields)
      const firstStep = Object.keys(grouped)[0] || "review"

      setPayload(normalizedPayload)
      setResponses((normalizedPayload.existingResponses || {}) as Record<string, OnboardingResponseValue>)
      setActiveStepId(firstStep)
      setIsComplete(Boolean(normalizedPayload.invitation.completed_at || normalizedPayload.invitation.status === "completed"))
    } catch {
      setError("Unable to load onboarding. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPayload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fields = payload?.template.fields || []
  const groupedFields = useMemo(() => groupFieldsBySection(fields), [fields])
  const sectionIds = useMemo(() => Object.keys(groupedFields), [groupedFields])
  const allStepIds = useMemo(() => [...sectionIds, "review"], [sectionIds])
  const activeIndex = allStepIds.indexOf(activeStepId)
  const activeFields = groupedFields[activeStepId] || []
  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields({ fields, responses }),
    [fields, responses]
  )
  const progress = useMemo(
    () => getCompletionProgress({ fields, responses }),
    [fields, responses]
  )

  const steps: OnboardingStepItem[] = useMemo(
    () =>
      allStepIds.map((stepId) => ({
        id: stepId,
        label: SECTION_LABELS[stepId as OnboardingSectionKey] || "Step",
        isComplete:
          stepId === "review"
            ? missingRequiredFields.length === 0
            : sectionIsComplete({ fields: groupedFields[stepId] || [], responses }),
      })),
    [allStepIds, groupedFields, missingRequiredFields.length, responses]
  )

  function goToNextStep() {
    const nextStepId = allStepIds[activeIndex + 1]
    if (nextStepId) setActiveStepId(nextStepId)
  }

  function goToPreviousStep() {
    const previousStepId = allStepIds[activeIndex - 1]
    if (previousStepId) setActiveStepId(previousStepId)
  }

  async function submitOnboarding() {
    if (!payload) return
    if (missingRequiredFields.length > 0) {
      toast({
        title: "Missing required information",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast({
          title: "Submission failed",
          description: result?.error || "Unable to submit onboarding right now.",
          variant: "destructive",
        })
        return
      }

      setIsComplete(true)
      toast({
        title: "Onboarding complete",
        description: "Your onboarding has been submitted successfully.",
      })
    } catch {
      toast({
        title: "Submission failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <HiringStateCard
            title="Loading onboarding"
            description="We are loading your secure onboarding link."
            icon={Loader2}
            isLoading
          />
        </div>
      </main>
    )
  }

  if (error || !payload) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl space-y-4">
          <Alert className="border-rose-500/40 bg-rose-500/10 text-rose-100">
            <AlertTitle>Onboarding link unavailable</AlertTitle>
            <AlertDescription>{error || "This onboarding link could not be loaded."}</AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={loadPayload}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </main>
    )
  }

  if (isComplete) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <HiringStateCard
            title="Onboarding submitted"
            description="Your onboarding has been submitted. Your hiring profile will review any documents that require approval."
            icon={CheckCircle2}
            className="border-emerald-500/30"
          />
        </div>
      </main>
    )
  }

  return (
    <OnboardingWizardShell
      employer={payload.employer}
      candidateName={payload.candidate.name}
      position={payload.position || payload.candidate.position}
      department={payload.department || payload.candidate.department}
      progress={progress}
      steps={steps}
      activeStepId={activeStepId}
      onStepSelect={setActiveStepId}
      footer={
        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={activeIndex <= 0 || isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {activeStepId === "review" ? (
            <Button type="button" onClick={submitOnboarding} disabled={isSubmitting || missingRequiredFields.length > 0} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Complete onboarding"}
            </Button>
          ) : (
            <Button type="button" onClick={goToNextStep} disabled={!allStepIds[activeIndex + 1] || isSubmitting}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      {activeStepId === "review" ? (
        <OnboardingReviewSubmit
          fields={fields}
          responses={responses}
          missingRequiredFields={missingRequiredFields}
          isSubmitting={isSubmitting}
          onBack={goToPreviousStep}
          onSubmit={submitOnboarding}
        />
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">
              {SECTION_LABELS[activeStepId as OnboardingSectionKey] || "Onboarding step"}
            </h2>
            <p className="text-sm text-slate-400">
              Complete the required fields in this section. Required items are marked with an asterisk.
            </p>
          </div>
          <DynamicOnboardingForm
            token={token}
            fields={activeFields}
            responses={responses}
            disabled={isSubmitting}
            onResponsesChange={setResponses}
          />
        </div>
      )}
    </OnboardingWizardShell>
  )
}
