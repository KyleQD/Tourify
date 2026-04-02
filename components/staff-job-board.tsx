"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
  posted_by: string
  poster: {
    full_name: string
    email: string
  }
}

interface JobApplication {
  id: string
  job_id: string
  status: string
  cover_letter: string
  created_at: string
}

export default function StaffJobBoard() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [coverLetter, setCoverLetter] = useState("")

  useEffect(() => {
    fetchJobs()
    fetchApplications()
  }, [])

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("staff_jobs")
      .select(`
        *,
        poster:profiles(full_name, email)
      `)
      .eq("status", "open")
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
      .select("*")
      .eq("applicant_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to fetch applications")
      return
    }

    setApplications(data || [])
  }

  const handleApply = async () => {
    if (!selectedJob) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error("Please sign in to apply")
      return
    }

    const { error } = await supabase
      .from("staff_applications")
      .insert([{
        job_id: selectedJob.id,
        applicant_id: session.user.id,
        cover_letter: coverLetter,
        status: "pending"
      }])

    if (error) {
      toast.error("Failed to submit application")
      return
    }

    toast.success("Application submitted successfully")
    setSelectedJob(null)
    setCoverLetter("")
    fetchApplications()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "reviewing":
        return <Badge variant="default">Reviewing</Badge>
      case "accepted":
        return <Badge variant="default">Accepted</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available">Available Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription>
                  {job.role} - {job.location}
                </CardDescription>
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
                    <p><strong>Posted By:</strong> {job.poster.full_name}</p>
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
              <CardFooter>
                <Button
                  onClick={() => setSelectedJob(job)}
                  disabled={applications.some(app => app.job_id === job.id)}
                >
                  {applications.some(app => app.job_id === job.id) ? "Already Applied" : "Apply Now"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {applications.map((application) => {
            const job = jobs.find(j => j.id === application.job_id)
            if (!job) return null

            return (
              <Card key={application.id}>
                <CardHeader>
                  <CardTitle>{job.title}</CardTitle>
                  <CardDescription>
                    {job.role} - {job.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{application.cover_letter}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    {getStatusBadge(application.status)}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>

      {selectedJob && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="w-full max-w-2xl p-6 bg-white rounded-lg">
            <h3 className="text-xl font-bold mb-4">Apply for {selectedJob.title}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cover Letter</label>
                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're the perfect fit for this position..."
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  Cancel
                </Button>
                <Button onClick={handleApply}>Submit Application</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 