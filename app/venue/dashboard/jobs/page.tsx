"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateJobModal } from "../../components/jobs/create-job-modal"
import {
  Briefcase, Search, MapPin, DollarSign, Calendar, Filter, AlertCircle,
  MoreHorizontal, PauseCircle, PlayCircle, CheckCircle2, RefreshCw,
  Trash2, Pencil, Share2, Send, Link2, Eye, Users, UserCheck, Star,
  XCircle, Loader2, Plus,
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { HiringStateCard } from "@/components/hiring/hiring-state-card"
import { ApplicationStatusBadge } from "@/components/hiring/application-status-badge"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { TeamBadgeEndorsementPanel } from "@/components/achievements/team-badge-endorsement-panel"

interface VenueJobCard {
  id: string
  title: string
  description: string
  location: string
  type: string
  category: string
  compensation: { amount: number; type: "fixed" | "hourly"; details?: string }
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
  applicant_name?: string
  contact_email?: string
  cover_letter?: string
  form_responses?: any
  job_posting?: { title?: string; department?: string; location?: string } | null
}

function AddTeamMemberInline({ onAdd }: { onAdd: (name: string, email: string, role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")

  function handleSubmit() {
    if (!name.trim() || !email.trim()) return
    onAdd(name.trim(), email.trim(), role)
    setName(""); setEmail(""); setRole("member"); setIsOpen(false)
  }

  if (!isOpen) {
    return <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Member</Button>
  }

  return (
    <div className="flex items-end gap-2 bg-gray-800 rounded-lg p-3">
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="h-8 bg-gray-900 border-gray-700 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Email</Label>
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="h-8 bg-gray-900 border-gray-700 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-8 bg-gray-900 border-gray-700 text-sm w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="bar_staff">Bar Staff</SelectItem>
            <SelectItem value="crew">Crew</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || !email.trim()} className="h-8 bg-purple-600 hover:bg-purple-700">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-8">Cancel</Button>
    </div>
  )
}

export default function JobsPage() {
  const { venue } = useCurrentVenue()
  const { toast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("my-jobs")
  const [myJobs, setMyJobs] = useState<VenueJobCard[]>([])
  const [availableJobs, setAvailableJobs] = useState<VenueJobCard[]>([])
  const [applications, setApplications] = useState<VenueApplicationRow[]>([])
  const [hiringApps, setHiringApps] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [didFail, setDidFail] = useState(false)
  const [loadCounter, setLoadCounter] = useState(0)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", Pragma: "no-cache", ...(input?.headers || {}) },
    }
  }

  useEffect(() => {
    async function loadVenueJobs() {
      if (!venue?.id) return
      try {
        setIsLoading(true)
        setDidFail(false)
        const [myJobsRes, boardRes, applicationsRes] = await Promise.all([
          fetch(`/api/venue/hiring/job-postings?venue_id=${venue.id}`, buildNoStoreInit()),
          fetch("/api/job-board?limit=20", buildNoStoreInit()),
          fetch("/api/job-applications?limit=20", buildNoStoreInit()),
        ])
        const [myJobsPayload, boardPayload, applicationsPayload] = await Promise.all([
          myJobsRes.json(), boardRes.json(), applicationsRes.json(),
        ])

        const normalizeJob = (job: any, isBoard = false): VenueJobCard => ({
          id: String(job.id),
          title: job.title || "Untitled role",
          description: job.description || "No description provided.",
          location: job.location || (isBoard ? "Remote" : "Venue"),
          type: String(job.employment_type || "contractor").replace(/_/g, " "),
          category: job.role_type || job.department || "crew",
          compensation: {
            amount: Number(job.salary_range?.max || job.salary_range?.min || 0),
            type: job.salary_range?.type === "hourly" ? "hourly" : "fixed",
            details: job.salary_range?.min && job.salary_range?.max ? `${Number(job.salary_range.min)} - ${Number(job.salary_range.max)}` : undefined,
          },
          postedDate: job.created_at || new Date().toISOString(),
          applicants: Number(job.applications_count || 0),
          status: job.status || (isBoard ? "active" : "draft"),
          postedBy: isBoard ? (job.organization_name || "Tourify venue") : undefined,
        })

        setMyJobs(Array.isArray(myJobsPayload?.data) ? myJobsPayload.data.map((j: any) => normalizeJob(j)) : [])
        setAvailableJobs(Array.isArray(boardPayload?.data) ? boardPayload.data.map((j: any) => normalizeJob(j, true)) : [])
        setApplications(Array.isArray(applicationsPayload?.data) ? applicationsPayload.data : [])
      } catch {
        setDidFail(true)
      } finally {
        setIsLoading(false)
      }
    }
    void loadVenueJobs()
  }, [venue?.id, loadCounter])

  useEffect(() => {
    async function loadTeam() {
      if (!venue?.id) return
      try {
        const res = await fetch(`/api/venue/team?venue_id=${venue.id}`, buildNoStoreInit())
        const data = await res.json()
        setTeamMembers(data?.members || [])
      } catch { setTeamMembers([]) }
    }
    if (activeTab === "team") void loadTeam()
  }, [venue?.id, activeTab, loadCounter])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string) => formatSafeDate(dateString)

  const filteredMyJobs = myJobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) || job.description.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredAvailableJobs = availableJobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) || job.description.toLowerCase().includes(searchQuery.toLowerCase()))

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = { musician: "bg-blue-600", dancer: "bg-purple-600", security: "bg-red-600", "av-tech": "bg-green-600", crew: "bg-amber-600" }
    return colors[category] || "bg-gray-600"
  }

  const handleStatusChange = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`/api/venue/hiring/job-postings/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!data.success && !res.ok) throw new Error(data.error || "Failed")
      toast({ title: "Status updated", description: `Job status changed to ${status}.` })
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Could not update.", variant: "destructive" })
    }
  }

  const handleShareToFeed = async (jobId: string, title: string) => {
    try {
      const res = await fetch("/api/posts/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared_content_type: "job_posting", shared_content_id: jobId, content: `We're hiring! Check out this role: ${title}` }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Shared to feed", description: "This job has been posted to your feed." })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({ title: "Share failed", description: error instanceof Error ? error.message : "Could not share.", variant: "destructive" })
    }
  }

  const handleCopyLink = (jobId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`)
    toast({ title: "Link copied", description: "Job link copied to clipboard." })
  }

  const loadHiringApps = async (jobId: string) => {
    setSelectedJobId(jobId)
    setActiveTab("hiring")
    try {
      const res = await fetch(`/api/venue/hiring/applications?job_posting_id=${jobId}`, buildNoStoreInit())
      const data = await res.json()
      setHiringApps(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setHiringApps([])
    }
  }

  const handleApplicationAction = async (applicationId: string, status: string) => {
    try {
      const res = await fetch(`/api/venue/hiring/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      if (status === "approved") {
        toast({ title: "Hire approved!", description: "This person has been approved and added to your team roster. Onboarding has been initiated." })
        setLoadCounter(c => c + 1)
      } else {
        toast({ title: "Application updated", description: `Application moved to ${status}.` })
      }
      setHiringApps(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a))
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Could not update.", variant: "destructive" })
    }
  }

  const handleAddTeamMember = async (name: string, email: string, role: string) => {
    if (!venue?.id) return
    try {
      const res = await fetch("/api/venue/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ venue_id: venue.id, name, email, role }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      toast({ title: "Team member added", description: `${name} has been added to your team.` })
      setTeamMembers(prev => [data.member, ...prev])
    } catch (error) {
      toast({ title: "Failed to add", description: error instanceof Error ? error.message : "Could not add team member.", variant: "destructive" })
    }
  }

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/venue/team?id=${memberId}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      toast({ title: "Member removed", description: "Team member has been removed." })
      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (error) {
      toast({ title: "Remove failed", description: error instanceof Error ? error.message : "Could not remove.", variant: "destructive" })
    }
  }

  const handleUpdateMemberRole = async (memberId: string, role: string) => {
    try {
      const res = await fetch("/api/venue/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: memberId, role }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      toast({ title: "Role updated" })
      setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-gray-400">Post jobs, hire individuals, and manage your hiring pipeline</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Briefcase className="h-4 w-4 mr-2" />Post Job
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input placeholder="Search jobs..." className="pl-10 bg-gray-800 border-gray-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="my-jobs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="my-jobs">My Job Postings</TabsTrigger>
          <TabsTrigger value="available">Available Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="hiring">Hiring Pipeline</TabsTrigger>
          <TabsTrigger value="team">Team Roster</TabsTrigger>
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
        </TabsList>

        <TabsContent value="my-jobs" className="mt-6 space-y-6">
          {isLoading ? (
            <HiringStateCard title="Loading Job Postings" description="Loading your job postings..." isLoading={true} className="border-gray-800 bg-gray-900" />
          ) : didFail ? (
            <HiringStateCard title="Unable to Load Postings" description="Could not load your postings right now." icon={AlertCircle} className="border-gray-800 bg-gray-900" actionLabel="Retry" onAction={() => window.location.reload()} />
          ) : filteredMyJobs.length === 0 ? (
            <HiringStateCard title="No Job Postings Yet" description="No job postings found. Create your first job posting." icon={Briefcase} className="border-gray-800 bg-gray-900" actionLabel="Post Job" onAction={() => setShowCreateModal(true)} />
          ) : (
            filteredMyJobs.map((job) => (
              <Card key={job.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle>{job.title}</CardTitle>
                        <Badge className={getCategoryBadgeColor(job.category)}>
                          {job.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">{job.type}</Badge>
                      </div>
                      <CardDescription className="mt-1">{job.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.status === "active" || job.status === "published" ? "default" : "outline"}
                        className={job.status === "active" || job.status === "published" ? "bg-green-600" : "border-gray-600"}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShareToFeed(job.id, job.title)}>
                            <Send className="h-4 w-4 mr-2" />Share to Feed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(job.id)}>
                            <Link2 className="h-4 w-4 mr-2" />Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(job.status === "active" || job.status === "published") && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "paused")}>
                              <PauseCircle className="h-4 w-4 mr-2" />Pause
                            </DropdownMenuItem>
                          )}
                          {job.status === "paused" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "published")}>
                              <PlayCircle className="h-4 w-4 mr-2" />Reopen
                            </DropdownMenuItem>
                          )}
                          {(job.status === "closed" || job.status === "filled") && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "published")}>
                              <RefreshCw className="h-4 w-4 mr-2" />Repost
                            </DropdownMenuItem>
                          )}
                          {job.status !== "closed" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "closed")} className="text-red-400">
                              <XCircle className="h-4 w-4 mr-2" />Close
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-gray-400" /><span>{job.location}</span></div>
                    <div className="flex items-center"><DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{formatCurrency(job.compensation.amount)}{job.compensation.type === "hourly" ? "/hr" : ""}{job.compensation.details ? ` (${job.compensation.details})` : ""}</span>
                    </div>
                    <div className="flex items-center"><Calendar className="h-4 w-4 mr-1 text-gray-400" /><span>Posted: {formatDate(job.postedDate)}</span></div>
                    <div className="flex items-center ml-auto">
                      <Badge variant="outline" className="border-blue-600 text-blue-500">{job.applicants} Applicants</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(job.applicants || 0) > 0 && (
                      <Button className="flex-1" onClick={() => loadHiringApps(job.id)}>
                        <Users className="h-4 w-4 mr-2" />View Applicants
                      </Button>
                    )}
                    <Button variant="outline" className="border-gray-700" onClick={() => handleShareToFeed(job.id, job.title)}>
                      <Share2 className="h-4 w-4 mr-2" />Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6 space-y-6">
          {isLoading ? (
            <HiringStateCard title="Loading Available Jobs" description="Loading available jobs..." isLoading={true} className="border-gray-800 bg-gray-900" />
          ) : filteredAvailableJobs.length === 0 ? (
            <HiringStateCard title="No Available Matches" description="No available jobs found matching your search criteria." icon={Briefcase} className="border-gray-800 bg-gray-900" />
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
                        <Badge variant="outline" className="border-gray-600">{job.type}</Badge>
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
                    <div className="flex items-center"><MapPin className="h-4 w-4 mr-1 text-gray-400" /><span>{job.location}</span></div>
                    <div className="flex items-center"><DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{formatCurrency(job.compensation.amount)}{job.compensation.type === "hourly" ? "/hr" : ""}{job.compensation.details ? ` (${job.compensation.details})` : ""}</span>
                    </div>
                    <div className="flex items-center"><Calendar className="h-4 w-4 mr-1 text-gray-400" /><span>Posted: {formatDate(job.postedDate)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1">View Role</Button>
                    <Button variant="outline" className="border-gray-700">Save</Button>
                    <Button variant="outline" className="border-gray-700" onClick={() => handleShareToFeed(job.id, job.title)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          {isLoading ? (
            <HiringStateCard title="Loading Applications" description="Loading your applications..." isLoading={true} className="border-gray-800 bg-gray-900" />
          ) : applications.length === 0 ? (
            <HiringStateCard title="No Applications Yet" description="You haven't applied to any jobs yet." icon={Briefcase} className="border-gray-800 bg-gray-900" actionLabel="Browse Available Jobs" onAction={() => setActiveTab("available")} />
          ) : (
            <div className="space-y-3">
              {applications.map((application) => (
                <Card key={application.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-white font-medium">{application.job_posting?.title || "Job posting"}</p>
                        <p className="text-xs text-gray-400">Applied {formatDate(application.applied_at)}</p>
                      </div>
                      <ApplicationStatusBadge status={application.status} className="w-fit" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hiring" className="mt-6">
          {!selectedJobId ? (
            <div className="space-y-4">
              <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Select a job to manage applicants</h3>
                <p className="text-gray-400 text-sm mb-4">Choose one of your posted jobs below to review applications and manage your hiring pipeline.</p>
              </Card>
              {myJobs.filter(j => (j.applicants || 0) > 0).length === 0 ? (
                <HiringStateCard title="No Applicants Yet" description="When people apply to your jobs, you can manage them here." icon={UserCheck} className="border-gray-800 bg-gray-900" />
              ) : (
                <div className="grid gap-3">
                  {myJobs.filter(j => (j.applicants || 0) > 0).map((job) => (
                    <Card key={job.id} className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-600 transition-colors" onClick={() => loadHiringApps(job.id)}>
                      <CardContent className="pt-5 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{job.title}</p>
                          <p className="text-gray-400 text-sm">{job.applicants} applicant{job.applicants !== 1 ? "s" : ""}</p>
                        </div>
                        <Badge className="bg-purple-600 capitalize">{job.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => { setSelectedJobId(null); setHiringApps([]) }} className="text-gray-300 hover:text-white">
                &larr; Back to all jobs
              </Button>
              {hiringApps.length === 0 ? (
                <HiringStateCard title="No Applicants" description="No applications for this posting yet. Share it to get more applicants." icon={UserCheck} className="border-gray-800 bg-gray-900" />
              ) : (
                <div className="space-y-3">
                  {hiringApps.map((app) => (
                    <Card key={app.id} className="bg-gray-900 border-gray-800">
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{app.applicant_name || app.contact_email || "Applicant"}</p>
                            {app.contact_email && <p className="text-gray-400 text-sm">{app.contact_email}</p>}
                            {app.cover_letter && <p className="text-gray-300 text-sm mt-1 line-clamp-2">{app.cover_letter}</p>}
                            <p className="text-gray-500 text-xs mt-1">Applied {formatDate(app.applied_at || app.created_at)}</p>
                          </div>
                          <ApplicationStatusBadge status={app.status} className="w-fit" />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {app.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="border-blue-600 text-blue-400" onClick={() => handleApplicationAction(app.id, "reviewed")}>
                                <Eye className="w-3 h-3 mr-1" />Review
                              </Button>
                              <Button size="sm" variant="outline" className="border-purple-600 text-purple-400" onClick={() => handleApplicationAction(app.id, "shortlisted")}>
                                <Star className="w-3 h-3 mr-1" />Shortlist
                              </Button>
                            </>
                          )}
                          {(app.status === "reviewed" || app.status === "shortlisted") && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApplicationAction(app.id, "approved")}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />Approve & Hire
                            </Button>
                          )}
                          {!["approved", "rejected", "withdrawn"].includes(app.status) && (
                            <Button size="sm" variant="outline" className="border-red-600 text-red-400" onClick={() => handleApplicationAction(app.id, "rejected")}>
                              <XCircle className="w-3 h-3 mr-1" />Reject
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Team Roster ({teamMembers.length})</h3>
              <AddTeamMemberInline onAdd={handleAddTeamMember} />
            </div>
            {teamMembers.length === 0 ? (
              <HiringStateCard title="No Team Members Yet" description="Hire someone through the pipeline or add team members manually." icon={Users} className="border-gray-800 bg-gray-900" />
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member: any) => (
                  <Card key={member.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.profiles?.full_name || member.name || "Team member"}</p>
                            <p className="text-gray-400 text-sm">{member.profiles?.email || member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize border-gray-600">{member.role || "member"}</Badge>
                          <Badge className={member.status === "active" ? "bg-green-600" : "bg-gray-600"}>{member.status || "active"}</Badge>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleRemoveTeamMember(member.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recognition" className="mt-6">
          <TeamBadgeEndorsementPanel venueId={venue?.id} />
        </TabsContent>
      </Tabs>

      <CreateJobModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onJobCreated={() => setLoadCounter(c => c + 1)} />
    </div>
  )
}
