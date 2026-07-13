"use client"

import { useMemo, useState } from "react"
import { Briefcase, Check, Loader2, Save, Send } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import { getDefaultApplicationFields } from "@/lib/hiring/job-posting-builder-schema"
import { cn } from "@/lib/utils"
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
  salaryType: string
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
] as const

const fieldLabel = "text-xs font-medium uppercase tracking-wide text-slate-400"
const glassEntry =
  "rounded-xl border-white/15 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
const glassSelect =
  "rounded-xl border-white/15 bg-slate-950/60 text-slate-100 focus:ring-cyan-500/20"
const glassSelectContent = "border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl"
const outlineBtn =
  "rounded-xl border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
const primaryBtn =
  "rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-300 hover:to-cyan-400"
const softChip =
  "inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300"

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string }
    return payload.error?.message ?? payload.message ?? `Request failed with ${response.status}`
  } catch {
    return `Request failed with ${response.status}`
  }
}

export function AdminJobPostingWizard({ employer, open, onOpenChange, onCreated }: AdminJobPostingWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const queryString = useMemo(() => getEmployerQueryString(employer), [employer])

  const canContinueStepOne = state.title.trim().length > 0 && state.description.trim().length > 0

  function update<Key extends keyof WizardState>(key: Key, value: WizardState[Key]): void {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function resetAndClose(): void {
    setStep(1)
    setState(INITIAL_STATE)
    onOpenChange(false)
  }

  function buildPayload(status: "draft" | "published") {
    const hasSalary = state.salaryMin.trim().length > 0 || state.salaryMax.trim().length > 0

    return {
      entity_type: employer.entityType,
      entity_id: employer.entityId,
      employer_entity_type: employer.entityType,
      employer_entity_id: employer.entityId,
      title: state.title.trim(),
      description: state.description.trim(),
      department: state.department.trim() || undefined,
      position: state.position.trim() || undefined,
      employment_type: state.employmentType,
      location: state.location.trim() || undefined,
      number_of_positions: Number.isFinite(state.numberOfPositions) ? state.numberOfPositions : 1,
      experience_level: state.experienceLevel,
      event_date: state.eventDate ? new Date(state.eventDate).toISOString() : null,
      salary_range: hasSalary
        ? {
            min: state.salaryMin ? Number(state.salaryMin) : null,
            max: state.salaryMax ? Number(state.salaryMax) : null,
            type: state.salaryType,
          }
        : null,
      remote: state.remote,
      urgent: state.urgent,
      application_form_template: { fields: getDefaultApplicationFields() },
      status,
    }
  }

  async function submit(status: "draft" | "published"): Promise<void> {
    if (isSubmitting) return
    if (!canContinueStepOne) {
      setStep(1)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/hiring/job-postings?${queryString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(status)),
      })

      if (!response.ok) throw new Error(await readApiError(response))

      const payload = (await response.json()) as { data?: Record<string, unknown> }

      toast({
        title: status === "published" ? "Job posting published" : "Draft saved",
        description:
          status === "published"
            ? "Applicants can now find and apply to this role. Add event links or custom fields any time by opening the posting."
            : "Saved as a draft. Open the posting to add event links, custom application fields, or an onboarding template.",
      })

      onCreated?.(payload.data ?? {})
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
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 p-0 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:max-w-2xl sm:rounded-2xl"
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />

        <div className="space-y-5 p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-purple-500/20 to-fuchsia-400/20 ring-1 ring-white/10">
                <Briefcase className="h-5 w-5 text-cyan-300" />
              </div>
              New job posting
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Post a role for {employer.displayName} in seconds. Only a title and description are required &mdash;
              everything else can be added later by opening the posting.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1 py-1">
            {STEPS.map((wizardStep, index) => {
              const isActive = wizardStep.id === step
              const isDone = wizardStep.id < step
              return (
                <div key={wizardStep.id} className="flex flex-1 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                        isActive &&
                          "bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/25",
                        isDone && "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30",
                        !isActive && !isDone && "bg-white/5 text-slate-500 ring-1 ring-white/10"
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : wizardStep.id}
                    </div>
                    <span
                      className={cn(
                        "hidden text-xs sm:inline",
                        isActive ? "font-medium text-white" : "text-slate-500"
                      )}
                    >
                      {wizardStep.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div
                      className={cn(
                        "mx-1 h-px flex-1",
                        isDone
                          ? "bg-gradient-to-r from-cyan-400/50 to-purple-500/30"
                          : "bg-white/10"
                      )}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-title" className={fieldLabel}>
                  Job title *
                </Label>
                <Input
                  id="wizard-title"
                  value={state.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Example: Security Guard - Night Shift"
                  className={glassEntry}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-description" className={fieldLabel}>
                  Job description *
                </Label>
                <Textarea
                  id="wizard-description"
                  value={state.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Describe the role, expectations, and who this is best for."
                  rows={5}
                  className={glassEntry}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="wizard-department" className={fieldLabel}>
                    Department
                  </Label>
                  <Input
                    id="wizard-department"
                    value={state.department}
                    onChange={(event) => update("department", event.target.value)}
                    placeholder="Security"
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-position" className={fieldLabel}>
                    Position
                  </Label>
                  <Input
                    id="wizard-position"
                    value={state.position}
                    onChange={(event) => update("position", event.target.value)}
                    placeholder="Guard"
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-positions" className={fieldLabel}>
                    Open positions
                  </Label>
                  <Input
                    id="wizard-positions"
                    type="number"
                    min={1}
                    value={state.numberOfPositions}
                    onChange={(event) => update("numberOfPositions", Math.max(1, Number(event.target.value) || 1))}
                    className={glassEntry}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wizard-location" className={fieldLabel}>
                    Location
                  </Label>
                  <Input
                    id="wizard-location"
                    value={state.location}
                    onChange={(event) => update("location", event.target.value)}
                    placeholder="Venue, city, or remote"
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-date" className={fieldLabel}>
                    Event / start date
                  </Label>
                  <Input
                    id="wizard-date"
                    type="date"
                    value={state.eventDate}
                    onChange={(event) => update("eventDate", event.target.value)}
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={fieldLabel}>Employment type</Label>
                  <Select value={state.employmentType} onValueChange={(value) => update("employmentType", value)}>
                    <SelectTrigger className={glassSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={glassSelectContent}>
                      <SelectItem value="full_time">Full time</SelectItem>
                      <SelectItem value="part_time">Part time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={fieldLabel}>Experience level</Label>
                  <Select value={state.experienceLevel} onValueChange={(value) => update("experienceLevel", value)}>
                    <SelectTrigger className={glassSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={glassSelectContent}>
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
                  <Label htmlFor="wizard-salary-min" className={fieldLabel}>
                    Pay min
                  </Label>
                  <Input
                    id="wizard-salary-min"
                    type="number"
                    min={0}
                    value={state.salaryMin}
                    onChange={(event) => update("salaryMin", event.target.value)}
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-salary-max" className={fieldLabel}>
                    Pay max
                  </Label>
                  <Input
                    id="wizard-salary-max"
                    type="number"
                    min={0}
                    value={state.salaryMax}
                    onChange={(event) => update("salaryMax", event.target.value)}
                    className={glassEntry}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={fieldLabel}>Pay type</Label>
                  <Select value={state.salaryType} onValueChange={(value) => update("salaryType", value)}>
                    <SelectTrigger className={glassSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={glassSelectContent}>
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
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{state.title || "Untitled role"}</h3>
                  <Badge
                    variant="outline"
                    className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200"
                  >
                    {state.numberOfPositions} position{state.numberOfPositions > 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                  {state.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={softChip}>{state.employmentType.replace("_", " ")}</span>
                  <span className={softChip}>{state.experienceLevel}</span>
                  {state.remote ? (
                    <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                      Remote
                    </span>
                  ) : null}
                  {state.urgent ? (
                    <span className="inline-flex items-center rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs text-red-300">
                      Urgent
                    </span>
                  ) : null}
                </div>

                <dl className="mt-5 grid gap-2.5 text-sm sm:grid-cols-2">
                  <ReviewRow label="Department" value={state.department} />
                  <ReviewRow label="Position" value={state.position} />
                  <ReviewRow label="Location" value={state.location} />
                  <ReviewRow label="Date" value={state.eventDate} />
                  <ReviewRow label="Employment" value={state.employmentType.replace("_", " ")} />
                  <ReviewRow label="Experience" value={state.experienceLevel} />
                </dl>
              </div>
              <p className="text-xs text-slate-500">
                Attach this posting to an event or tour, add custom application questions, or pick an onboarding
                template after it is created &mdash; just open the posting from the Jobs list.
              </p>
            </div>
          ) : null}

          <DialogFooter className="flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={outlineBtn}
                  onClick={() => setStep((prev) => prev - 1)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              {step < 3 ? (
                <Button
                  type="button"
                  className={primaryBtn}
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={step === 1 && !canContinueStepOne}
                >
                  Continue
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className={outlineBtn}
                    onClick={() => submit("draft")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save draft
                  </Button>
                  <Button
                    type="button"
                    className={primaryBtn}
                    onClick={() => submit("published")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Publish
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value?.trim() ? value : "—"}</dd>
    </div>
  )
}
