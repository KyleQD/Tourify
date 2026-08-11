"use client"

// Deprecated: this venue profile-context modal is not the dashboard hiring flow.
// New job-posting UI must use components/job-posting shared wizards/adapters.

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useProfile } from "@/context/venue/profile-context"
import { useToast } from "@/hooks/use-toast"
import { Briefcase, DollarSign, MapPin, Plus, X } from "lucide-react"
import type { JobPosting } from "@/lib/venue/types"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateJobModal({ isOpen, onClose }: CreateJobModalProps) {
  const { postJob } = useProfile()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requirements, setRequirements] = useState<string[]>([])
  const [newRequirement, setNewRequirement] = useState("")
  const [formData, setFormData] = useState<Omit<JobPosting, "id" | "userId" | "createdAt" | "isActive">>({
    title: "",
    description: "",
    location: "",
    type: "one-time",
    category: "musician",
    compensation: {
      type: "fixed",
    },
    contactEmail: "",
    requirements: [],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCompensationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        [name]: name === "amount" ? Number.parseFloat(value) || 0 : value,
      },
    }))
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements([...requirements, newRequirement.trim()])
      setNewRequirement("")
    }
  }

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim() || !formData.contactEmail.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const jobData = {
        ...formData,
        requirements,
        id: "",
        userId: "",
        createdAt: new Date().toISOString(),
        isActive: true,
      }

      const success = await postJob(jobData)

      if (success) {
        toast({
          title: "Job posted",
          description: `Your job listing for "${formData.title}" has been posted successfully.`,
        })
        onClose()
        setFormData({
          title: "",
          description: "",
          location: "",
          type: "one-time",
          category: "musician",
          compensation: {
            type: "fixed",
          },
          contactEmail: "",
          requirements: [],
        })
        setRequirements([])
      }
    } catch (error) {
      console.error("Error posting job:", error)
      toast({
        title: "Error posting job",
        description: "There was an error posting your job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-[600px]", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>Post a Job</DialogTitle>
          <DialogDescription className={detailSurfacePattern.description}>
            Post a job listing to hire musicians, dancers, security, A/V techs, and more.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className={detailSurfacePattern.label}>Job Title*</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Guitarist Needed for Tour"
                className={cn(detailSurfacePattern.input, "pl-10")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={detailSurfacePattern.label}>Job Description*</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the job responsibilities, expectations, and any other relevant details"
              className={cn(detailSurfacePattern.textarea, "min-h-[120px]")}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className={detailSurfacePattern.label}>Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State or Remote"
                  className={cn(detailSurfacePattern.input, "pl-10")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className={detailSurfacePattern.label}>Category*</Label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={cn(detailSurfacePattern.selectTrigger, "w-full p-2")}
                required
              >
                <option value="musician">Musician</option>
                <option value="dancer">Dancer</option>
                <option value="security">Security</option>
                <option value="av-tech">A/V Technician</option>
                <option value="crew">Crew Member</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className={detailSurfacePattern.label}>Job Type*</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={cn(detailSurfacePattern.selectTrigger, "w-full p-2")}
                required
              >
                <option value="one-time">One-time Gig</option>
                <option value="contract">Contract</option>
                <option value="part-time">Part-time</option>
                <option value="full-time">Full-time</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensationType" className={detailSurfacePattern.label}>Compensation Type*</Label>
              <select
                id="type"
                name="type"
                value={formData.compensation.type}
                onChange={handleCompensationChange}
                className={cn(detailSurfacePattern.selectTrigger, "w-full p-2")}
                required
              >
                <option value="fixed">Fixed Rate</option>
                <option value="hourly">Hourly Rate</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
          </div>

          {formData.compensation.type !== "negotiable" && (
            <div className="space-y-2">
              <Label htmlFor="compensationAmount" className={detailSurfacePattern.label}>
                {formData.compensation.type === "hourly" ? "Hourly Rate" : "Fixed Rate"}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.compensation.amount || ""}
                  onChange={handleCompensationChange}
                  placeholder="0.00"
                  className={cn(detailSurfacePattern.input, "pl-10")}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="requirements" className={detailSurfacePattern.label}>Requirements</Label>
            <div className="flex gap-2">
              <Input
                id="newRequirement"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement"
                className={detailSurfacePattern.input}
              />
              <Button type="button" onClick={addRequirement} variant="outline" className={detailSurfacePattern.btnOutline}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {requirements.length > 0 && (
              <div className="mt-2 space-y-2">
                {requirements.map((req, index) => (
                  <div key={index} className={cn(detailSurfacePattern.listRow, "flex items-center justify-between p-2")}>
                    <span className="text-sm">{req}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail" className={detailSurfacePattern.label}>Contact Email*</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="email@example.com"
              className={detailSurfacePattern.input}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone" className={detailSurfacePattern.label}>Contact Phone (Optional)</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={formData.contactPhone || ""}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className={detailSurfacePattern.input}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className={detailSurfacePattern.btnOutline}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className={detailSurfacePattern.btnPrimary}>
              {isSubmitting ? "Posting..." : "Post Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
