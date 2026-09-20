"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Briefcase, Building2, CalendarDays, Loader2, Route, Save, Send, ShieldCheck } from "lucide-react"

import {
  JobPostingReviewRow,
  JobPostingWizardFooter,
  JobPostingWizardPanel,
  JobPostingWizardShell,
  jobPostingChipClass,
  jobPostingFieldClass,
  jobPostingFieldLabelClass,
  jobPostingOutlineButtonClass,
  jobPostingPrimaryButtonClass,
  jobPostingSelectClass,
  jobPostingSelectContentClass,
} from "@/components/job-posting/job-posting-wizard-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { readHiringJson } from "@/lib/api/hiring-client"
import { getSelectedSeatBundleLabels, JOB_SEAT_PERMISSION_BUNDLES, type JobAssignmentScope } from "@/lib/hiring/job-seat-permissions"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { buildJobPostingEndpoint, buildWorkforceJobPostingPayload } from "@/lib/job-posting/job-posting-adapters"
import type { HiringEntity } from "@/types/hiring-entity"

interface AdminJobPostingWizardProps {
  employer: HiringEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (posting: Record<string, unknown>) => void
}

interface EventOption {
  id: string
  title: string
  start_at: string | null
  end_at: string | null
  timezone: string
  venue_id: string | null
  status: string
}

interface TourOption {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: string | null
}

interface OnboardingTemplateOption {
  id: string
  name: string
  description?: string | null
  is_default?: boolean | null
  scope?: "employer" | "global"
}

interface PostingOptions {
  organizationSeatAvailable: boolean
  events: EventOption[]
  tours: TourOption[]
  onboardingTemplates: OnboardingTemplateOption[]
  defaultOnboardingTemplateId: string | null
}

interface WizardState {
  title: string
  description: string
  department: string
  position: string
  numberOfPositions: number
  location: string
  eventDate: string
  employmentType: string
  experienceLevel: string
  salaryMin: string
  salaryMax: string
  salaryType: "hourly" | "daily" | "flat" | "salary"
  remote: boolean
  urgent: boolean
  assignmentScope: JobAssignmentScope
  eventId: string | null
  tourId: string | null
  onboardingTemplateId: string | null
  seatRole: string
  seatPermissions: string[]
}

const INITIAL_STATE: WizardState = {
  title: "",
  description: "",
  department: "",
  position: "",
  numberOfPositions: 1,
  location: "",
  eventDate: "",
  employmentType: "contractor",
  experienceLevel: "entry",
  salaryMin: "",
  salaryMax: "",
  salaryType: "hourly",
  remote: false,
  urgent: false,
  assignmentScope: "organization",
  eventId: null,
  tourId: null,
  onboardingTemplateId: null,
  seatRole: "worker",
  seatPermissions: [],
}

const STEPS = [
  { id: 1, label: "Role & assignment" },
  { id: 2, label: "Details & access" },
  { id: 3, label: "Review" },
]

function dateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : value.slice(0, 10)
}

function optionDate(value: string | null | undefined): string {
  if (!value) return "Date not set"
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : value
}

