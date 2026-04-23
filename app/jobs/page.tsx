"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { SurfaceCard, SurfaceHero, SurfaceTabsList } from '@/components/surface/surface-primitives'
import { JobCard } from '@/components/artist-jobs/job-card'
import { JobFilters } from '@/components/artist-jobs/job-filters'
import { JobPostingModal } from '@/components/artist-jobs/job-posting-modal'
import { 
  Briefcase, Plus, Bookmark, TrendingUp, Filter, Star, Users, Calendar,
  MapPin, DollarSign, Eye, Sparkles, Zap, Target, Activity, Search,
  Loader2, Building2, Music, Mic, MessageCircle, ClipboardList, RefreshCw,
  CheckCircle2, XCircle, Clock, UserCheck, Send,
} from 'lucide-react'
import { 
  ArtistJob, ArtistJobCategory, JobSearchFilters, JobSearchResults 
} from '@/types/artist-jobs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { MyStaffingApplications } from '@/components/jobs/my-staffing-applications'
import { trackDashboardUxEvent } from '@/lib/analytics/ux-event-client'

const VALID_JOB_TABS = new Set(['all', 'collaborations', 'saved', 'applications', 'staffing', 'my-jobs', 'hiring'])

export default function JobsPage() {
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<ArtistJob[]>([])
  const [collaborations, setCollaborations] = useState<ArtistJob[]>([])
  const [categories, setCategories] = useState<ArtistJobCategory[]>([])
  const [savedJobs, setSavedJobs] = useState<ArtistJob[]>([])
  const [userApplications, setUserApplications] = useState<ArtistJob[]>([])
  const [featuredJobs, setFeaturedJobs] = useState<ArtistJob[]>([])
  const [myPostedJobs, setMyPostedJobs] = useState<ArtistJob[]>([])
  const [hiringApplications, setHiringApplications] = useState<any[]>([])
  const [selectedHiringJobId, setSelectedHiringJobId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<JobSearchResults | null>(null)
  const [filters, setFilters] = useState<JobSearchFilters>({
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    per_page: 20
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [isJobModalOpen, setIsJobModalOpen] = useState(false)
  const [staffingJobs, setStaffingJobs] = useState<any[]>([])
  const isAdminAccount = currentAccount?.account_type === 'admin'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && VALID_JOB_TABS.has(tab)) setActiveTab(tab)
    const jobId = searchParams.get('jobId')
    if (jobId) setSelectedHiringJobId(jobId)
  }, [searchParams])

  useEffect(() => {
    fetchCategories()
    fetchFeaturedJobs()
  }, [])

  useEffect(() => {
    if (activeTab === 'all') fetchJobs()
    else if (activeTab === 'collaborations') fetchCollaborations()
    else if (activeTab === 'saved') fetchSavedJobs()
    else if (activeTab === 'applications') fetchUserApplications()
    else if (activeTab === 'my-jobs') fetchMyPostedJobs()
  }, [filters, activeTab])

  useEffect(() => {
    if (activeTab === 'staffing') fetchStaffingJobs()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'hiring') {
      if (selectedHiringJobId) fetchHiringApplications(selectedHiringJobId)
      else fetchMyPostedJobs()
    }
  }, [activeTab, selectedHiringJobId])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/artist-jobs/categories')
      const data = await response.json()
      if (data.success) setCategories(data.data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.set(key, Array.isArray(value) ? value.join(',') : value.toString())
        }
      })
      const response = await fetch(`/api/artist-jobs?${queryParams}`)
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.data)
        setJobs(data.data.jobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSavedJobs = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/artist-jobs/saved')
      const data = await response.json()
      if (data.success) setSavedJobs(data.data)
    } catch (error) {
      console.error('Error fetching saved jobs:', error)
      toast({ title: 'Unable to load saved jobs', description: 'Please refresh and try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCollaborations = async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.set(key, Array.isArray(value) ? value.join(',') : value.toString())
        }
      })
      queryParams.set('job_type', 'collaboration')
      const response = await fetch(`/api/artist-jobs?${queryParams}`)
      const data = await response.json()
      if (data.success) setCollaborations(data.data.jobs)
    } catch (error) {
      console.error('Error fetching collaborations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserApplications = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/artist-jobs/applications?format=cards')
      const data = await response.json()
      if (data.success) setUserApplications(data.data || [])
    } catch (error) {
      console.error('Error fetching user applications:', error)
      toast({ title: 'Unable to load applications', description: 'Please refresh and try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeaturedJobs = async () => {
    try {
      const response = await fetch('/api/artist-jobs?featured_only=true&per_page=5')
      const data = await response.json()
      if (data.success) setFeaturedJobs(data.data.jobs)
    } catch (error) {
      console.error('Error fetching featured jobs:', error)
    }
  }

  const fetchStaffingJobs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/jobs?merge=1&per_page=40', { credentials: 'include' })
      const result = await response.json()
      if (result.success && Array.isArray(result.data?.unified)) {
        setStaffingJobs(result.data.unified)
      } else if (result.success && Array.isArray(result.data?.staff_postings)) {
        const rows = result.data.staff_postings as Record<string, unknown>[]
        setStaffingJobs(
          rows.map((r) => ({
            source: 'venue',
            id: r.id,
            title: r.title,
            organization_name: (r as { venue?: { name?: string } }).venue?.name ?? null,
            location: r.location,
            experience_level: r.experience_level,
            employment_type: r.employment_type,
            applications_count: Number(r.applications_count ?? 0),
            views_count: Number(r.views_count ?? 0),
            urgent: Boolean(r.urgent),
            detail_href: `/jobs/${r.id}?source=venue`,
          }))
        )
      } else setStaffingJobs([])
    } catch (error) {
      console.error('Error fetching staffing jobs:', error)
      setStaffingJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyPostedJobs = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.set(key, Array.isArray(value) ? value.join(',') : value.toString())
        }
      })
      const response = await fetch(`/api/artist-jobs?posted_by=me&include_all_statuses=true`)
      const data = await response.json()
      if (data.success) {
        const postedJobs = (data.data?.jobs || data.data || [])
        setMyPostedJobs(postedJobs)
      }
    } catch (error) {
      console.error('Error fetching my posted jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHiringApplications = async (jobId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/artist-jobs/${jobId}/applications`)
      const data = await response.json()
      if (data.success) setHiringApplications(data.data || [])
    } catch (error) {
      console.error('Error fetching hiring applications:', error)
      toast({ title: 'Unable to load applicants', description: 'Please refresh and try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveJob = async (jobId: string) => {
    if (!user) return
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'save' }),
      })
      if (response.ok) setSavedJobs(prev => [...prev, jobs.find(job => job.id === jobId)!])
    } catch (error) {
      console.error('Error saving job:', error)
      toast({ title: 'Save failed', description: 'Could not save this job right now.', variant: 'destructive' })
    }
  }

  const handleUnsaveJob = async (jobId: string) => {
    if (!user) return
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, action: 'unsave' }),
      })
      if (response.ok) setSavedJobs(prev => prev.filter(job => job.id !== jobId))
    } catch (error) {
      console.error('Error unsaving job:', error)
      toast({ title: 'Update failed', description: 'Could not remove this saved job right now.', variant: 'destructive' })
    }
  }

  const handleApplyToJob = async (jobId: string) => {
    if (!user?.email) { router.push('/login'); return }
    try {
      void trackDashboardUxEvent({ eventName: 'job_apply_started', surface: 'jobs_dashboard', metadata: { jobId, accountType: currentAccount?.account_type ?? 'unknown' } })
      const response = await fetch(`/api/artist-jobs/${jobId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, contact_email: user.email, preferred_contact_method: 'email' }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to apply to job')
      await fetchJobs()
      await fetchUserApplications()
      setActiveTab('applications')
      toast({ title: 'Application submitted', description: 'Your application is now visible in the Applications tab.' })
    } catch (error) {
      console.error('Error applying to job:', error)
      toast({ title: 'Application failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const handleJobStatusChange = async (jobId: string, status: string) => {
    try {
      const response = await fetch(`/api/artist-jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: 'Status updated', description: `Job status changed to ${status}.` })
      setMyPostedJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: status as any } : j))
      if (status === 'open') fetchJobs()
    } catch (error) {
      toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Could not update status.', variant: 'destructive' })
    }
  }

  const handleRepostJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/artist-jobs/${jobId}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: 'Job reposted', description: 'A new copy of this job has been created and is now live.' })
      setMyPostedJobs(prev => [data.data, ...prev])
      fetchJobs()
    } catch (error) {
      toast({ title: 'Repost failed', description: error instanceof Error ? error.message : 'Could not repost.', variant: 'destructive' })
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return
    try {
      const response = await fetch(`/api/artist-jobs/${jobId}`, { method: 'DELETE' })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: 'Job deleted', description: 'The posting has been removed.' })
      setMyPostedJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (error) {
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Could not delete.', variant: 'destructive' })
    }
  }

  const handleApplicationStatusChange = async (jobId: string, applicationId: string, status: string) => {
    try {
      const response = await fetch(`/api/artist-jobs/${jobId}/applications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      toast({ title: 'Application updated', description: `Application moved to ${status}.` })
      setHiringApplications(prev => prev.map(a => a.id === applicationId ? { ...a, status } : a))
    } catch (error) {
      toast({ title: 'Update failed', description: error instanceof Error ? error.message : 'Could not update.', variant: 'destructive' })
    }
  }

  const handleJobCreated = (newJob: any) => {
    setJobs(prev => [newJob, ...prev])
    if (searchResults) {
      setSearchResults(prev => prev ? { ...prev, jobs: [newJob, ...prev.jobs], total_count: prev.total_count + 1 } : prev)
    }
    toast({ title: 'Job posted', description: 'Your job is now live on the board.' })
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    if (tab !== 'hiring') params.delete('jobId')
    router.replace(`/jobs?${params.toString()}`)
    void trackDashboardUxEvent({ eventName: 'jobs_tab_changed', surface: 'jobs_dashboard', metadata: { tab, accountType: currentAccount?.account_type ?? 'unknown' } })
    setFilters({ sort_by: 'created_at', sort_order: 'desc', page: 1, per_page: 20 })
  }

  const getStaffingJobHref = (job: any) => {
    if (job?.detail_href && typeof job.detail_href === 'string') return job.detail_href
    const id = job?.template_id || job?.id
    if (!id || typeof id !== 'string') return null
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    return isUuid ? `/jobs/${id}?source=venue` : null
  }

  const getDisplayJobs = () => {
    switch (activeTab) {
      case 'collaborations': return collaborations
      case 'saved': return savedJobs
      case 'applications': return userApplications
      case 'staffing': return staffingJobs
      case 'my-jobs': return myPostedJobs
      default: return jobs
    }
  }

  const stats = [
    { label: "Total Jobs", value: searchResults?.total_count || 0, icon: Briefcase, color: "from-blue-500 to-cyan-500" },
    { label: "Collaborations", value: collaborations.length, icon: Users, color: "from-purple-500 to-blue-500" },
    { label: "Featured", value: featuredJobs.length, icon: Star, color: "from-yellow-500 to-orange-500" },
    { label: "Saved", value: savedJobs.length, icon: Bookmark, color: "from-purple-500 to-pink-500" },
  ]

  const staffingWorkflowLinks = [
    { title: 'Staffing board', description: 'Published roles with credential and agreement-aware application flow.', href: '/jobs?tab=staffing', icon: Briefcase },
    {
      title: 'Staff operations health',
      description: isAdminAccount ? 'Monitor staffing API health, alerts, and self-heal controls.' : 'Track your submitted staffing applications and status updates.',
      href: isAdminAccount ? '/admin/dashboard/staff' : '/jobs?tab=applications',
      icon: Activity,
    },
    {
      title: isAdminAccount ? 'Tour workflow timeline' : 'Applications overview',
      description: isAdminAccount ? 'Inspect task/message activity with filterable workflow events.' : 'Review your active applications and next hiring milestones.',
      href: isAdminAccount ? '/admin/dashboard/tours?tab=overview&workflowFilter=automation&workflowDialog=1' : '/jobs?tab=applications',
      icon: MessageCircle,
    },
  ] as const

  const applicationStatusCounts = hiringApplications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-40" />
      
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header */}
        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SurfaceHero className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <motion.div 
                className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600 flex items-center justify-center shadow-2xl border border-white/10"
                whileHover={{ rotate: 360, scale: 1.1, transition: { duration: 0.6, ease: "easeInOut" } }}
              >
                <Briefcase className="w-8 h-8 text-white drop-shadow-sm" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                  Jobs & Opportunities
                </h1>
                <p className="text-slate-300 text-lg mt-1">
                  Find paid roles, build collaborations, and manage your hiring pipeline.
                </p>
              </div>
            </div>
            <motion.div whileHover={{ y: -4, scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 17 } }}>
              <Button
                onClick={() => setIsJobModalOpen(true)}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-white shadow-xl transition-all duration-300 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/25"
              >
                <Plus className="h-5 w-5 mr-2" />
                Post a Job
              </Button>
            </motion.div>
          </SurfaceHero>
        </motion.div>

        {user ? <MyStaffingApplications /> : null}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="mb-8">
          <SurfaceCard className="bg-slate-800/30 border-slate-700/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                Opportunities operations hub
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {staffingWorkflowLinks.map((item) => (
                <a key={item.title} href={item.href} className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-3 transition-colors hover:border-slate-500 hover:bg-slate-900/70">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-purple-300" />
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                </a>
              ))}
            </CardContent>
          </SurfaceCard>
        </motion.div>

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-8">
            <SurfaceCard className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="h-6 w-6 text-yellow-400" />
                  <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Featured Opportunities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredJobs.map((job, index) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}>
                      <JobCard job={job} onSave={handleSaveJob} onUnsave={handleUnsaveJob} onApply={handleApplyToJob} compact={true} />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </SurfaceCard>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -4, scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 17 } }}>
              <SurfaceCard className="bg-slate-800/30 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </SurfaceCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content */}
        <motion.div className="grid lg:grid-cols-4 gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          {/* Filters Sidebar */}
          {activeTab !== 'hiring' && (
            <motion.div className="lg:col-span-1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <JobFilters filters={filters} onFiltersChange={setFilters} categories={categories} isLoading={isLoading} />
            </motion.div>
          )}

          {/* Jobs List / Hiring Pipeline */}
          <motion.div className={activeTab === 'hiring' ? 'lg:col-span-4' : 'lg:col-span-3'} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <SurfaceTabsList className="mb-6 grid w-full grid-cols-7 backdrop-blur-xl">
                <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <Briefcase className="h-4 w-4 mr-1" />All
                </TabsTrigger>
                <TabsTrigger value="collaborations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <Users className="h-4 w-4 mr-1" />Collabs
                </TabsTrigger>
                <TabsTrigger value="saved" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <Bookmark className="h-4 w-4 mr-1" />Saved
                </TabsTrigger>
                <TabsTrigger value="applications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <MessageCircle className="h-4 w-4 mr-1" />Applied
                </TabsTrigger>
                <TabsTrigger value="staffing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <Building2 className="h-4 w-4 mr-1" />Staffing
                </TabsTrigger>
                <TabsTrigger value="my-jobs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <ClipboardList className="h-4 w-4 mr-1" />My Jobs
                </TabsTrigger>
                <TabsTrigger value="hiring" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300">
                  <UserCheck className="h-4 w-4 mr-1" />Hiring
                </TabsTrigger>
              </SurfaceTabsList>

              {/* Hiring Pipeline Tab */}
              <TabsContent value="hiring" className="space-y-4">
                {!selectedHiringJobId ? (
                  <div className="space-y-4">
                    <SurfaceCard className="bg-slate-800/30 p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">Select a job to manage applicants</h3>
                      <p className="text-slate-400 text-sm mb-4">Choose one of your posted jobs to review and manage applications.</p>
                    </SurfaceCard>
                    {myPostedJobs.filter(j => j.applications_count > 0).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <UserCheck className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No applicants yet</h3>
                        <p className="text-slate-400">When people apply to your jobs, you can manage them here.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {myPostedJobs.filter(j => j.applications_count > 0).map((job) => (
                          <SurfaceCard key={job.id} className="bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer transition-all"
                            onClick={() => {
                              setSelectedHiringJobId(job.id)
                              const params = new URLSearchParams(searchParams.toString())
                              params.set('jobId', job.id)
                              router.replace(`/jobs?${params.toString()}`)
                            }}>
                            <CardContent className="p-4 flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-medium">{job.title}</h4>
                                <p className="text-slate-400 text-sm">{job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}</p>
                              </div>
                              <Badge className="bg-purple-600">{job.status}</Badge>
                            </CardContent>
                          </SurfaceCard>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" onClick={() => { setSelectedHiringJobId(null); setHiringApplications([]) }} className="text-slate-300 hover:text-white">
                        &larr; Back to all jobs
                      </Button>
                      <div className="flex items-center gap-2 flex-wrap">
                        {Object.entries(applicationStatusCounts).map(([status, count]) => (
                          <Badge key={status} variant="outline" className="border-slate-600 text-slate-300 capitalize">
                            {status}: {String(count)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                      </div>
                    ) : hiringApplications.length === 0 ? (
                      <div className="text-center py-12">
                        <UserCheck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No applicants yet</h3>
                        <p className="text-slate-400">Share your job to get more applicants.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {hiringApplications.map((app) => (
                          <SurfaceCard key={app.id} className="bg-slate-800/30">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h4 className="text-white font-medium">{app.applicant_name || app.contact_email || 'Applicant'}</h4>
                                  {app.contact_email && <p className="text-slate-400 text-sm">{app.contact_email}</p>}
                                  {app.cover_letter && <p className="text-slate-300 text-sm mt-2 line-clamp-2">{app.cover_letter}</p>}
                                  {app.experience_description && <p className="text-slate-400 text-xs mt-1">{app.experience_description}</p>}
                                  <p className="text-slate-500 text-xs">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={cn(
                                    'capitalize',
                                    app.status === 'pending' && 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
                                    app.status === 'reviewed' && 'bg-blue-600/20 text-blue-400 border-blue-600/30',
                                    app.status === 'shortlisted' && 'bg-purple-600/20 text-purple-400 border-purple-600/30',
                                    app.status === 'accepted' && 'bg-green-600/20 text-green-400 border-green-600/30',
                                    app.status === 'rejected' && 'bg-red-600/20 text-red-400 border-red-600/30',
                                    app.status === 'withdrawn' && 'bg-gray-600/20 text-gray-400 border-gray-600/30',
                                  )}>
                                    {app.status}
                                  </Badge>
                                </div>
                              </div>
                              {app.portfolio_links?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {app.portfolio_links.map((link: string, i: number) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 underline">Portfolio {i + 1}</a>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {app.status === 'pending' && (
                                  <>
                                    <Button size="sm" variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                                      onClick={() => handleApplicationStatusChange(selectedHiringJobId!, app.id, 'reviewed')}>
                                      <Eye className="w-3 h-3 mr-1" /> Review
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
                                      onClick={() => handleApplicationStatusChange(selectedHiringJobId!, app.id, 'shortlisted')}>
                                      <Star className="w-3 h-3 mr-1" /> Shortlist
                                    </Button>
                                  </>
                                )}
                                {(app.status === 'reviewed' || app.status === 'shortlisted') && (
                                  <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleApplicationStatusChange(selectedHiringJobId!, app.id, 'accepted')}>
                                      <CheckCircle2 className="w-3 h-3 mr-1" /> Accept
                                    </Button>
                                    {app.status === 'reviewed' && (
                                      <Button size="sm" variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
                                        onClick={() => handleApplicationStatusChange(selectedHiringJobId!, app.id, 'shortlisted')}>
                                        <Star className="w-3 h-3 mr-1" /> Shortlist
                                      </Button>
                                    )}
                                  </>
                                )}
                                {!['accepted', 'rejected', 'withdrawn'].includes(app.status) && (
                                  <Button size="sm" variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20"
                                    onClick={() => handleApplicationStatusChange(selectedHiringJobId!, app.id, 'rejected')}>
                                    <XCircle className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </SurfaceCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* My Jobs Management Tab */}
              <TabsContent value="my-jobs" className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                        <span className="text-slate-300">Loading your postings...</span>
                      </div>
                    </motion.div>
                  ) : myPostedJobs.length > 0 ? (
                    <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4">
                      {myPostedJobs.map((job, index) => (
                        <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}>
                          <JobCard
                            job={job}
                            onSave={handleSaveJob}
                            onUnsave={handleUnsaveJob}
                            isOwner={true}
                            onStatusChange={handleJobStatusChange}
                            onRepost={handleRepostJob}
                            onDelete={handleDeleteJob}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center py-12">
                      <div className="max-w-md mx-auto">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <ClipboardList className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No posted jobs yet</h3>
                        <p className="text-slate-400 mb-6">Create your first job posting to start receiving applications.</p>
                        <Button onClick={() => setIsJobModalOpen(true)} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                          <Plus className="h-4 w-4 mr-2" />Post a Job
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* Standard Job Tabs (all, collaborations, saved, applications, staffing) */}
              {['all', 'collaborations', 'saved', 'applications', 'staffing'].map(tabValue => (
                <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                          <span className="text-slate-300">Loading opportunities...</span>
                        </div>
                      </motion.div>
                    ) : getDisplayJobs().length > 0 ? (
                      <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4">
                        {getDisplayJobs().map((job, index) => (
                          <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }}
                            whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 17 } }}>
                            {tabValue === 'staffing' ? (
                              <a href={getStaffingJobHref(job as any) || '#'} className="block">
                                <SurfaceCard className="bg-slate-800/30 transition-all duration-300 hover:bg-slate-800/50">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-white flex items-center gap-2">
                                      <Briefcase className="h-5 w-5 text-purple-400" />
                                      <span>{(job as any).title}</span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="text-slate-300 text-sm">
                                    <div className="flex flex-wrap items-center gap-3">
                                      {(job as any).source && (
                                        <Badge variant="outline" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50 capitalize">
                                          {(job as any).source === 'artist' ? 'Artist board' : 'Venue staffing'}
                                        </Badge>
                                      )}
                                      {(job as any).organization_name && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                          <Building2 className="h-3.5 w-3.5 mr-1" />{(job as any).organization_name}
                                        </Badge>
                                      )}
                                      {(job as any).location && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                          <MapPin className="h-3.5 w-3.5 mr-1" />{(job as any).location}
                                        </Badge>
                                      )}
                                      {(job as any).experience_level && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                          <Target className="h-3.5 w-3.5 mr-1" />{(job as any).experience_level}
                                        </Badge>
                                      )}
                                      {(job as any).employment_type && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50 capitalize">{(job as any).employment_type}</Badge>
                                      )}
                                      {Number.isFinite(Number((job as any).applications_count)) && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                          <Users className="h-3.5 w-3.5 mr-1" />{Number((job as any).applications_count)} applications
                                        </Badge>
                                      )}
                                      {Number.isFinite(Number((job as any).views_count)) && (
                                        <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                          <Eye className="h-3.5 w-3.5 mr-1" />{Number((job as any).views_count)} views
                                        </Badge>
                                      )}
                                      {(job as any).urgent && <Badge className="rounded-lg border-red-600/30 bg-red-600/20 text-red-300">Urgent</Badge>}
                                    </div>
                                    {!getStaffingJobHref(job as any) && (
                                      <p className="text-xs text-amber-300 mt-3">This posting is syncing. Details will be available shortly.</p>
                                    )}
                                  </CardContent>
                                </SurfaceCard>
                              </a>
                            ) : (
                              <JobCard
                                job={job}
                                onSave={handleSaveJob}
                                onUnsave={handleUnsaveJob}
                                onApply={handleApplyToJob}
                                showApplicationStatus={tabValue === 'applications'}
                              />
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-center py-12">
                        <div className="max-w-md mx-auto">
                          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                            <Briefcase className="h-12 w-12 text-slate-400" />
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-2">
                            {tabValue === 'saved' ? 'No saved roles yet' : 
                             tabValue === 'applications' ? 'No applications yet' : 
                             tabValue === 'collaborations' ? 'No collaboration roles found' :
                             tabValue === 'staffing' ? 'No staffing roles found' :
                             'No roles found'}
                          </h3>
                          <p className="text-slate-400 mb-6">
                            {tabValue === 'saved' ? 'Saved roles show up here for quick follow-up.' : 
                             tabValue === 'applications' ? 'Your submitted applications will appear here.' : 
                             tabValue === 'collaborations' ? 'No collaboration opportunities are live right now. Check back soon or post one.' :
                             tabValue === 'staffing' ? 'No staffing positions are available right now.' :
                             'Adjust filters or check back soon for fresh opportunities.'}
                          </p>
                          {tabValue === 'all' && (
                            <Button onClick={() => setIsJobModalOpen(true)} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                              <Plus className="h-4 w-4 mr-2" />Post a Job
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      <JobPostingModal isOpen={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} onJobCreated={handleJobCreated} categories={categories} />
    </div>
  )
}
