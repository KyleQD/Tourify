"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HiringStateCard } from "@/components/hiring/hiring-state-card"
import { useToast } from "@/hooks/use-toast"
import {
  buildPersonalInfoAttestationField,
  buildWizardStepGroups,
  getStepLabel,
  hasPersonalInfoAttestation,
  PERSONAL_INFO_ATTESTATION_FIELD,
  PERSONAL_INFO_STEP_ID,
  withAttestationTimestamp,
  type WizardStepGroup,
} from "@/lib/hiring/onboarding-step-groups"
import type {
  OnboardingField,
  OnboardingResponseValue,
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
  prefillSource?: "draft" | "saved_profile" | "none"
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
      prefillSource: response.prefillSource,
    }
  }

  return null
}

function extractFieldMap(existing: unknown): Record<string, OnboardingResponseValue> {
  if (!existing || typeof existing !== "object") return {}

  const row = existing as { responses?: Record<string, unknown> }
  if ("responses" in row && row.responses && typeof row.responses === "object" && !Array.isArray(row.responses)) {
    return row.responses as Record<string, OnboardingResponseValue>
  }

  // Already a flat field map (e.g. candidate.onboarding_responses)
  if (!("id" in row) && !("invitation_id" in row) && !("completed" in row)) {
    return existing as Record<string, OnboardingResponseValue>
  }

  return {}
}

function isValueComplete(value: OnboardingResponseValue | undefined): boolean {
  if (value === null || typeof value === "undefined") return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return value
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") {
    if ("fileName" in value || "document_id" in value || "url" in value) return true
    return Object.values(value).some(Boolean)
  }
  return false
}

function getRequiredFields(fields: OnboardingField[]) {
  return fields.filter((field) => field.required || field.blocking)
}

function getMissingRequiredFields({
  fields,
  responses,
}: {
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
}) {
  return getRequiredFields(fields).filter((field) => !isValueComplete(responses[field.name]))
}

function getCompletionProgress({
  fields,
  responses,
}: {
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
}): number {
  const requiredFields = getRequiredFields(fields)
  if (requiredFields.length === 0) return 100

  const completedCount = requiredFields.filter((field) => isValueComplete(responses[field.name])).length
  return Math.round((completedCount / requiredFields.length) * 100)
}

function sectionIsComplete({
  fields,
  responses,
}: {
  fields: OnboardingField[]
  responses: Record<string, OnboardingResponseValue>
}): boolean {
  const requiredFields = getRequiredFields(fields)
  if (requiredFields.length === 0) return true
  return requiredFields.every((field) => isValueComplete(responses[field.name]))
}

function getActiveStepFields({
  stepGroups,
  activeStepId,
  employerDisplayName,
}: {
  stepGroups: WizardStepGroup[]
  activeStepId: string
  employerDisplayName?: string | null
}): OnboardingField[] {
  const group = stepGroups.find((step) => step.id === activeStepId)
  if (!group) return []
  if (activeStepId !== PERSONAL_INFO_STEP_ID) return group.fields
  return [...group.fields, buildPersonalInfoAttestationField(employerDisplayName)]
}

/**
 * Worker-facing onboarding flow for token-based hiring onboarding.
 * This component loads real onboarding payload data from /api/onboarding/[token].
 */