export function AdminJobPostingWizard({ employer, open, onOpenChange, onCreated }: AdminJobPostingWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [options, setOptions] = useState<PostingOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const queryString = useMemo(() => getEmployerQueryString(employer), [employer])
  const selectedEvent = options?.events.find((event) => event.id === state.eventId) ?? null
  const selectedTour = options?.tours.find((tour) => tour.id === state.tourId) ?? null
  const selectedTemplate = options?.onboardingTemplates.find((template) => template.id === state.onboardingTemplateId) ?? null
  const selectedSeatLabels = getSelectedSeatBundleLabels(state.seatPermissions)
  const hasValidTarget =
    state.assignmentScope === "organization" ||
    (state.assignmentScope === "event" && Boolean(state.eventId)) ||
    (state.assignmentScope === "tour" && Boolean(state.tourId))
  const canContinueStepOne = state.title.trim().length > 0 && state.description.trim().length > 0 && hasValidTarget
  const canContinue = step === 1 ? canContinueStepOne : true
  const canPublish = canContinueStepOne

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const scopedState: WizardState = {
      ...INITIAL_STATE,
      assignmentScope: employer.scope?.eventId ? "event" : employer.scope?.tourId ? "tour" : "organization",
      eventId: employer.scope?.eventId ?? null,
      tourId: employer.scope?.tourId ?? null,
    }
    setState(scopedState)
    setStep(1)
    setFormError(null)
    setOptionsError(null)
    setIsLoadingOptions(true)

    void readHiringJson<PostingOptions>(
      buildJobPostingEndpoint("/api/hiring/job-postings/options", queryString),
      { cache: "no-store", signal: controller.signal },
      { fallbackErrorMessage: "Unable to load events, tours, and onboarding packets." },
    ).then((result) => {
      if (controller.signal.aborted) return
      setIsLoadingOptions(false)
      if (!result.ok) {
        setOptionsError(result.error.message)
        return
      }
      setOptions(result.data)
      setState((previous) => ({
        ...previous,
        onboardingTemplateId: previous.onboardingTemplateId ?? result.data.defaultOnboardingTemplateId,
      }))
    })

    return () => controller.abort()
  }, [employer.scope?.eventId, employer.scope?.tourId, open, queryString])

  function update<Key extends keyof WizardState>(key: Key, value: WizardState[Key]): void {
    setState((previous) => ({ ...previous, [key]: value }))
    setFormError(null)
  }

  function selectScope(scope: JobAssignmentScope): void {
    setState((previous) => ({
      ...previous,
      assignmentScope: scope,
      eventId: scope === "event" ? previous.eventId : null,
      tourId: scope === "tour" ? previous.tourId : null,
      seatPermissions: scope === "organization" ? previous.seatPermissions : [],
    }))
    setFormError(null)
  }

  function selectEvent(eventId: string): void {
    const event = options?.events.find((candidate) => candidate.id === eventId)
    setState((previous) => ({
      ...previous,
      eventId,
      eventDate: previous.eventDate || dateInputValue(event?.start_at),
    }))
  }

  function selectTour(tourId: string): void {
    const tour = options?.tours.find((candidate) => candidate.id === tourId)
    setState((previous) => ({
      ...previous,
      tourId,
      eventDate: previous.eventDate || dateInputValue(tour?.start_date),
    }))
  }

  function toggleSeatBundle(bundleId: string, checked: boolean): void {
    const bundle = JOB_SEAT_PERMISSION_BUNDLES.find((candidate) => candidate.id === bundleId)
    if (!bundle) return
    setState((previous) => {
      const next = new Set(previous.seatPermissions)
      for (const capability of bundle.capabilities) {
        if (checked) next.add(capability)
        else next.delete(capability)
      }
      return { ...previous, seatPermissions: Array.from(next) }
    })
  }

  function resetAndClose(): void {
    setStep(1)
    setState(INITIAL_STATE)
    setOptions(null)
    setOptionsError(null)
    setFormError(null)
    onOpenChange(false)
  }

  async function submit(status: "draft" | "published"): Promise<void> {
    if (isSubmitting) return
    if (!canContinueStepOne) {
      setFormError("Add the role details and select where this hire will work.")
      setStep(1)
      return
    }
    setIsSubmitting(true)
    setFormError(null)
    try {
      const result = await readHiringJson<Record<string, unknown>>(
        buildJobPostingEndpoint("/api/hiring/job-postings", queryString),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildWorkforceJobPostingPayload({ employer, values: state, status })),
        },
        { fallbackData: {}, fallbackErrorMessage: "Unable to create job posting." },
      )
      if (!result.ok) throw new Error(result.error.message)

      toast({
        title: status === "published" ? "Job posting published" : "Draft saved",
        description:
          status === "published"
            ? "The posting is live. Approved applicants will be added to the selected team automatically."
            : "The scoped posting has been saved and can be completed later.",
      })
      onCreated?.(result.data ?? {})
      resetAndClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error"
      setFormError(message)
      toast({ title: "Unable to create job posting", description: message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const scopeName = state.assignmentScope === "event" ? selectedEvent?.title : state.assignmentScope === "tour" ? selectedTour?.name : employer.displayName

  return (
    <JobPostingWizardShell
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}
      title="New job posting"
      description={<>Add a title and description, choose where this person will work, and publish. Everything else can be completed later.</>}
      icon={<Briefcase className="h-5 w-5 text-cyan-300" />}
      steps={STEPS}
      currentStep={step}
      footer={
        <JobPostingWizardFooter
          step={step}
          totalSteps={STEPS.length}
          canContinue={canContinue}
          isSubmitting={isSubmitting}
          onBack={() => setStep((previous) => previous - 1)}
          onCancel={resetAndClose}
          onNext={() => setStep((previous) => previous + 1)}
          actions={
            <>
              <Button type="button" variant="outline" className={jobPostingOutlineButtonClass} onClick={() => submit("draft")} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save draft
              </Button>
              <Button type="button" className={jobPostingPrimaryButtonClass} onClick={() => submit("published")} disabled={isSubmitting || !canPublish}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publish
              </Button>
            </>
          }
        />
      }
    >
      <div aria-live="polite">
        {formError || optionsError ? (
          <Alert variant="destructive" className="mb-4 border-red-500/30 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError ?? optionsError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {step === 1 ? (
        <JobPostingWizardPanel title="Role & assignment">
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className={jobPostingFieldLabelClass}>Where will this person work? *</legend>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  { id: "organization" as const, title: "Organization", description: "A recurring team seat with selected admin access.", icon: Building2, disabled: false },
                  { id: "tour" as const, title: "Tour", description: "Add the approved hire to a tour crew roster.", icon: Route, disabled: isLoadingOptions || !options?.tours.length },
                  { id: "event" as const, title: "Event", description: "Schedule the approved hire on an event roster.", icon: CalendarDays, disabled: isLoadingOptions || !options?.events.length },
                ]).map((scope) => {
                  const Icon = scope.icon
                  const selected = state.assignmentScope === scope.id
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={scope.disabled}
                      onClick={() => selectScope(scope.id)}
                      className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]" : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                    >
                      <Icon className={`mb-3 h-5 w-5 ${selected ? "text-cyan-300" : "text-slate-400"}`} />
                      <span className="block text-sm font-semibold text-white">{scope.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-400">{scope.description}</span>
                    </button>
                  )
                })}
              </div>
              {!isLoadingOptions && options && !options.events.length && !options.tours.length ? (
                <p className="text-xs text-slate-500">Create an event or tour first to post directly to one of those rosters.</p>
              ) : null}
            </fieldset>

            {state.assignmentScope === "event" ? (
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Event *</Label>
                <Select value={state.eventId ?? undefined} onValueChange={selectEvent}>
                  <SelectTrigger className={jobPostingSelectClass}><SelectValue placeholder="Select an event" /></SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {options?.events.map((event) => <SelectItem key={event.id} value={event.id}>{event.title} · {optionDate(event.start_at)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Approval creates the person’s event shift using the event schedule.</p>
              </div>
            ) : null}

            {state.assignmentScope === "tour" ? (
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Tour *</Label>
                <Select value={state.tourId ?? undefined} onValueChange={selectTour}>
                  <SelectTrigger className={jobPostingSelectClass}><SelectValue placeholder="Select a tour" /></SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {options?.tours.map((tour) => <SelectItem key={tour.id} value={tour.id}>{tour.name} · {optionDate(tour.start_date)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Approval creates the tour crew membership and Work Mode assignment.</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="wizard-title" className={jobPostingFieldLabelClass}>Job title *</Label>
              <Input id="wizard-title" value={state.title} onChange={(event) => update("title", event.target.value)} placeholder="Example: Stagehand" className={jobPostingFieldClass} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-description" className={jobPostingFieldLabelClass}>Job description *</Label>
              <Textarea id="wizard-description" value={state.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the role, expectations, and who this is best for." rows={5} className={jobPostingFieldClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="wizard-department" className={jobPostingFieldLabelClass}>Department</Label><Input id="wizard-department" value={state.department} onChange={(event) => update("department", event.target.value)} placeholder="Production" className={jobPostingFieldClass} /></div>
              <div className="space-y-2"><Label htmlFor="wizard-position" className={jobPostingFieldLabelClass}>Position</Label><Input id="wizard-position" value={state.position} onChange={(event) => update("position", event.target.value)} placeholder="Stagehand" className={jobPostingFieldClass} /></div>
              <div className="space-y-2"><Label htmlFor="wizard-positions" className={jobPostingFieldLabelClass}>Open positions</Label><Input id="wizard-positions" type="number" min={1} value={state.numberOfPositions} onChange={(event) => update("numberOfPositions", Math.max(1, Number(event.target.value) || 1))} className={jobPostingFieldClass} /></div>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <JobPostingWizardPanel title="Onboarding & access">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Onboarding packet (optional)</Label>
                <Select value={state.onboardingTemplateId ?? undefined} onValueChange={(value) => update("onboardingTemplateId", value)} disabled={isLoadingOptions}>
                  <SelectTrigger className={jobPostingSelectClass}><SelectValue placeholder={isLoadingOptions ? "Loading packets…" : "Use default or choose a packet"} /></SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {options?.onboardingTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}{template.is_default ? " · Default" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isLoadingOptions && !options?.onboardingTemplates.length ? <p className="text-xs text-slate-500">You can publish now and attach an onboarding packet later.</p> : <p className="text-xs text-slate-500">If left blank, the organization default can be resolved when the applicant is approved.</p>}
              </div>

              {state.assignmentScope === "organization" && options?.organizationSeatAvailable ? (
                <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-violet-300" />
                    <div><legend className="text-sm font-semibold text-white">Organization seat access</legend><p className="mt-1 text-xs leading-relaxed text-slate-400">The approved person becomes an active organization seat. Choose only the areas they need; owners retain full control.</p></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {JOB_SEAT_PERMISSION_BUNDLES.map((bundle) => {
                      const checked = bundle.capabilities.every((capability) => state.seatPermissions.includes(capability))
                      return (
                        <label key={bundle.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950/25 p-3 transition hover:border-white/20">
                          <Checkbox checked={checked} onCheckedChange={(value) => toggleSeatBundle(bundle.id, value === true)} aria-label={`Grant ${bundle.label} access`} />
                          <span><span className="block text-sm font-medium text-slate-100">{bundle.label}</span><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{bundle.description}</span></span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </JobPostingWizardPanel>

          <JobPostingWizardPanel title="Job details">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="wizard-location" className={jobPostingFieldLabelClass}>Location</Label><Input id="wizard-location" value={state.location} onChange={(event) => update("location", event.target.value)} placeholder="Venue, city, or remote" className={jobPostingFieldClass} /></div>
                <div className="space-y-2"><Label htmlFor="wizard-date" className={jobPostingFieldLabelClass}>Start date</Label><Input id="wizard-date" type="date" value={state.eventDate} onChange={(event) => update("eventDate", event.target.value)} className={jobPostingFieldClass} /></div>
                <div className="space-y-2"><Label className={jobPostingFieldLabelClass}>Employment type</Label><Select value={state.employmentType} onValueChange={(value) => update("employmentType", value)}><SelectTrigger className={jobPostingSelectClass}><SelectValue /></SelectTrigger><SelectContent className={jobPostingSelectContentClass}><SelectItem value="full_time">Full time</SelectItem><SelectItem value="part_time">Part time</SelectItem><SelectItem value="contractor">Contractor</SelectItem><SelectItem value="volunteer">Volunteer</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label className={jobPostingFieldLabelClass}>Experience level</Label><Select value={state.experienceLevel} onValueChange={(value) => update("experienceLevel", value)}><SelectTrigger className={jobPostingSelectClass}><SelectValue /></SelectTrigger><SelectContent className={jobPostingSelectContentClass}><SelectItem value="entry">Entry</SelectItem><SelectItem value="mid">Mid</SelectItem><SelectItem value="senior">Senior</SelectItem><SelectItem value="executive">Executive</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="wizard-salary-min" className={jobPostingFieldLabelClass}>Pay min</Label><Input id="wizard-salary-min" type="number" min={0} value={state.salaryMin} onChange={(event) => update("salaryMin", event.target.value)} className={jobPostingFieldClass} /></div>
                <div className="space-y-2"><Label htmlFor="wizard-salary-max" className={jobPostingFieldLabelClass}>Pay max</Label><Input id="wizard-salary-max" type="number" min={0} value={state.salaryMax} onChange={(event) => update("salaryMax", event.target.value)} className={jobPostingFieldClass} /></div>
                <div className="space-y-2"><Label className={jobPostingFieldLabelClass}>Pay type</Label><Select value={state.salaryType} onValueChange={(value) => update("salaryType", value as WizardState["salaryType"])}><SelectTrigger className={jobPostingSelectClass}><SelectValue /></SelectTrigger><SelectContent className={jobPostingSelectContentClass}><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="flat">Flat</SelectItem><SelectItem value="salary">Salary</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5"><div><Label className="text-sm text-slate-200">Remote / off-site</Label><p className="text-xs text-slate-500">Advance, marketing, or hybrid roles.</p></div><Switch checked={state.remote} onCheckedChange={(value) => update("remote", value)} /></div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5"><div><Label className="text-sm text-slate-200">Urgent hire</Label><p className="text-xs text-slate-500">Flags the role in review queues.</p></div><Switch checked={state.urgent} onCheckedChange={(value) => update("urgent", value)} /></div>
              </div>
            </div>
          </JobPostingWizardPanel>
        </div>
      ) : null}

      {step === 3 ? (
        <JobPostingWizardPanel title={state.title || "Untitled role"}>
          <div className="flex flex-wrap items-start justify-between gap-3"><Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">{state.numberOfPositions} position{state.numberOfPositions > 1 ? "s" : ""}</Badge><Badge variant="outline" className="capitalize">{state.assignmentScope} assignment</Badge></div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{state.description || "No description provided."}</p>
          <div className="flex flex-wrap gap-2"><span className={jobPostingChipClass}>{state.employmentType.replace("_", " ")}</span><span className={jobPostingChipClass}>{state.experienceLevel}</span>{state.remote ? <span className={jobPostingChipClass}>Remote</span> : null}{state.urgent ? <span className={jobPostingChipClass}>Urgent</span> : null}</div>
          <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
            <JobPostingReviewRow label="Assignment" value={scopeName ?? "Not selected"} />
            <JobPostingReviewRow label="Onboarding" value={selectedTemplate?.name ?? "Not selected — can be added later"} />
            <JobPostingReviewRow label="Department" value={state.department} />
            <JobPostingReviewRow label="Position" value={state.position} />
            <JobPostingReviewRow label="Location" value={state.location} />
            <JobPostingReviewRow label="Start date" value={state.eventDate} />
          </dl>
          {state.assignmentScope === "organization" && options?.organizationSeatAvailable ? <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.07] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Seat access after approval</p><p className="mt-1.5 text-sm text-slate-300">{selectedSeatLabels.length ? selectedSeatLabels.join(", ") : "Work Mode only — no admin areas selected"}</p></div> : null}
          {!state.onboardingTemplateId ? <p className="text-xs text-slate-500">This posting is ready to publish. Onboarding can be attached before or during applicant approval.</p> : <p className="text-xs text-slate-500">Approval will provision the selected roster or organization seat automatically and assign the onboarding packet in Work Mode.</p>}
        </JobPostingWizardPanel>
      ) : null}
    </JobPostingWizardShell>
  )
}
