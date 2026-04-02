"use client"

import { useState, useEffect } from 'react'
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
  Briefcase, 
  Plus, 
  Bookmark, 
  TrendingUp, 
  Filter, 
  Star,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Eye,
  Sparkles,
  Zap,
  Target,
  Search,
  Loader2,
  Building2,
  Music,
  Mic,
  MessageCircle
} from 'lucide-react'
import { 
  ArtistJob, 
  ArtistJobCategory, 
  JobSearchFilters, 
  JobSearchResults 
} from '@/types/artist-jobs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function JobsPage() {
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<ArtistJob[]>([])
  const [collaborations, setCollaborations] = useState<ArtistJob[]>([])
  const [categories, setCategories] = useState<ArtistJobCategory[]>([])
  const [savedJobs, setSavedJobs] = useState<ArtistJob[]>([])
  const [userApplications, setUserApplications] = useState<ArtistJob[]>([])
  const [featuredJobs, setFeaturedJobs] = useState<ArtistJob[]>([])
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

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
    fetchFeaturedJobs()
  }, [])

  // Fetch jobs when filters change
  useEffect(() => {
    if (activeTab === 'all') {
      fetchJobs()
    } else if (activeTab === 'collaborations') {
      fetchCollaborations()
    } else if (activeTab === 'saved') {
      fetchSavedJobs()
    } else if (activeTab === 'applications') {
      fetchUserApplications()
    }
  }, [filters, activeTab])

  useEffect(() => {
    if (activeTab === 'staffing') fetchStaffingJobs()
  }, [activeTab])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/artist-jobs/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
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
          if (Array.isArray(value)) {
            queryParams.set(key, value.join(','))
          } else {
            queryParams.set(key, value.toString())
          }
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
      if (data.success) {
        setSavedJobs(data.data)
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error)
      toast({
        title: 'Unable to load saved jobs',
        description: 'Please refresh and try again.',
        variant: 'destructive',
      })
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
          if (Array.isArray(value)) {
            queryParams.set(key, value.join(','))
          } else {
            queryParams.set(key, value.toString())
          }
        }
      })
      // Add collaboration filter
      queryParams.set('job_type', 'collaboration')

      const response = await fetch(`/api/artist-jobs?${queryParams}`)
      const data = await response.json()
      if (data.success) {
        setCollaborations(data.data.jobs)
      }
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
      toast({
        title: 'Unable to load applications',
        description: 'Please refresh and try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeaturedJobs = async () => {
    try {
      const response = await fetch('/api/artist-jobs?featured_only=true&per_page=5')
      const data = await response.json()
      if (data.success) {
        setFeaturedJobs(data.data.jobs)
      }
    } catch (error) {
      console.error('Error fetching featured jobs:', error)
    }
  }

  const fetchStaffingJobs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/job-board')
      const result = await response.json()
      if (result.success) setStaffingJobs(result.data)
    } catch (error) {
      console.error('Error fetching staffing jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveJob = async (jobId: string) => {
    if (!user) return
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId, action: 'save' }),
      })

      if (response.ok) {
        // Update saved jobs list
        setSavedJobs(prev => [...prev, jobs.find(job => job.id === jobId)!])
      }
    } catch (error) {
      console.error('Error saving job:', error)
      toast({
        title: 'Save failed',
        description: 'Could not save this job right now.',
        variant: 'destructive',
      })
    }
  }

  const handleUnsaveJob = async (jobId: string) => {
    if (!user) return
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId, action: 'unsave' }),
      })

      if (response.ok) {
        // Remove from saved jobs list
        setSavedJobs(prev => prev.filter(job => job.id !== jobId))
      }
    } catch (error) {
      console.error('Error unsaving job:', error)
      toast({
        title: 'Update failed',
        description: 'Could not remove this saved job right now.',
        variant: 'destructive',
      })
    }
  }

  const handleApplyToJob = async (jobId: string) => {
    if (!user?.email) {
      router.push('/login')
      return
    }

    try {
      const response = await fetch(`/api/artist-jobs/${jobId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          contact_email: user.email,
          preferred_contact_method: 'email',
        }),
      })

      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to apply to job')
      await fetchJobs()
      await fetchUserApplications()
      setActiveTab('applications')
      toast({
        title: 'Application submitted',
        description: 'Your application is now visible in the Applications tab.',
      })
    } catch (error) {
      console.error('Error applying to job:', error)
      toast({
        title: 'Application failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleJobCreated = (newJob: any) => {
    try {
      console.log('New job created:', newJob.title)
      
      // Add the new job to the current jobs list
      setJobs(prevJobs => {
        const newJobs = [newJob, ...prevJobs]
        return newJobs
      })
      
      // Update search results if they exist
      if (searchResults) {
        setSearchResults(prev => prev ? {
          ...prev,
          jobs: [newJob, ...prev.jobs],
          total_count: prev.total_count + 1
        } : prev)
      }
      
      console.log('Job successfully added to the jobs board')
    } catch (error) {
      console.error('Error adding job to list:', error)
      // If there's an error, we should still try to refresh the data
      if (activeTab === 'all') {
        fetchJobs()
      }
    }
  }

  const handleFiltersChange = (newFilters: JobSearchFilters) => {
    setFilters(newFilters)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setFilters({
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 20
    })
  }

  const getStaffingJobHref = (job: any) => {
    const id = job?.template_id || job?.id
    if (!id) return null
    if (typeof id !== 'string') return null
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    if (!isUuid) return null
    return `/jobs/${id}`
  }

  const getDisplayJobs = () => {
    switch (activeTab) {
      case 'collaborations':
        return collaborations
      case 'saved':
        return savedJobs
      case 'applications':
        return userApplications
      case 'staffing':
        return staffingJobs
      default:
        return jobs
    }
  }

  const stats = [
    {
      label: "Total Jobs",
      value: searchResults?.total_count || 0,
      icon: Briefcase,
      color: "from-blue-500 to-cyan-500"
    },
    {
      label: "Collaborations",
      value: collaborations.length,
      icon: Users,
      color: "from-purple-500 to-blue-500"
    },
    {
      label: "Featured",
      value: featuredJobs.length,
      icon: Star,
      color: "from-yellow-500 to-orange-500"
    },
    {
      label: "Saved",
      value: savedJobs.length,
      icon: Bookmark,
      color: "from-purple-500 to-pink-500"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-40" />
      
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SurfaceHero className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <motion.div 
                className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600 flex items-center justify-center shadow-2xl border border-white/10"
                whileHover={{ 
                  rotate: 360,
                  scale: 1.1,
                  transition: { duration: 0.6, ease: "easeInOut" }
                }}
              >
                <Briefcase className="w-8 h-8 text-white drop-shadow-sm" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                  Jobs & Opportunities
                </h1>
                <p className="text-slate-300 text-lg mt-1">
                  Find paid roles, build collaborations, and move faster on real opportunities.
                </p>
              </div>
            </div>
            <motion.div
              whileHover={{ 
                y: -4, 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              className="group"
            >
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

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <SurfaceCard className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Star className="h-6 w-6 text-yellow-400" />
                  <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Featured Opportunities
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    >
                      <JobCard
                        job={job}
                        onSave={handleSaveJob}
                        onUnsave={handleUnsaveJob}
                        onApply={handleApplyToJob}
                        compact={true}
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </SurfaceCard>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              whileHover={{ 
                y: -4,
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
            >
              <SurfaceCard className="bg-slate-800/30 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <motion.p 
                        className="text-2xl font-bold text-white"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      >
                        {stat.value}
                      </motion.p>
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
        <motion.div 
          className="grid lg:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Filters Sidebar */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <JobFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Jobs List */}
          <motion.div 
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <SurfaceTabsList className="mb-6 grid w-full grid-cols-5 backdrop-blur-xl">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  All Jobs
                </TabsTrigger>
                <TabsTrigger 
                  value="collaborations" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Collaborations
                </TabsTrigger>
                <TabsTrigger 
                  value="saved" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
                <TabsTrigger 
                  value="applications" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Applications
                </TabsTrigger>
              <TabsTrigger 
                value="staffing" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Staffing
              </TabsTrigger>
              </SurfaceTabsList>

              <TabsContent value={activeTab} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-12"
                    >
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
                        <span className="text-slate-300">Loading opportunities...</span>
                      </div>
                    </motion.div>
                  ) : getDisplayJobs().length > 0 ? (
                    <motion.div 
                      key="jobs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid gap-4"
                    >
                      {getDisplayJobs().map((job, index) => (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          whileHover={{ 
                            y: -4,
                            transition: { type: "spring", stiffness: 400, damping: 17 }
                          }}
                        >
                          {activeTab === 'staffing' ? (
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
                                    {(job as any).organization_name && (
                                      <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                        <Building2 className="h-3.5 w-3.5 mr-1" />
                                        {(job as any).organization_name}
                                      </Badge>
                                    )}
                                    {(job as any).location && (
                                      <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                        <MapPin className="h-3.5 w-3.5 mr-1" />
                                        {(job as any).location}
                                      </Badge>
                                    )}
                                    {(job as any).experience_level && (
                                      <Badge variant="secondary" className="surface-chip rounded-lg border-slate-600/50 bg-slate-700/50">
                                        <Target className="h-3.5 w-3.5 mr-1" />
                                        {(job as any).experience_level}
                                      </Badge>
                                    )}
                                    {(job as any).urgent && (
                                      <Badge className="rounded-lg border-red-600/30 bg-red-600/20 text-red-300">Urgent</Badge>
                                    )}
                                  </div>
                                  {!getStaffingJobHref(job as any) && (
                                    <p className="text-xs text-amber-300 mt-3">
                                      This posting is syncing. Details will be available shortly.
                                    </p>
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
                            />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-center py-12"
                    >
                      <div className="max-w-md mx-auto">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <Briefcase className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {activeTab === 'saved' ? 'No saved roles yet' : 
                           activeTab === 'applications' ? 'No applications yet' : 
                           activeTab === 'collaborations' ? 'No collaboration roles found' :
                           'No roles found'}
                        </h3>
                        <p className="text-slate-400 mb-6">
                          {activeTab === 'saved' ? 'Saved roles show up here for quick follow-up.' : 
                           activeTab === 'applications' ? 'Your submitted applications will appear here.' : 
                           activeTab === 'collaborations' ? 'No collaboration opportunities are live right now. Check back soon or post one.' :
                           'Adjust filters or check back soon for fresh opportunities.'}
                        </p>
                        {activeTab === 'all' && (
                          <Button
                            onClick={() => setIsJobModalOpen(true)}
                            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Post a Job
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {/* Job Posting Modal */}
      <JobPostingModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onJobCreated={handleJobCreated}
        categories={categories}
      />
    </div>
  )
} 