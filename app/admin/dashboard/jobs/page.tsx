"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Briefcase, Building2, Calendar, Loader2, MapPin, Search, Plus, Users,
  Eye, Share2, Send, Link2, MoreHorizontal, PauseCircle, PlayCircle,
  CheckCircle2, XCircle, Star, UserCheck, RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { JobPostingTemplate } from "@/types/admin-onboarding"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { ApplicationStatusBadge } from "@/components/hiring/application-status-badge"
import { useToast } from "@/components/ui/use-toast"
import { TeamBadgeEndorsementPanel } from "@/components/achievements/team-badge-endorsement-panel"
import { useCurrentVenue } from "@/hooks/use-venue"

function employmentLabel(value: string) {
  return value.replace(/_/g, " ")
}

export default function JobsPage() {
  const { toast } = useToast()
  const { venue, loading: venueLoading } = useCurrentVenue()
  const venueId = venue?.id ?? ""
  const [activeTab, setActiveTab] = useState("postings")
  const [jobs, setJobs] = useState<JobPostingTemplate[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [hiringApps, setHiringApps] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [didFail, setDidFail] = useState(false)
  const [titleQuery, setTitleQuery] = useState("")
  const [loadCounter, setLoadCounter] = useState(0)

  function buildNoStoreInit(): RequestInit {
    return { credentials: "include", cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }
  }

  useEffect(() => {
    if (venueLoading) return
    if (!venueId) {
      setIsLoading(false)
      setDidFail(false)
      setJobs([])
      return
    }
    let alive = true
    ;(async () => {
      setIsLoading(true)
      setDidFail(false)
      try {
        const res = await fetch(
          `/api/admin/job-postings?venue_id=${encodeURIComponent(venueId)}`,
          buildNoStoreInit()
        )
        const json = await res.json()
        if (!alive) return
        if (json.success && Array.isArray(json.data)) setJobs(json.data)
        else setDidFail(true)
      } catch {
        if (alive) setDidFail(true)
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [venueId, venueLoading, loadCounter])

  useEffect(() => {
    if (activeTab !== "team") return
    ;(async () => {
      try {
        const res = await fetch("/api/admin/team-members", buildNoStoreInit())
        const data = await res.json()
        setTeamMembers(data?.members || [])
      } catch { setTeamMembers([]) }
    })()
  }, [activeTab, loadCounter])

  const filtered = useMemo(() => {
    const q = titleQuery.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) => j.title.toLowerCase().includes(q))
  }, [jobs, titleQuery])

  const handleShareToFeed = async (jobId: string, title: string) => {
    try {
      const res = await fetch("/api/posts/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared_content_type: "job_posting", shared_content_id: jobId, content: `We're hiring: ${title}` }),
      })
      const data = await res.json()
      if (data.success) toast({ title: "Shared to feed" })
      else throw new Error(data.error)
    } catch (error) {
      toast({ title: "Share failed", variant: "destructive" })
    }
  }

  const handleCopyLink = (jobId: string) => {
    // jobId is the job_posting_templates.id — matches /api/job-postings/[id]
    navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`)
    toast({ title: "Link copied" })
  }

  const loadHiringApps = async (jobId: string) => {
    setSelectedJobId(jobId)
    setActiveTab("hiring")
    try {
      const params = new URLSearchParams({ job_posting_id: jobId })
      if (venueId) params.set("venue_id", venueId)
      const res = await fetch(`/api/admin/applications?${params.toString()}`, buildNoStoreInit())
      const data = await res.json()
      setHiringApps(Array.isArray(data?.data) ? data.data : [])
    } catch { setHiringApps([]) }
  }

  const handleApplicationAction = async (applicationId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      if (status === "approved") {
        toast({ title: "Hire approved!", description: "Added to team roster and onboarding initiated." })
        setLoadCounter(c => c + 1)
      } else {
        toast({ title: "Application updated", description: `Moved to ${status}.` })
      }
      setHiringApps(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a))
    } catch (error) {
      toast({ title: "Update failed", description: error instanceof Error ? error.message : "Could not update.", variant: "destructive" })
    }
  }

  const handleAddTeamMember = async (name: string, email: string, role: string) => {
    try {
      const res = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, role }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      toast({ title: "Team member added", description: `${name} has been added.` })
      setTeamMembers(prev => [data.member, ...prev])
    } catch (error) {
      toast({ title: "Failed to add", description: error instanceof Error ? error.message : "Could not add.", variant: "destructive" })
    }
  }

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/admin/team-members?id=${memberId}`, { method: "DELETE", credentials: "include" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      toast({ title: "Member removed" })
      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (error) {
      toast({ title: "Remove failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800/90 to-indigo-950/50 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Jobs & Team Management</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Manage job postings, review applicants, and build your team.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={titleQuery} onChange={(e) => setTitleQuery(e.target.value)} placeholder="Filter by title..."
                className="border-slate-700 bg-slate-800/80 pl-9 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/40" />
            </div>
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <a href="/admin/dashboard/staff"><Plus className="h-4 w-4 mr-1" />Create Job</a>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="hiring">Hiring Pipeline</TabsTrigger>
          <TabsTrigger value="team">Team Roster</TabsTrigger>
          <TabsTrigger value="recognition">Recognition</TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="mt-6">
          {(isLoading || venueLoading) ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <span className="text-sm">Loading postings...</span>
            </div>
          ) : !venueId ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-6 text-center">
              <Briefcase className="h-10 w-10 text-slate-600" />
              <p className="font-medium text-slate-300">No workspace selected</p>
              <p className="text-sm text-slate-500">Select a venue to view its job postings.</p>
            </div>
          ) : didFail && jobs.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-6 text-center">
              <Briefcase className="h-10 w-10 text-slate-600" />
              <p className="text-slate-400">Could not load job postings. Try again later.</p>
              <Button variant="outline" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700" onClick={() => setLoadCounter(c => c + 1)}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-6 text-center">
              <Briefcase className="h-10 w-10 text-slate-600" />
              <p className="font-medium text-slate-300">{jobs.length === 0 ? "No published job postings yet" : "No postings match"}</p>
              {jobs.length > 0 && titleQuery.trim() && (
                <Button variant="ghost" className="text-purple-400 hover:bg-slate-800" onClick={() => setTitleQuery("")}>Clear search</Button>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filtered.map((job) => (
                <li key={job.id}>
                  <Card className="border-slate-700 bg-slate-800/60 shadow-md backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold leading-snug text-white">{job.title}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="shrink-0 border border-slate-600 bg-slate-700/80 text-xs capitalize text-slate-200">
                            {employmentLabel(job.employment_type)}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleShareToFeed(job.id, job.title)}>
                                <Send className="h-4 w-4 mr-2" />Share to Feed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(job.id)}>
                                <Link2 className="h-4 w-4 mr-2" />Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => loadHiringApps(job.id)}>
                                <Users className="h-4 w-4 mr-2" />View Applicants
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-400">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-slate-500" /><span>{job.department}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-500" /><span>{job.location}</span></div>
                      <div className="flex items-center justify-between border-t border-slate-700/80 pt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /><span>Posted {formatSafeDate(job.created_at)}</span></div>
                        {(job.applications_count ?? 0) > 0 && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-400" onClick={() => loadHiringApps(job.id)}>
                            <Users className="h-3 w-3 mr-1" />{job.applications_count} applicants
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="hiring" className="mt-6">
          {!selectedJobId ? (
            <div className="space-y-4">
              <Card className="bg-slate-900 border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Select a job to manage applicants</h3>
                <p className="text-slate-400 text-sm">Click "View Applicants" on any job posting, or select below.</p>
              </Card>
              {jobs.filter(j => (j.applications_count ?? 0) > 0).length > 0 ? (
                <div className="grid gap-3">
                  {jobs.filter(j => (j.applications_count ?? 0) > 0).map(job => (
                    <Card key={job.id} className="bg-slate-900 border-slate-700 cursor-pointer hover:border-slate-600 transition-colors" onClick={() => loadHiringApps(job.id)}>
                      <CardContent className="pt-5 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{job.title}</p>
                          <p className="text-slate-400 text-sm">{job.applications_count} applicant{(job.applications_count ?? 0) !== 1 ? "s" : ""}</p>
                        </div>
                        <Badge className="bg-purple-600 capitalize">{job.department}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 text-center">
                  <UserCheck className="h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">No applicants yet. Share your jobs to attract candidates.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => { setSelectedJobId(null); setHiringApps([]) }} className="text-slate-300 hover:text-white">
                &larr; Back to all jobs
              </Button>
              {hiringApps.length === 0 ? (
                <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 text-center">
                  <UserCheck className="h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">No applicants for this posting yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hiringApps.map((app) => (
                    <Card key={app.id} className="bg-slate-900 border-slate-700">
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{app.applicant_name || app.contact_email || "Applicant"}</p>
                            {app.contact_email && <p className="text-slate-400 text-sm">{app.contact_email}</p>}
                            {app.cover_letter && <p className="text-slate-300 text-sm mt-1 line-clamp-2">{app.cover_letter}</p>}
                            <p className="text-slate-500 text-xs mt-1">Applied {formatSafeDate(app.applied_at || app.created_at)}</p>
                          </div>
                          <ApplicationStatusBadge status={app.status} />
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
              <h3 className="text-lg font-semibold">Team Roster ({teamMembers.length})</h3>
              <AdminAddMemberInline onAdd={handleAddTeamMember} />
            </div>
            {teamMembers.length === 0 ? (
              <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/80 text-center">
                <Users className="h-10 w-10 text-slate-600" />
                <p className="text-slate-400">No team members yet. Hire someone or add members manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member: any) => (
                  <Card key={member.id} className="bg-slate-900 border-slate-700">
                    <CardContent className="pt-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.profiles?.full_name || member.name || "Member"}</p>
                          <p className="text-slate-400 text-sm">{member.profiles?.email || member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize border-slate-600">{member.role || "member"}</Badge>
                        <Badge className={member.status === "active" ? "bg-green-600" : "bg-slate-600"}>{member.status || "active"}</Badge>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleRemoveTeamMember(member.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recognition" className="mt-6">
          <TeamBadgeEndorsementPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AdminAddMemberInline({ onAdd }: { onAdd: (name: string, email: string, role: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")

  if (!isOpen) return <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Member</Button>

  return (
    <div className="flex items-end gap-2 bg-slate-800 rounded-lg p-3">
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="h-8 bg-slate-900 border-slate-700 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Email</Label>
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="h-8 bg-slate-900 border-slate-700 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-sm w-32"><SelectValue /></SelectTrigger>
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
      <Button size="sm" onClick={() => { if (name.trim() && email.trim()) { onAdd(name.trim(), email.trim(), role); setName(""); setEmail(""); setRole("member"); setIsOpen(false) } }} disabled={!name.trim() || !email.trim()} className="h-8 bg-purple-600 hover:bg-purple-700">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="h-8">Cancel</Button>
    </div>
  )
}
