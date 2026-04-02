"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Calendar } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface JobPosting {
  id: string
  title: string
  description: string
  role: string
  department: string
  location: string
  start_date: string
  end_date: string
  pay_rate: string
  requirements: string[]
  status: string
}

interface JobApplication {
  id: string
  job_id: string
  applicant_id: string
  cover_letter: string
  status: string
  applicant: {
    full_name: string
    email: string
  }
}

export default function IndustryJobPostings() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    role: "",
    department: "",
    location: "",
    start_date: "",
    end_date: "",
    pay_rate: "",
    requirements: [""],
  })

  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [])

  const fetchJobs = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from("staff_jobs")
      .select("*")
      .eq("posted_by", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to fetch jobs")
      return
    }

    setJobs(data || [])
  }

  const fetchApplications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from("staff_applications")
      .select(`
        *,
        applicant:profiles(full_name, email)
      `)
      .in("job_id", jobs.map(job => job.id))

    if (error) {
      toast.error("Failed to fetch applications")
      return
    }

    setApplications(data || [])
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from("staff_jobs")
      .insert([{
        ...newJob,
        posted_by: session.user.id,
        requirements: newJob.requirements.filter(req => req.trim() !== ""),
      }])

    if (error) {
      toast.error("Failed to create job posting")
      return
    }

    toast.success("Job posting created successfully")
    setIsCreatingJob(false)
    setNewJob({
      title: "",
      description: "",
      role: "",
      department: "",
      location: "",
      start_date: "",
      end_date: "",
      pay_rate: "",
      requirements: [""],
    })
    fetchJobs()
  }

  const handleUpdateApplicationStatus = async (applicationId: string, status: string) => {
    const { error } = await supabase
      .from("staff_applications")
      .update({ status })
      .eq("id", applicationId)

    if (error) {
      toast.error("Failed to update application status")
      return
    }

    toast.success("Application status updated")
    fetchApplications()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Job Postings</h2>
        <Button onClick={() => setIsCreatingJob(true)}>Create New Job</Button>
      </div>

      {isCreatingJob && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Job Posting</CardTitle>
            <CardDescription>Fill out the details for your new job posting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newJob.role}
                    onValueChange={(value) => setNewJob({ ...newJob, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sound">Sound Engineer</SelectItem>
                      <SelectItem value="lighting">Lighting Designer</SelectItem>
                      <SelectItem value="stage">Stage Manager</SelectItem>
                      <SelectItem value="tour">Tour Manager</SelectItem>
                      <SelectItem value="photographer">Photographer</SelectItem>
                      <SelectItem value="videographer">Videographer</SelectItem>
                      <SelectItem value="promoter">Promoter</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_rate">Pay Rate</Label>
                  <Input
                    id="pay_rate"
                    value={newJob.pay_rate}
                    onChange={(e) => setNewJob({ ...newJob, pay_rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newJob.start_date}
                    onChange={(e) => setNewJob({ ...newJob, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newJob.end_date}
                    onChange={(e) => setNewJob({ ...newJob, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Requirements</Label>
                {newJob.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={req}
                      onChange={(e) => {
                        const newRequirements = [...newJob.requirements]
                        newRequirements[index] = e.target.value
                        setNewJob({ ...newJob, requirements: newRequirements })
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newRequirements = newJob.requirements.filter((_, i) => i !== index)
                        setNewJob({ ...newJob, requirements: newRequirements })
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewJob({ ...newJob, requirements: [...newJob.requirements, ""] })}
                >
                  Add Requirement
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreatingJob(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Job</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Job Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription>{job.role} - {job.location}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{job.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <p><strong>Start Date:</strong> {formatSafeDate(job.start_date)}</p>
                    <p><strong>End Date:</strong> {formatSafeDate(job.end_date)}</p>
                  </div>
                  <div>
                    <p><strong>Pay Rate:</strong> {job.pay_rate}</p>
                    <p><strong>Status:</strong> {job.status}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Requirements:</h4>
                  <ul className="list-disc list-inside">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <CardTitle>{application.applicant.full_name}</CardTitle>
                <CardDescription>{application.applicant.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{application.cover_letter}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status: {application.status}</span>
                  <Select
                    value={application.status}
                    onValueChange={(value) => handleUpdateApplicationStatus(application.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
} 