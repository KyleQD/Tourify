"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateJobModal } from "../../components/jobs/create-job-modal"
import { Briefcase, Search, MapPin, DollarSign, Calendar, Filter, AlertCircle } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { HiringStateCard } from "@/components/hiring/hiring-state-card"
import { ApplicationStatusBadge } from "@/components/hiring/application-status-badge"

interface VenueJobCard {
  id: string
  title: string
  description: string
  location: string
  type: string
  category: string
  compensation: {
    amount: number
    type: "fixed" | "hourly"
    details?: string
  }
  postedDate: string
  applicants?: number
  status: string
  postedBy?: string
}

interface VenueApplicationRow {
  id: string
  status: string
  applied_at: string
  job_posting_id: string
  job_posting?: {
    title?: string
    department?: string
    location?: string
  } | null
}

export default function JobsPage() {
  const { venue } = useCurrentVenue()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("my-jobs")
  const [myJobs, setMyJobs] = useState<VenueJobCard[]>([])
  const [availableJobs, setAvailableJobs] = useState<VenueJobCard[]>([])
  const [applications, setApplications] = useState<VenueApplicationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [didFail, setDidFail] = useState(false)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    async function loadVenueJobs() {
      if (!venue?.id) return
      try {
        setIsLoading(true)
        setDidFail(false)
        const [myJobsRes, boardRes, applicationsRes] = await Promise.all([
          fetch(`/api/admin/job-postings?venue_id=${venue.id}`, buildNoStoreInit()),
          fetch("/api/job-board?limit=20", buildNoStoreInit()),
          fetch("/api/job-applications?limit=20", buildNoStoreInit()),
        ])

        const [myJobsPayload, boardPayload, applicationsPayload] = await Promise.all([
          myJobsRes.json(),
          boardRes.json(),
          applicationsRes.json(),
        ])

        const normalizedMyJobs = Array.isArray(myJobsPayload?.data)
          ? myJobsPayload.data.map((job: any) => ({
              id: String(job.id),
              title: job.title || "Untitled role",
              description: job.description || "No description provided.",
              location: job.location || "Venue",
              type: String(job.employment_type || "contractor").replace(/_/g, " "),
              category: job.role_type || job.department || "crew",
              compensation: {
                amount: Number(job.salary_range?.max || job.salary_range?.min || 0),
                type: job.salary_range?.type === "hourly" ? "hourly" : "fixed",
                details: job.salary_range?.min && job.salary_range?.max
                  ? `${Number(job.salary_range.min)} - ${Number(job.salary_range.max)}`
                  : undefined,
              },
              postedDate: job.created_at || new Date().toISOString(),
              applicants: Number(job.applications_count || 0),
              status: job.status || "draft",
            }))
          : []

        const normalizedBoardJobs = Array.isArray(boardPayload?.data)
          ? boardPayload.data.map((job: any) => ({
              id: String(job.id),
              title: job.title || "Untitled role",
              description: job.description || "No description provided.",
              location: job.location || "Remote",
              type: String(job.employment_type || "contractor").replace(/_/g, " "),
              category: job.role_type || job.department || "crew",
              compensation: {
                amount: Number(job.salary_range?.max || job.salary_range?.min || 0),
                type: job.salary_range?.type === "hourly" ? "hourly" : "fixed",
                details: job.salary_range?.min && job.salary_range?.max
                  ? `${Number(job.salary_range.min)} - ${Number(job.salary_range.max)}`
                  : undefined,
              },
              postedDate: job.created_at || new Date().toISOString(),
              status: job.status || "active",
              postedBy: job.organization_name || "Tourify venue",
            }))
          : []

        const normalizedApplications = Array.isArray(applicationsPayload?.data)
          ? (applicationsPayload.data as VenueApplicationRow[])
          : []

        setMyJobs(normalizedMyJobs)
        setAvailableJobs(normalizedBoardJobs)
        setApplications(normalizedApplications)
      } catch {
        setDidFail(true)
      } finally {
        setIsLoading(false)
      }
    }

    void loadVenueJobs()
  }, [venue?.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const filteredMyJobs = myJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredAvailableJobs = availableJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "musician":
        return "bg-blue-600"
      case "dancer":
        return "bg-purple-600"
      case "security":
        return "bg-red-600"
      case "av-tech":
        return "bg-green-600"
      case "crew":
        return "bg-amber-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-gray-400">Post jobs and hire individuals for your events</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <Briefcase className="h-4 w-4 mr-2" />
          Post Job
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs..."
            className="pl-10 bg-gray-800 border-gray-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-gray-700">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <Tabs defaultValue="my-jobs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="my-jobs">My Job Postings</TabsTrigger>
          <TabsTrigger value="available">Available Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="my-jobs" className="mt-6 space-y-6">
          {isLoading ? (
            <HiringStateCard
              title="Loading Job Postings"
              description="Loading your job postings..."
              isLoading={true}
              className="border-gray-800 bg-gray-900"
            />
          ) : didFail ? (
            <HiringStateCard
              title="Unable to Load Postings"
              description="Could not load your postings right now."
              icon={AlertCircle}
              className="border-gray-800 bg-gray-900"
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          ) : filteredMyJobs.length === 0 ? (
            <HiringStateCard
              title="No Job Postings Yet"
              description="No job postings found. Create your first job posting."
              icon={Briefcase}
              className="border-gray-800 bg-gray-900"
              actionLabel="Post Job"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            filteredMyJobs.map((job) => (
              <Card key={job.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{job.title}</CardTitle>
                        <Badge className={getCategoryBadgeColor(job.category)}>
                          {job.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">
                          {job.type}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">{job.description}</CardDescription>
                    </div>
                    <Badge
                      variant={job.status === "active" ? "default" : "outline"}
                      className={job.status === "active" ? "bg-green-600" : "border-gray-600"}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {formatCurrency(job.compensation.amount)}
                        {job.compensation.type === "hourly" ? "/hr" : ""}
                        {job.compensation.details ? ` (${job.compensation.details})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Posted: {formatDate(job.postedDate)}</span>
                    </div>
                    <div className="flex items-center ml-auto">
                      <Badge variant="outline" className="border-blue-600 text-blue-500">
                        {job.applicants} Applicants
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">View Applicants</Button>
                    <Button variant="outline" className="border-gray-700">
                      Edit
                    </Button>
                    {job.status === "active" && (
                      <Button variant="outline" className="border-gray-700 text-red-500">
                        Close
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6 space-y-6">
          {isLoading ? (
            <HiringStateCard
              title="Loading Available Jobs"
              description="Loading available jobs..."
              isLoading={true}
              className="border-gray-800 bg-gray-900"
            />
          ) : filteredAvailableJobs.length === 0 ? (
            <HiringStateCard
              title="No Available Matches"
              description="No available jobs found matching your search criteria."
              icon={Briefcase}
              className="border-gray-800 bg-gray-900"
            />
          ) : (
            filteredAvailableJobs.map((job) => (
              <Card key={job.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{job.title}</CardTitle>
                        <Badge className={getCategoryBadgeColor(job.category)}>
                          {job.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">
                          {job.type}
                        </Badge>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-400">Posted by:</span>
                        <span className="text-sm font-medium ml-1">{job.postedBy}</span>
                      </div>
                      <CardDescription className="mt-1">{job.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {formatCurrency(job.compensation.amount)}
                        {job.compensation.type === "hourly" ? "/hr" : ""}
                        {job.compensation.details ? ` (${job.compensation.details})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Posted: {formatDate(job.postedDate)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">View Role</Button>
                    <Button variant="outline" className="border-gray-700">
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          {isLoading ? (
            <HiringStateCard
              title="Loading Applications"
              description="Loading your applications..."
              isLoading={true}
              className="border-gray-800 bg-gray-900"
            />
          ) : applications.length === 0 ? (
            <HiringStateCard
              title="No Applications Yet"
              description="You haven't applied to any jobs yet."
              icon={Briefcase}
              className="border-gray-800 bg-gray-900"
              actionLabel="Browse Available Jobs"
              onAction={() => setActiveTab("available")}
            />
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <Card key={application.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {application.job_posting?.title || "Job posting"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Applied {formatDate(application.applied_at)}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={application.status} className="w-fit" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateJobModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
