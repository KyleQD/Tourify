"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Briefcase, MapPin, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Job {
  id: string
  title: string
  description: string
  location?: string | null
  payment_amount?: number | null
  payment_currency?: string | null
  deadline?: string | null
}

export default function ApplyToJobPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const params = useParams()
  const [job, setJob] = useState<Job | null>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [experience, setExperience] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Array<{ key: string; label: string; completed: boolean }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch job details
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/artist-jobs/${params.id}`)
        if (!response.ok) throw new Error("Failed to fetch job")
        const data = await response.json()
        if (data.success) setJob(data.data)
      } catch (error) {
        console.error("Error fetching job:", error)
      }
    }

    fetchJob()
  }, [params.id])

  useEffect(() => {
    if (user?.email) setContactEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    const fetchMyApplication = async () => {
      if (!params.id || !user) return
      try {
        const response = await fetch("/api/artist-jobs/applications")
        const payload = await response.json()
        if (!payload.success) return

        const current = (payload.data || []).find((entry: any) => entry.job_id === params.id)
        if (!current) return
        setApplicationStatus(current.status)
        setMilestones((current.milestones || []).map((milestone: any) => ({
          key: milestone.key,
          label: milestone.label,
          completed: Boolean(milestone.completed),
        })))
      } catch (error) {
        console.error("Error fetching application timeline:", error)
      }
    }

    fetchMyApplication()
  }, [params.id, user])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-slate-800/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Sign in to apply</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300">Please sign in to apply for this job.</p>
            <Button onClick={() => router.push("/login")} className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading opportunity...
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job || !user || !contactEmail) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/artist-jobs/${job.id}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: job.id,
          cover_letter: coverLetter,
          experience_description: experience,
          contact_email: contactEmail,
          contact_phone: contactPhone || undefined,
          preferred_contact_method: "email",
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || "Failed to submit application")

      setApplicationStatus("pending")
      toast({
        title: "Application submitted",
        description: "You can now track status in your hiring timeline.",
      })
      router.refresh()
    } catch (error) {
      console.error("Error submitting application:", error)
      toast({
        title: "Application failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Card className="bg-slate-800/60 border-slate-700/60">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-white">Apply for {job?.title}</CardTitle>
              <CardDescription className="text-slate-300">
                {job.location ? (
                  <span className="inline-flex items-center gap-1 mr-3">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                ) : "Location in listing"}
                {job.payment_amount ? `• ${job.payment_currency || "USD"} ${job.payment_amount}` : ""}
              </CardDescription>
            </div>
          </div>
          <CardDescription className="text-slate-400 text-xs">
            Submit once. Track your hiring status from review through onboarding and contract signature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="cover-letter" className="text-slate-200">Cover Letter</Label>
              <Textarea
                id="cover-letter"
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                placeholder="Tell the employer why you are a strong fit for this role"
                className="min-h-[140px] bg-slate-900/60 border-slate-600 text-slate-100"
                required
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="experience" className="text-slate-200">Relevant Experience</Label>
              <Textarea
                id="experience"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                placeholder="Describe your experience for this role"
                className="min-h-[120px] bg-slate-900/60 border-slate-600 text-slate-100"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-slate-200">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="bg-slate-900/60 border-slate-600 text-slate-100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone" className="text-slate-200">Contact Phone (optional)</Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="bg-slate-900/60 border-slate-600 text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || applicationStatus === "pending"}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? "Submitting..." : applicationStatus ? "Already Applied" : "Submit Application"}
              </Button>
            </div>
          </form>

          {(applicationStatus || milestones.length > 0) && (
            <div className="mt-8 border-t border-slate-700 pt-6">
              <h3 className="font-semibold text-slate-100 mb-4">Your hiring timeline</h3>
              <div className="flex flex-wrap gap-2">
                {milestones.length > 0
                  ? milestones.map((milestone) => (
                      <Badge
                        key={milestone.key}
                        variant={milestone.completed ? "default" : "outline"}
                        className={milestone.completed ? "bg-green-600 text-white" : "border-slate-600 text-slate-300"}
                      >
                        {milestone.label}
                      </Badge>
                    ))
                  : (
                    <Badge variant="outline" className="border-slate-600 text-slate-300">{applicationStatus}</Badge>
                    )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
} 