export function TokenOnboardingFlow({ token }: TokenOnboardingFlowProps) {
  const { toast } = useToast()
  const [payload, setPayload] = useState<TokenOnboardingPayload | null>(null)
  const [responses, setResponses] = useState<Record<string, OnboardingResponseValue>>({})
  const [activeStepId, setActiveStepId] = useState<string>("review")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [prefillSource, setPrefillSource] = useState<"draft" | "saved_profile" | "none">("none")
  const submitLockRef = useRef(false)

  function getApiErrorMessage(result: unknown, fallback: string): string {
    if (!result || typeof result !== "object") return fallback
    const error = (result as { error?: unknown }).error
    if (typeof error === "string" && error.trim()) return error
    if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message
    }
    return fallback
  }

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
      const stepGroups = buildWizardStepGroups(fields)
      const firstStep = stepGroups[0]?.id || "review"

      setPayload(normalizedPayload)
      setResponses(extractFieldMap(normalizedPayload.existingResponses))
      setPrefillSource(normalizedPayload.prefillSource || "none")
      setActiveStepId(firstStep)
      const candidateStatus =
        typeof normalizedPayload.candidate.status === "string" ? normalizedPayload.candidate.status : ""
      const needsRevision = candidateStatus === "needs_revision"
      // Revision loop reopens the invite; never treat needs_revision as a completed dead-end.
      setIsComplete(
        !needsRevision &&
          Boolean(normalizedPayload.invitation.completed_at || normalizedPayload.invitation.status === "completed")
      )
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
  const employerDisplayName = payload?.employer.displayName
  const stepGroups = useMemo(() => buildWizardStepGroups(fields), [fields])
  const attestationField = useMemo(
    () => buildPersonalInfoAttestationField(employerDisplayName),
    [employerDisplayName]
  )
  const fieldsForValidation = useMemo(() => {
    const hasPersonalStep = stepGroups.some((group) => group.id === PERSONAL_INFO_STEP_ID)
    return hasPersonalStep ? [...fields, attestationField] : fields
  }, [fields, stepGroups, attestationField])

  const allStepIds = useMemo(() => [...stepGroups.map((group) => group.id), "review"], [stepGroups])
  const activeIndex = allStepIds.indexOf(activeStepId)
  const activeFields = useMemo(
    () => getActiveStepFields({ stepGroups, activeStepId, employerDisplayName }),
    [stepGroups, activeStepId, employerDisplayName]
  )
  const activeGroup = stepGroups.find((group) => group.id === activeStepId)

  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields({ fields: fieldsForValidation, responses }),
    [fieldsForValidation, responses]
  )
  const missingActiveStepFields = useMemo(
    () => getMissingRequiredFields({ fields: activeFields, responses }),
    [activeFields, responses]
  )
  const progress = useMemo(
    () => getCompletionProgress({ fields: fieldsForValidation, responses }),
    [fieldsForValidation, responses]
  )

  const steps: OnboardingStepItem[] = useMemo(
    () =>
      allStepIds.map((stepId) => {
        if (stepId === "review") {
          return {
            id: stepId,
            label: getStepLabel("review"),
            isComplete: missingRequiredFields.length === 0,
          }
        }

        const group = stepGroups.find((item) => item.id === stepId)
        const stepFields =
          stepId === PERSONAL_INFO_STEP_ID && group
            ? [...group.fields, attestationField]
            : group?.fields || []

        return {
          id: stepId,
          label: group?.label || getStepLabel(stepId),
          isComplete: sectionIsComplete({ fields: stepFields, responses }),
        }
      }),
    [allStepIds, stepGroups, missingRequiredFields.length, responses, attestationField]
  )

  function handleResponsesChange(nextResponses: Record<string, OnboardingResponseValue>) {
    setResponses(withAttestationTimestamp(nextResponses) as Record<string, OnboardingResponseValue>)
  }

  async function saveDraft(nextResponses: Record<string, OnboardingResponseValue> = responses) {
    setIsSavingDraft(true)
    try {
      await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: nextResponses, completed: false }),
      })
    } catch {
      // Draft save is best-effort; continue navigation even if it fails.
    } finally {
      setIsSavingDraft(false)
    }
  }

  async function goToNextStep() {
    if (activeStepId !== "review" && missingActiveStepFields.length > 0) {
      toast({
        title: "Complete required fields",
        description: `Please fill in: ${missingActiveStepFields.map((field) => field.label).join(", ")}`,
        variant: "destructive",
      })
      return
    }

    if (activeStepId === PERSONAL_INFO_STEP_ID && !hasPersonalInfoAttestation(responses)) {
      toast({
        title: "Certification required",
        description: "Please certify that your information is accurate and agree to share it with the hiring employer.",
        variant: "destructive",
      })
      return
    }

    const stamped = withAttestationTimestamp(responses) as Record<string, OnboardingResponseValue>
    setResponses(stamped)
    await saveDraft(stamped)

    const nextStepId = allStepIds[activeIndex + 1]
    if (nextStepId) setActiveStepId(nextStepId)
  }

  function goToPreviousStep() {
    const previousStepId = allStepIds[activeIndex - 1]
    if (previousStepId) setActiveStepId(previousStepId)
  }

  async function submitOnboarding() {
    if (!payload || submitLockRef.current) return

    if (!hasPersonalInfoAttestation(responses)) {
      toast({
        title: "Certification required",
        description: "Please complete the personal information certification before submitting.",
        variant: "destructive",
      })
      setActiveStepId(PERSONAL_INFO_STEP_ID)
      return
    }

    if (missingRequiredFields.length > 0) {
      toast({
        title: "Missing required information",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      })
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)
    const stamped = withAttestationTimestamp(responses) as Record<string, OnboardingResponseValue>
    setResponses(stamped)

    try {
      const response = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: stamped, completed: true }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        toast({
          title: "Submission failed",
          description: getApiErrorMessage(result, "Unable to submit onboarding right now."),
          variant: "destructive",
        })
        return
      }

      setIsComplete(true)
      toast({
        title: result?.data?.alreadySubmitted ? "Already submitted" : "Onboarding complete",
        description: result?.data?.alreadySubmitted
          ? "Your onboarding was already received. Your hiring team can review it now."
          : "Your onboarding has been submitted successfully.",
      })
    } catch {
      toast({
        title: "Submission failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl">
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
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.16),transparent_45%)]" />
        <div className="relative mx-auto max-w-3xl space-y-4">
          <Alert className="border-rose-500/40 bg-rose-500/10 text-rose-100">
            <AlertTitle>Onboarding link unavailable</AlertTitle>
            <AlertDescription>{error || "This onboarding link could not be loaded."}</AlertDescription>
          </Alert>
          <Button type="button" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={loadPayload}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </main>
    )
  }

  if (isComplete) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.2),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="rounded-3xl border border-emerald-400/25 bg-white/[0.045] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Onboarding submitted</h1>
            <p className="mt-3 max-w-xl text-slate-300">
              Your answers and documents were sent to {payload.employer.displayName || "your hiring team"}. They will review anything that needs approval and activate your roster access.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const stepLabel = activeGroup?.label || getStepLabel(activeStepId)
  const stepNumber = activeIndex >= 0 ? activeIndex + 1 : 1
  const isBusy = isSubmitting || isSavingDraft
  const needsRevision = payload.candidate.status === "needs_revision"
  const revisionNotes =
    typeof payload.candidate.notes === "string" && payload.candidate.notes.trim().length > 0
      ? payload.candidate.notes.trim()
      : null

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
        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            disabled={activeIndex <= 0 || isBusy}
            className="border-white/15 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {activeStepId === "review" ? (
            <Button
              type="button"
              onClick={submitOnboarding}
              disabled={isBusy || missingRequiredFields.length > 0}
              className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/20 hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-400"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : needsRevision ? "Update and resubmit" : "Complete onboarding"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={!allStepIds[activeIndex + 1] || isBusy}
              className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-fuchsia-500/20 hover:from-violet-500 hover:via-fuchsia-500 hover:to-cyan-400"
            >
              {isSavingDraft ? "Saving..." : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      {needsRevision ? (
        <Alert className="mb-5 border-amber-400/40 bg-amber-500/10 text-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <AlertTitle className="text-amber-100">Changes requested</AlertTitle>
          <AlertDescription className="space-y-2 text-amber-100/90">
            <p>
              {payload.employer.displayName || "Your hiring team"} asked you to update your onboarding and resubmit.
            </p>
            {revisionNotes ? (
              <p className="whitespace-pre-wrap rounded-xl border border-amber-400/20 bg-black/20 px-3 py-2 text-sm text-amber-50">
                {revisionNotes}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {activeStepId === "review" ? (
        <OnboardingReviewSubmit
          fields={fieldsForValidation}
          responses={responses}
          missingRequiredFields={missingRequiredFields}
        />
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
              Step {stepNumber} of {allStepIds.length}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{stepLabel}</h2>
            <p className="text-sm text-slate-400">
              {activeStepId === PERSONAL_INFO_STEP_ID
                ? "Confirm your identity, contact, emergency, and work eligibility details in one place."
                : "Complete the required fields in this section. Required items are marked with an asterisk."}
              {missingActiveStepFields.length > 0 ? (
                <span className="ml-1 text-fuchsia-300">
                  ({missingActiveStepFields.length} remaining)
                </span>
              ) : null}
            </p>
            {prefillSource === "saved_profile" ? (
              <p className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                Prefilled from your saved onboarding profile. Review and update anything that changed.
              </p>
            ) : null}
          </div>

          {activeStepId === PERSONAL_INFO_STEP_ID && activeGroup?.subsections?.length ? (
            <div className="flex flex-wrap gap-2">
              {activeGroup.subsections.map((subsection) => (
                <span
                  key={subsection.key}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                >
                  {subsection.label}
                </span>
              ))}
            </div>
          ) : null}

          <DynamicOnboardingForm
            token={token}
            fields={activeFields}
            responses={responses}
            disabled={isBusy}
            onResponsesChange={handleResponsesChange}
          />

          {activeStepId === PERSONAL_INFO_STEP_ID && !responses[PERSONAL_INFO_ATTESTATION_FIELD] ? (
            <p className="text-sm text-fuchsia-300">
              You must certify your information before continuing.
            </p>
          ) : null}
        </div>
      )}
    </OnboardingWizardShell>
  )
}
