"use client"

import { useMemo, useState } from "react"
import { Briefcase, Loader2, Save, Send } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { readHiringJson } from "@/lib/api/hiring-client"
import { buildJobPostingEndpoint, buildWorkforceJobPostingPayload } from "@/lib/job-posting/job-posting-adapters"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"

interface AdminJobPostingWizardProps {
  employer: HiringEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (posting: Record<string, unknown>) => void
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
}

const STEPS = [
  { id: 1, label: "Role basics" },
  { id: 2, label: "Details" },
  { id: 3, label: "Review" },
]

export function AdminJobPostingWizard({ employer, open, onOpenChange, onCreated }: AdminJobPostingWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const queryString = useMemo(() => getEmployerQueryString(employer), [employer])
  const canContinueStepOne = state.title.trim().length > 0 && state.description.trim().length > 0
  const canContinue = step === 1 ? canContinueStepOne : true

  function update<Key extends keyof WizardState>(key: Key, value: WizardState[Key]): void {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function resetAndClose(): void {
    setStep(1)
    setState(INITIAL_STATE)
    onOpenChange(false)
  }

  async function submit(status: "draft" | "published"): Promise<void> {
    if (isSubmitting) return
    if (!canContinueStepOne) {
      setStep(1)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await readHiringJson<Record<string, unknown>>(
        buildJobPostingEndpoint("/api/hiring/job-postings", queryString),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildWorkforceJobPostingPayload({ employer, values: state, status })),
        },
        {
          fallbackData: {},
          fallbackErrorMessage: "Unable to create job posting.",
        }
      )

      if (!result.ok) throw new Error(result.error.message)

      toast({
        title: status === "published" ? "Job posting published" : "Draft saved",
        description:
          status === "published"
            ? "Applicants can now find and apply to this role. Add event links or custom fields any time by opening the posting."
            : "Saved as a draft. Open the posting to add event links, custom application fields, or an onboarding template.",
      })

      onCreated?.(result.data ?? {})
      resetAndClose()
    } catch (error) {
      toast({
        title: "Unable to create job posting",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <JobPostingWizardShell
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}
      title="New job posting"
      description={
        <>
          Post a role for {employer.displayName} in seconds. Only a title and description are required; everything else can be added later by opening the posting.
        </>
      }
      icon={<Briefcase className="h-5 w-5 text-cyan-300" />}
      steps={STEPS}
      currentStep={step}
      footer={
        <JobPostingWizardFooter
          step={step}
          totalSteps={STEPS.length}
          canContinue={canContinue}
          isSubmitting={isSubmitting}
          onBack={() => setStep((prev) => prev - 1)}
          onCancel={resetAndClose}
          onNext={() => setStep((prev) => prev + 1)}
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                className={jobPostingOutlineButtonClass}
                onClick={() => submit("draft")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save draft
              </Button>
              <Button
                type="button"
                className={jobPostingPrimaryButtonClass}
                onClick={() => submit("published")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publish
              </Button>
            </>
          }
        />
      }
    >
      {step === 1 ? (
        <JobPostingWizardPanel title="Role basics">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-title" className={jobPostingFieldLabelClass}>
                Job title *
              </Label>
              <Input
                id="wizard-title"
                value={state.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Example: Security Guard - Night Shift"
                className={jobPostingFieldClass}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-description" className={jobPostingFieldLabelClass}>
                Job description *
              </Label>
              <Textarea
                id="wizard-description"
                value={state.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Describe the role, expectations, and who this is best for."
                rows={5}
                className={jobPostingFieldClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wizard-department" className={jobPostingFieldLabelClass}>
                  Department
                </Label>
                <Input
                  id="wizard-department"
                  value={state.department}
                  onChange={(event) => update("department", event.target.value)}
                  placeholder="Security"
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-position" className={jobPostingFieldLabelClass}>
                  Position
                </Label>
                <Input
                  id="wizard-position"
                  value={state.position}
                  onChange={(event) => update("position", event.target.value)}
                  placeholder="Guard"
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-positions" className={jobPostingFieldLabelClass}>
                  Open positions
                </Label>
                <Input
                  id="wizard-positions"
                  type="number"
                  min={1}
                  value={state.numberOfPositions}
                  onChange={(event) => update("numberOfPositions", Math.max(1, Number(event.target.value) || 1))}
                  className={jobPostingFieldClass}
                />
              </div>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 2 ? (
        <JobPostingWizardPanel title="Details">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wizard-location" className={jobPostingFieldLabelClass}>
                  Location
                </Label>
                <Input
                  id="wizard-location"
                  value={state.location}
                  onChange={(event) => update("location", event.target.value)}
                  placeholder="Venue, city, or remote"
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-date" className={jobPostingFieldLabelClass}>
                  Event / start date
                </Label>
                <Input
                  id="wizard-date"
                  type="date"
                  value={state.eventDate}
                  onChange={(event) => update("eventDate", event.target.value)}
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Employment type</Label>
                <Select value={state.employmentType} onValueChange={(value) => update("employmentType", value)}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Experience level</Label>
                <Select value={state.experienceLevel} onValueChange={(value) => update("experienceLevel", value)}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="wizard-salary-min" className={jobPostingFieldLabelClass}>
                  Pay min
                </Label>
                <Input
                  id="wizard-salary-min"
                  type="number"
                  min={0}
                  value={state.salaryMin}
                  onChange={(event) => update("salaryMin", event.target.value)}
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-salary-max" className={jobPostingFieldLabelClass}>
                  Pay max
                </Label>
                <Input
                  id="wizard-salary-max"
                  type="number"
                  min={0}
                  value={state.salaryMax}
                  onChange={(event) => update("salaryMax", event.target.value)}
                  className={jobPostingFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Pay type</Label>
                <Select value={state.salaryType} onValueChange={(value) => update("salaryType", value as WizardState["salaryType"])}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <div>
                  <Label className="text-sm text-slate-200">Remote / off-site</Label>
                  <p className="text-xs text-slate-500">Advance, marketing, or hybrid roles.</p>
                </div>
                <Switch checked={state.remote} onCheckedChange={(value) => update("remote", value)} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <div>
                  <Label className="text-sm text-slate-200">Urgent hire</Label>
                  <p className="text-xs text-slate-500">Flags the role in review queues.</p>
                </div>
                <Switch checked={state.urgent} onCheckedChange={(value) => update("urgent", value)} />
              </div>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 3 ? (
        <JobPostingWizardPanel title={state.title || "Untitled role"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">
              {state.numberOfPositions} position{state.numberOfPositions > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">
            {state.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={jobPostingChipClass}>{state.employmentType.replace("_", " ")}</span>
            <span className={jobPostingChipClass}>{state.experienceLevel}</span>
            {state.remote ? <span className={jobPostingChipClass}>Remote</span> : null}
            {state.urgent ? <span className={jobPostingChipClass}>Urgent</span> : null}
          </div>
          <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
            <JobPostingReviewRow label="Department" value={state.department} />
            <JobPostingReviewRow label="Position" value={state.position} />
            <JobPostingReviewRow label="Location" value={state.location} />
            <JobPostingReviewRow label="Date" value={state.eventDate} />
            <JobPostingReviewRow label="Employment" value={state.employmentType.replace("_", " ")} />
            <JobPostingReviewRow label="Experience" value={state.experienceLevel} />
          </dl>
          <p className="text-xs text-slate-500">
            Attach this posting to an event or tour, add custom application questions, or pick an onboarding template after it is created.
          </p>
        </JobPostingWizardPanel>
      ) : null}
    </JobPostingWizardShell>
  )
}
