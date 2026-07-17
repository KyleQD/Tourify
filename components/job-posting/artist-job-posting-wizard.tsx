"use client"

import { useEffect, useState } from "react"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  EXPERIENCE_LEVEL_OPTIONS,
  JOB_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  type CreateJobFormData,
} from "@/types/artist-jobs"

export interface ArtistJobPostingCategoryOption {
  id: string
  name: string
}

interface ArtistJobPostingWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  categories: ArtistJobPostingCategoryOption[]
  initialValues?: Partial<CreateJobFormData>
  submitLabel?: string
  isSubmitting?: boolean
  onSubmit: (values: CreateJobFormData) => Promise<void>
}

const STEPS = [
  { id: 1, label: "Basic info" },
  { id: 2, label: "Details" },
  { id: 3, label: "Requirements" },
  { id: 4, label: "Review" },
]

const commonGenres = [
  "Rock",
  "Pop",
  "Hip-Hop",
  "Jazz",
  "Blues",
  "Country",
  "Electronic",
  "Folk",
  "Classical",
  "R&B",
  "Soul",
  "Funk",
  "Reggae",
  "Punk",
  "Metal",
  "Indie",
  "Alternative",
]

const commonSkills = [
  "Live Performance",
  "Studio Recording",
  "Songwriting",
  "Music Production",
  "Mixing",
  "Mastering",
  "Sound Engineering",
  "Stage Management",
  "Lighting",
  "Photography",
  "Video Production",
  "Marketing",
]

const commonEquipment = [
  "Microphones",
  "Guitars",
  "Amplifiers",
  "Keyboards",
  "Drum Kit",
  "PA System",
  "Mixing Board",
  "Monitors",
  "Cables",
  "Lighting Equipment",
  "Video Equipment",
  "Transportation",
]

const commonBenefits = [
  "Networking Opportunities",
  "Performance Experience",
  "Studio Access",
  "Equipment Provided",
  "Meals Included",
  "Transportation",
  "Accommodation",
  "Professional Development",
  "Industry Connections",
  "Portfolio Building",
  "Future Opportunities",
  "Credit/Recognition",
]

function buildInitialValues(initialValues?: Partial<CreateJobFormData>): CreateJobFormData {
  return {
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    category_id: initialValues?.category_id ?? "",
    job_type: initialValues?.job_type ?? "one_time",
    payment_type: initialValues?.payment_type ?? "paid",
    payment_amount: initialValues?.payment_amount,
    payment_currency: initialValues?.payment_currency ?? "USD",
    payment_description: initialValues?.payment_description ?? "",
    location: initialValues?.location ?? "",
    location_type: initialValues?.location_type ?? "in_person",
    city: initialValues?.city ?? "",
    state: initialValues?.state ?? "",
    country: initialValues?.country ?? "",
    event_date: initialValues?.event_date ?? "",
    event_time: initialValues?.event_time ?? "",
    duration_hours: initialValues?.duration_hours,
    deadline: initialValues?.deadline ?? "",
    required_skills: initialValues?.required_skills ?? [],
    required_equipment: initialValues?.required_equipment ?? [],
    required_experience: initialValues?.required_experience ?? "intermediate",
    required_genres: initialValues?.required_genres ?? [],
    age_requirement: initialValues?.age_requirement ?? "",
    benefits: initialValues?.benefits ?? [],
    special_requirements: initialValues?.special_requirements ?? "",
    contact_email: initialValues?.contact_email ?? "",
    contact_phone: initialValues?.contact_phone ?? "",
    external_link: initialValues?.external_link ?? "",
    priority: initialValues?.priority ?? "normal",
    featured: initialValues?.featured ?? false,
    status: initialValues?.status ?? "open",
  }
}

function addUnique(value: string, list: string[]) {
  const trimmed = value.trim()
  if (!trimmed || list.includes(trimmed)) return list
  return [...list, trimmed]
}

