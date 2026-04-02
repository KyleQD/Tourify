"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
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
  Loader2
} from 'lucide-react'
import { 
  ArtistJob, 
  ArtistJobCategory, 
  JobSearchFilters, 
  JobSearchResults 
} from '@/types/artist-jobs'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

export default function JobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<ArtistJob[]>([])
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

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
    fetchFeaturedJobs()
  }, [])

  // Fetch jobs when filters change
  useEffect(() => {
    if (activeTab === 'all') {
      fetchJobs()
    } else if (activeTab === 'saved') {
      fetchSavedJobs()
    } else if (activeTab === 'applications') {
      fetchUserApplications()
    }
  }, [filters, activeTab])

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

  const fetchUserApplications = async () => {
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

  const handleSaveJob = async (jobId: string) => {
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId, action: 'save' }),
      })
      
      if (response.ok) {
        // Update the job in the current list
        setJobs(jobs.map(job => 
          job.id === jobId ? { ...job, is_saved: true } : job
        ))
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
    try {
      const response = await fetch('/api/artist-jobs/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId, action: 'unsave' }),
      })
      
      if (response.ok) {
        // Update the job in the current list
        setJobs(jobs.map(job => 
          job.id === jobId ? { ...job, is_saved: false } : job
        ))
        
        // Remove from saved jobs if we're on that tab
        if (activeTab === 'saved') {
          setSavedJobs(savedJobs.filter(job => job.id !== jobId))
        }
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
      if (!data.success) throw new Error(data.error || 'Failed to apply')
      await fetchJobs()
      await fetchUserApplications()
      setActiveTab('applications')
      toast({
        title: 'Application submitted',
        description: 'Your application is now visible in Applications.',
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

  const getDisplayJobs = () => {
    switch (activeTab) {
      case 'saved':
        return savedJobs
      case 'applications':
        return userApplications
      default:
        return jobs
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-40" />
      
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
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
                Find gigs, collaborations, and music industry opportunities
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
              className={cn(
                "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600",
                "hover:from-purple-700 hover:via-fuchsia-700 hover:to-pink-700",
                "transition-all duration-300 text-white font-semibold",
                "shadow-2xl border border-purple-500/30 hover:border-purple-400/50",
                "backdrop-blur-sm relative overflow-hidden h-12 px-6"
              )}
              onClick={() => setIsJobModalOpen(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Plus className="w-4 h-4 mr-2" />
              Post a Job
            </Button>
          </motion.div>
        </motion.div>

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card className={cn(
              "border-gradient-to-r from-yellow-500/30 to-purple-500/30 bg-gradient-to-br",
              "from-yellow-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl",
              "border border-yellow-500/20 hover:border-yellow-400/30 transition-all duration-300",
              "hover:shadow-2xl hover:shadow-yellow-500/10 relative overflow-hidden"
            )}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-3">
                  <motion.div
                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
                    whileHover={{ 
                      rotate: 360,
                      transition: { duration: 0.6, ease: "easeInOut" }
                    }}
                  >
                    <Star className="w-5 h-5 text-white" />
                  </motion.div>
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
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {[
            { 
              icon: Briefcase, 
              label: "Total Jobs", 
              value: searchResults?.total_count || 0,
              color: "from-purple-500 to-fuchsia-600",
              textColor: "text-purple-400"
            },
            { 
              icon: Users, 
              label: "Applications", 
              value: userApplications.length,
              color: "from-blue-500 to-cyan-600",
              textColor: "text-blue-400"
            },
            { 
              icon: Bookmark, 
              label: "Saved Jobs", 
              value: savedJobs.length,
              color: "from-yellow-500 to-orange-600",
              textColor: "text-yellow-400"
            },
            { 
              icon: TrendingUp, 
              label: "This Week", 
              value: "12",
              color: "from-green-500 to-emerald-600",
              textColor: "text-green-400"
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ 
                y: -8, 
                scale: 1.03,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              className="group cursor-pointer"
            >
              <Card className={cn(
                "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                "border border-slate-700/30 backdrop-blur-xl",
                "transition-all duration-500 hover:border-slate-600/50",
                "hover:shadow-2xl hover:shadow-slate-900/50",
                "relative overflow-hidden"
              )}>
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                  stat.color
                )} />
                
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className={cn(
                        "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                        "border border-white/10 group-hover:border-white/20 transition-all duration-300",
                        stat.color
                      )}
                      whileHover={{ 
                        rotate: 360,
                        transition: { duration: 0.6, ease: "easeInOut" }
                      }}
                    >
                      <stat.icon className="w-5 h-5 text-white drop-shadow-sm" />
                    </motion.div>
                    <div>
                      <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                        {stat.label}
                      </p>
                      <motion.p 
                        className="text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent transition-all duration-300 group-hover:from-white group-hover:to-slate-100"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 rounded-xl p-1">
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white text-slate-300 transition-all duration-300 rounded-lg"
                >
                  All Jobs
                </TabsTrigger>
                <TabsTrigger 
                  value="saved"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white text-slate-300 transition-all duration-300 rounded-lg"
                >
                  Saved
                </TabsTrigger>
                <TabsTrigger 
                  value="applications"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white text-slate-300 transition-all duration-300 rounded-lg"
                >
                  Applications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center justify-center py-12"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-slate-300">Loading opportunities...</span>
                      </div>
                    </motion.div>
                  ) : jobs.length > 0 ? (
                    <motion.div 
                      key="jobs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid gap-4"
                    >
                      {jobs.map((job, index) => (
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
                          <JobCard
                            job={job}
                            onSave={handleSaveJob}
                            onUnsave={handleUnsaveJob}
                            onApply={handleApplyToJob}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Card className={cn(
                        "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                        "border border-slate-700/30 backdrop-blur-xl"
                      )}>
                        <CardContent className="py-12 text-center">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Briefcase className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400">No jobs found matching your criteria</p>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="saved" className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading-saved"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center justify-center py-12"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-slate-300">Loading saved jobs...</span>
                      </div>
                    </motion.div>
                  ) : savedJobs.length > 0 ? (
                    <motion.div 
                      key="saved-jobs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid gap-4"
                    >
                      {savedJobs.map((job, index) => (
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
                          <JobCard
                            job={job}
                            onSave={handleSaveJob}
                            onUnsave={handleUnsaveJob}
                            onApply={handleApplyToJob}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-saved"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Card className={cn(
                        "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                        "border border-slate-700/30 backdrop-blur-xl"
                      )}>
                        <CardContent className="py-12 text-center">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400">No saved jobs yet</p>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="applications" className="space-y-4">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading-applications"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center justify-center py-12"
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-8 h-8 border-4 border-blue-400/30 border-t-blue-400 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-slate-300">Loading applications...</span>
                      </div>
                    </motion.div>
                  ) : userApplications.length > 0 ? (
                    <motion.div 
                      key="user-applications"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid gap-4"
                    >
                      {userApplications.map((job, index) => (
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
                          <JobCard
                            job={job}
                            onSave={handleSaveJob}
                            onUnsave={handleUnsaveJob}
                            onApply={handleApplyToJob}
                            showApplicationStatus={true}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-applications"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Card className={cn(
                        "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                        "border border-slate-700/30 backdrop-blur-xl"
                      )}>
                        <CardContent className="py-12 text-center">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400">No applications yet</p>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>

            {/* Pagination */}
            {searchResults && searchResults.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    page: Math.max(1, filters.page! - 1)
                  })}
                  disabled={!searchResults.has_previous}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  Page {searchResults.page} of {searchResults.total_pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    page: filters.page! + 1
                  })}
                  disabled={!searchResults.has_next}
                >
                  Next
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
        
        {/* Job Posting Modal */}
        <JobPostingModal
          isOpen={isJobModalOpen}
          onClose={() => setIsJobModalOpen(false)}
          onJobCreated={handleJobCreated}
          categories={categories}
        />
      </div>
    </div>
  )
} 