"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Briefcase, MapPin, DollarSign, Users, Plus, X, Loader2, CheckCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated?: (job: any) => void
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
  "Security", "Bar Staff", "Sound & Lighting", "Stage Crew",
  "Front of House", "Kitchen", "Management", "Marketing",
  "Box Office", "Maintenance", "Other",
]

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
  const [salaryType, setSalaryType] = useState("fixed")

  const [requirements, setRequirements] = useState<string[]>([])
  const [responsibilities, setResponsibilities] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [reqInput, setReqInput] = useState("")
  const [respInput, setRespInput] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [benefitInput, setBenefitInput] = useState("")

  function resetForm() {
    setTitle(""); setDepartment(""); setDescription("")
    setEmploymentType("contractor"); setExperienceLevel("entry")
    setLocation(""); setNumberOfPositions(1)
    setIsRemote(false); setIsUrgent(false)
    setSalaryMin(""); setSalaryMax(""); setSalaryType("fixed")
    setRequirements([]); setResponsibilities([]); setSkills([]); setBenefits([])
    setReqInput(""); setRespInput(""); setSkillInput(""); setBenefitInput("")
    setStep(1)
  }

  function addToList(list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) {
    const trimmed = value.trim()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
    }
    setInput("")
  }

  const canProceedStep1 = title.trim() && department && description.trim()

  async function handleSubmit() {
    if (!venue?.id) {
      toast({ title: "No venue selected", description: "Please select a venue first.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        venue_id: venue.id,
        title: title.trim(),
        department,
        description: description.trim(),
        employment_type: employmentType,
        experience_level: experienceLevel,
        location: location.trim() || venue.name || "Venue",
        number_of_positions: numberOfPositions,
        remote: isRemote,
        urgent: isUrgent,
        salary_range: salaryMin || salaryMax ? {
          min: Number(salaryMin) || 0,
          max: Number(salaryMax) || Number(salaryMin) || 0,
          type: salaryType,
        } : undefined,
        requirements,
        responsibilities,
        skills,
        benefits,
        status: "published",
      }

      const res = await fetch("/api/admin/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        const fallbackRes = await fetch("/api/admin/staffing/job-postings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        })
        const fallbackData = await fallbackRes.json()

        if (!fallbackRes.ok && !fallbackData.ok) {
          throw new Error(data.error || fallbackData.error || "Failed to create job posting")
        }

        toast({ title: "Job posted", description: `"${title}" is now live on the job board.` })
        onJobCreated?.(fallbackData.data || fallbackData)
        resetForm()
        onClose()
        return
      }

      toast({ title: "Job posted", description: `"${title}" is now live on the job board.` })
      onJobCreated?.(data.data)
      resetForm()
      onClose()
    } catch (error) {
      console.error("Error creating job:", error)
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
    <Dialog open={isOpen} onOpenChange={() => { if (!isSubmitting) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Briefcase className="h-5 w-5 text-purple-400" />
            {step === 1 ? "Create Job Posting" : "Requirements & Compensation"}
          </DialogTitle>
          <div className="flex gap-2 mt-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-purple-500" : "bg-gray-700"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-purple-500" : "bg-gray-700"}`} />
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Job Title *</Label>
              <Input placeholder="e.g., Head of Security, Lead Bartender" value={title} onChange={e => setTitle(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Department *</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Employment Type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description *</Label>
              <Textarea placeholder="Describe the role, what the person will be doing, and what success looks like..." value={description} onChange={e => setDescription(e.target.value)} rows={4} className="bg-gray-800 border-gray-700 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Experience Level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Positions Available</Label>
                <Input type="number" min={1} value={numberOfPositions} onChange={e => setNumberOfPositions(Number(e.target.value) || 1)} className="bg-gray-800 border-gray-700" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Location</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <Input placeholder={venue?.name || "Venue location"} value={location} onChange={e => setLocation(e.target.value)} className="bg-gray-800 border-gray-700" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isRemote} onCheckedChange={setIsRemote} />
                <Label className="text-gray-300 text-sm">Remote available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
                <Label className="text-gray-300 text-sm">Urgent hire</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-gray-700" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="bg-purple-600 hover:bg-purple-700">Next</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-300">Compensation</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input type="number" placeholder="Min" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <Input type="number" placeholder="Max" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} className="bg-gray-800 border-gray-700" />
                </div>
                <Select value={salaryType} onValueChange={setSalaryType}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-gray-800" />

            {[
              { label: "Requirements", items: requirements, setItems: setRequirements, input: reqInput, setInput: setReqInput, placeholder: "e.g., 2+ years experience in live events" },
              { label: "Responsibilities", items: responsibilities, setItems: setResponsibilities, input: respInput, setInput: setRespInput, placeholder: "e.g., Manage front-of-house operations" },
              { label: "Skills", items: skills, setItems: setSkills, input: skillInput, setInput: setSkillInput, placeholder: "e.g., Crowd management" },
              { label: "Benefits", items: benefits, setItems: setBenefits, input: benefitInput, setInput: setBenefitInput, placeholder: "e.g., Meals provided" },
            ].map(({ label, items, setItems, input, setInput, placeholder }) => (
              <div key={label} className="space-y-2">
                <Label className="text-gray-300">{label}</Label>
                <div className="flex gap-2">
                  <Input placeholder={placeholder} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToList(items, setItems, input, setInput) } }}
                    className="bg-gray-800 border-gray-700" />
                  <Button type="button" size="sm" variant="outline" className="border-gray-700 shrink-0"
                    onClick={() => addToList(items, setItems, input, setInput)} disabled={!input.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {items.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300 pr-1">
                        {item}
                        <X className="h-3 w-3 ml-1 cursor-pointer hover:text-red-400" onClick={() => setItems(items.filter((_, idx) => idx !== i))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" className="border-gray-700" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" className="border-gray-700" onClick={() => { resetForm(); onClose() }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</> : <><CheckCircle className="h-4 w-4 mr-2" />Publish Job</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