export function ArtistJobPostingWizard({
  open,
  onOpenChange,
  title = "Post a job",
  description = "Create a public opportunity without changing the existing job-board workflow.",
  categories,
  initialValues,
  submitLabel = "Post job",
  isSubmitting = false,
  onSubmit,
}: ArtistJobPostingWizardProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<CreateJobFormData>(() => buildInitialValues(initialValues))
  const [skillInput, setSkillInput] = useState("")
  const [equipmentInput, setEquipmentInput] = useState("")
  const [genreInput, setGenreInput] = useState("")
  const [benefitInput, setBenefitInput] = useState("")

  useEffect(() => {
    if (!open) return
    setFormData((prev) => {
      if (prev.category_id && categories.some((category) => category.id === prev.category_id)) return prev
      const firstCategory = categories[0]?.id
      return firstCategory ? { ...prev, category_id: firstCategory } : prev
    })
  }, [categories, open])

  function resetAndClose() {
    if (isSubmitting) return
    setFormData(buildInitialValues(initialValues))
    setSkillInput("")
    setEquipmentInput("")
    setGenreInput("")
    setBenefitInput("")
    setStep(1)
    onOpenChange(false)
  }

  function update<Key extends keyof CreateJobFormData>(key: Key, value: CreateJobFormData[Key]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function canProceed(currentStep: number) {
    if (currentStep === 1) {
      return Boolean(
        formData.title?.trim() &&
          formData.description?.trim() &&
          formData.category_id &&
          categories.some((category) => category.id === formData.category_id)
      )
    }
    if (currentStep === 2) return Boolean(formData.job_type && formData.payment_type)
    return true
  }

  async function submit() {
    if (!canProceed(1)) {
      setStep(1)
      return
    }

    try {
      await onSubmit(formData)
      setFormData(buildInitialValues(initialValues))
      setSkillInput("")
      setEquipmentInput("")
      setGenreInput("")
      setBenefitInput("")
      setStep(1)
    } catch {
      // Submission surfaces own toast/error state and keeps entered values intact.
    }
  }

  const selectedCategory = categories.find((category) => category.id === formData.category_id)?.name

  return (
    <JobPostingWizardShell
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}
      title={title}
      description={description}
      icon={<Briefcase className="h-5 w-5 text-cyan-300" />}
      steps={STEPS}
      currentStep={step}
      footer={
        <JobPostingWizardFooter
          step={step}
          totalSteps={STEPS.length}
          canContinue={canProceed(step)}
          isSubmitting={isSubmitting}
          onBack={() => setStep((prev) => prev - 1)}
          onCancel={resetAndClose}
          onNext={() => setStep((prev) => prev + 1)}
          actions={
            <Button type="button" className={jobPostingPrimaryButtonClass} onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {submitLabel}
            </Button>
          }
        />
      }
    >
      {step === 1 ? (
        <JobPostingWizardPanel title="Basic information">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Job title *</Label>
              <Input
                placeholder="e.g., Lead Guitarist Needed for Rock Band"
                value={formData.title}
                onChange={(event) => update("title", event.target.value)}
                className={jobPostingFieldClass}
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => update("category_id", value)}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Job type *</Label>
                <Select value={formData.job_type} onValueChange={(value) => update("job_type", value as CreateJobFormData["job_type"])}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {JOB_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Description *</Label>
              <Textarea
                placeholder="Describe the position, requirements, and what you're looking for..."
                value={formData.description}
                onChange={(event) => update("description", event.target.value)}
                rows={5}
                className={jobPostingFieldClass}
              />
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 2 ? (
        <JobPostingWizardPanel title="Job details">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Payment type *</Label>
                <Select value={formData.payment_type} onValueChange={(value) => update("payment_type", value as CreateJobFormData["payment_type"])}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {PAYMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Payment amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.payment_amount ?? ""}
                  onChange={(event) => update("payment_amount", event.target.value ? Number(event.target.value) : undefined)}
                  className={jobPostingFieldClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Payment description</Label>
              <Input
                placeholder="e.g., Flat rate plus meals"
                value={formData.payment_description ?? ""}
                onChange={(event) => update("payment_description", event.target.value)}
                className={jobPostingFieldClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Location type</Label>
                <Select value={formData.location_type} onValueChange={(value) => update("location_type", value as CreateJobFormData["location_type"])}>
                  <SelectTrigger className={jobPostingSelectClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={jobPostingSelectContentClass}>
                    {LOCATION_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value || "unset"} value={option.value || "in_person"}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Location</Label>
                <Input value={formData.location ?? ""} onChange={(event) => update("location", event.target.value)} placeholder="City, venue, or remote" className={jobPostingFieldClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input value={formData.city ?? ""} onChange={(event) => update("city", event.target.value)} placeholder="City" className={jobPostingFieldClass} />
              <Input value={formData.state ?? ""} onChange={(event) => update("state", event.target.value)} placeholder="State" className={jobPostingFieldClass} />
              <Input value={formData.country ?? ""} onChange={(event) => update("country", event.target.value)} placeholder="Country" className={jobPostingFieldClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Event date</Label>
                <Input type="date" value={formData.event_date ?? ""} onChange={(event) => update("event_date", event.target.value)} className={jobPostingFieldClass} />
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Event time</Label>
                <Input type="time" value={formData.event_time ?? ""} onChange={(event) => update("event_time", event.target.value)} className={jobPostingFieldClass} />
              </div>
              <div className="space-y-2">
                <Label className={jobPostingFieldLabelClass}>Deadline</Label>
                <Input type="date" value={formData.deadline ?? ""} onChange={(event) => update("deadline", event.target.value)} className={jobPostingFieldClass} />
              </div>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 3 ? (
        <JobPostingWizardPanel title="Requirements">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={jobPostingFieldLabelClass}>Experience level</Label>
              <Select value={formData.required_experience} onValueChange={(value) => update("required_experience", value as CreateJobFormData["required_experience"])}>
                <SelectTrigger className={jobPostingSelectClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={jobPostingSelectContentClass}>
                  {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value || "unset"} value={option.value || "intermediate"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ChipPicker title="Skills" input={skillInput} setInput={setSkillInput} options={commonSkills} values={formData.required_skills ?? []} onChange={(values) => update("required_skills", values)} />
            <ChipPicker title="Equipment" input={equipmentInput} setInput={setEquipmentInput} options={commonEquipment} values={formData.required_equipment ?? []} onChange={(values) => update("required_equipment", values)} />
            <ChipPicker title="Genres" input={genreInput} setInput={setGenreInput} options={commonGenres} values={formData.required_genres ?? []} onChange={(values) => update("required_genres", values)} />
            <ChipPicker title="Benefits" input={benefitInput} setInput={setBenefitInput} options={commonBenefits} values={formData.benefits ?? []} onChange={(values) => update("benefits", values)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input value={formData.age_requirement ?? ""} onChange={(event) => update("age_requirement", event.target.value)} placeholder="Age requirement" className={jobPostingFieldClass} />
              <Input value={formData.external_link ?? ""} onChange={(event) => update("external_link", event.target.value)} placeholder="External link" className={jobPostingFieldClass} />
              <Input value={formData.contact_email ?? ""} onChange={(event) => update("contact_email", event.target.value)} placeholder="Contact email" className={jobPostingFieldClass} />
              <Input value={formData.contact_phone ?? ""} onChange={(event) => update("contact_phone", event.target.value)} placeholder="Contact phone" className={jobPostingFieldClass} />
            </div>
            <Textarea value={formData.special_requirements ?? ""} onChange={(event) => update("special_requirements", event.target.value)} placeholder="Special requirements" rows={3} className={jobPostingFieldClass} />
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <Checkbox checked={Boolean(formData.featured)} onCheckedChange={(checked) => update("featured", checked === true)} />
              <Label className="text-sm text-slate-200">Feature this job</Label>
            </div>
          </div>
        </JobPostingWizardPanel>
      ) : null}

      {step === 4 ? (
        <JobPostingWizardPanel title={formData.title || "Untitled job"}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{formData.description || "No description provided."}</p>
          <div className="flex flex-wrap gap-2">
            <span className={jobPostingChipClass}>{selectedCategory}</span>
            <span className={jobPostingChipClass}>{formData.job_type?.replace("_", " ")}</span>
            <span className={jobPostingChipClass}>{formData.payment_type?.replace("_", " ")}</span>
            {formData.featured ? <span className={jobPostingChipClass}>Featured</span> : null}
          </div>
          <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
            <JobPostingReviewRow label="Location" value={formData.location} />
            <JobPostingReviewRow label="Date" value={formData.event_date} />
            <JobPostingReviewRow label="Experience" value={formData.required_experience} />
            <JobPostingReviewRow label="Skills" value={(formData.required_skills ?? []).join(", ")} />
            <JobPostingReviewRow label="Equipment" value={(formData.required_equipment ?? []).join(", ")} />
            <JobPostingReviewRow label="Benefits" value={(formData.benefits ?? []).join(", ")} />
          </dl>
        </JobPostingWizardPanel>
      ) : null}
    </JobPostingWizardShell>
  )
}

function ChipPicker({
  title,
  input,
  setInput,
  options,
  values,
  onChange,
}: {
  title: string
  input: string
  setInput: (value: string) => void
  options: string[]
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <div className="space-y-2">
      <Label className={jobPostingFieldLabelClass}>{title}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={`Add ${title.toLowerCase()}`} className={jobPostingFieldClass} />
        <Button
          type="button"
          variant="outline"
          className={jobPostingOutlineButtonClass}
          onClick={() => {
            onChange(addUnique(input, values))
            setInput("")
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.slice(0, 10).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant="outline"
            className={jobPostingOutlineButtonClass}
            onClick={() => onChange(addUnique(option, values))}
          >
            {option}
          </Button>
        ))}
      </div>
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className={jobPostingChipClass}>
              {value}
              <button type="button" className="ml-2 text-slate-500 hover:text-white" onClick={() => onChange(values.filter((current) => current !== value))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
