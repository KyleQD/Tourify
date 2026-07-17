"use client"

import { useState } from "react"
import { Briefcase, Loader2, Plus, Send, X } from "lucide-react"

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
import { useToast } from "@/components/ui/use-toast"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { buildVenueJobPostingPayload } from "@/lib/job-posting/job-posting-adapters"

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated?: (job: Record<string, unknown>) => void
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contractor", label: "Contractor" },
  { value: "volunteer", label: "Volunteer" },
]

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
]

const DEPARTMENTS = [
  "Security",
  "Bar Staff",
  "Sound & Lighting",
  "Stage Crew",
  "Front of House",
  "Kitchen",
  "Management",
  "Marketing",
  "Box Office",
  "Maintenance",
  "Other",
]

const STEPS = [
  { id: 1, label: "Role basics" },
  { id: 2, label: "Requirements" },
  { id: 3, label: "Review" },
]

function addUnique(value: string, list: string[]) {
  const trimmed = value.trim()
  if (!trimmed || list.includes(trimmed)) return list
  return [...list, trimmed]
}

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  const { venue } = useCurrentVenue()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)

  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [description, setDescription] = useState("")
  const [employmentType, setEmploymentType] = useState("contractor")
  const [experienceLevel, setExperienceLevel] = useState("entry")
  const [location, setLocation] = useState("")
  const [numberOfPositions, setNumberOfPositions] = useState(1)
  const [isRemote, setIsRemote] = useState(false)
  const [isUrgent, setIsUrgent] = useState(false)
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [salaryType, setSalaryType] = useState<"flat" | "hourly" | "salary">("flat")

  const [requirements, setRequirements] = useState<string[]>([])
  const [responsibilities, setResponsibilities] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [reqInput, setReqInput] = useState("")
  const [respInput, setRespInput] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [benefitInput, setBenefitInput] = useState("")

  const canProceedStep1 = title.trim().length > 0 && department.length > 0 && description.trim().length > 0

  function resetForm() {
    setTitle("")
    setDepartment("")
    setDescription("")
    setEmploymentType("contractor")
    setExperienceLevel("entry")
    setLocation("")
    setNumberOfPositions(1)
    setIsRemote(false)
    setIsUrgent(false)
    setSalaryMin("")
    setSalaryMax("")
    setSalaryType("flat")
    setRequirements([])
    setResponsibilities([])
    setSkills([])
    setBenefits([])
    setReqInput("")
    setRespInput("")
    setSkillInput("")
    setBenefitInput("")
    setStep(1)
  }

  function resetAndClose() {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  async function handleSubmit() {
    if (!venue?.id) {
      toast({ title: "No venue selected", description: "Please select a venue first.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/venue/hiring/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          buildVenueJobPostingPayload({
            venue,
            values: {
              title,
              description,
              department,
              employmentType,
              experienceLevel,
              location,
              numberOfPositions,
              remote: isRemote,
              urgent: isUrgent,
              salaryMin,
              salaryMax,
              salaryType,
              requirements,
              responsibilities,
              skills,
              benefits,
            },
          })
        ),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create job posting")
      }

      toast({ title: "Job posted", description: `"${title}" is now live on the job board.` })
      onJobCreated?.(data.data)
      resetForm()
      onClose()
    } catch (error) {
      toast({
        title: "Failed to create job",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <JobPostingWizardShell
      open={isOpen}
      onOpenChange={(next) => (next ? undefined : resetAndClose())}
      title="Create job posting"
      description="Post a venue staffing role while keeping the same venue hiring workflow and applicant intake."
      icon={<Briefcase className="h-5 w-5 text-cyan-300" />}
      steps={STEPS}
      currentStep={step}
      className="sm:max-w-3xl"
      footer={
        <JobPostingWizardFooter
          step={step}
          totalSteps={STEPS.length}
          canContinue={step === 1 ? canProceedStep1 : true}
          isSubmitting={isSubmitting}
          onBack={() => setStep((prev) => prev - 1)}
          onCancel={resetAndClose}
          onNext={() => setStep((prev) => prev + 1)}
          actions={
            <Button type="button" className={jobPostingPrimaryButtonClass} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          }
        />
      }
    >
      {step === 1 ? (
        <JobPostingWizardPanel title="Role basics">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Job title *</Label>
              <Input placeholder="e.g., Head of Security, Lead Bartender" value={title} onChange={(event) => setTitle(event.target.value)} className={jobPostingFieldClass} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Department *</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {DEPARTMENTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Employment type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {EMPLOYMENT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Description *</Label>
              <Textarea placeholder="Describe the role, what the person will be doing, and what success looks like..." value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className={jobPostingFieldClass} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Experience level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {EXPERIENCE_LEVELS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Positions available</Label>
                <Input type="number" min={1} value={numberOfPositions} onChange={(event) => setNumberOfPositions(Number(event.target.value) || 1)} className={jobPostingFieldClass} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Location</Label>
              <Input placeholder={venue?.name || "Venue location"} value={location} onChange={(event) => setLocation(event.target.value)} className={jobPostingFieldClass} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <Label className="text-sm text-slate-200">Remote available</Label>
                <Switch checked={isRemote} onCheckedChange={setIsRemote} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <Label className="text-sm text-slate-200">Urgent hire</Label>
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
              </div>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 2 ? (
        <JobPostingWizardPanel title="Requirements & compensation">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input type="number" placeholder="Min" value={salaryMin} onChange={(event) => setSalaryMin(event.target.value)} className={jobPostingFieldClass} />
              <Input type="number" placeholder="Max" value={salaryMax} onChange={(event) => setSalaryMax(event.target.value)} className={jobPostingFieldClass} />
              <Select value={salaryType} onValueChange={(value) => setSalaryType(value as typeof salaryType)}>
                <SelectTrigger className={jobPostingSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={jobPostingSelectContentClass}>
                  <SelectItem value="flat">Fixed</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ListEditor title="Requirements" value={reqInput} setValue={setReqInput} list={requirements} setList={setRequirements} placeholder="Add requirement" />
            <ListEditor title="Responsibilities" value={respInput} setValue={setRespInput} list={responsibilities} setList={setResponsibilities} placeholder="Add responsibility" />
            <ListEditor title="Skills" value={skillInput} setValue={setSkillInput} list={skills} setList={setSkills} placeholder="Add skill" />
            <ListEditor title="Benefits" value={benefitInput} setValue={setBenefitInput} list={benefits} setList={setBenefits} placeholder="Add benefit" />
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 3 ? (
        <JobPostingWizardPanel title={title || "Untitled role"}>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">
              {numberOfPositions} position{numberOfPositions > 1 ? "s" : ""}
            </Badge>
            <span className={jobPostingChipClass}>{employmentType.replace("_", " ")}</span>
            <span className={jobPostingChipClass}>{experienceLevel}</span>
            {isRemote ? <span className={jobPostingChipClass}>Remote</span> : null}
            {isUrgent ? <span className={jobPostingChipClass}>Urgent</span> : null}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{description}</p>
          <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
            <JobPostingReviewRow label="Department" value={department} />
            <JobPostingReviewRow label="Location" value={location || venue?.name} />
            <JobPostingReviewRow label="Requirements" value={requirements.length ? requirements.join(", ") : undefined} />
            <JobPostingReviewRow label="Skills" value={skills.length ? skills.join(", ") : undefined} />
          </dl>
        </JobPostingWizardPanel>
      ) : null}
    </JobPostingWizardShell>
  )
}

function ListEditor({
  title,
  value,
  setValue,
  list,
  setList,
  placeholder,
}: {
  title: string
  value: string
  setValue: (value: string) => void
  list: string[]
  setList: (value: string[]) => void
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      <Label className={jobPostingFieldLabelClass}>{title}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className={jobPostingFieldClass} />
        <Button
          type="button"
          variant="outline"
          className={jobPostingOutlineButtonClass}
          onClick={() => {
            setList(addUnique(value, list))
            setValue("")
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {list.length ? (
        <div className="flex flex-wrap gap-2">
          {list.map((item) => (
            <span key={item} className={jobPostingChipClass}>
              {item}
              <button type="button" className="ml-2 text-slate-500 hover:text-white" onClick={() => setList(list.filter((current) => current !== item))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
