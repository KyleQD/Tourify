"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { 
  Briefcase, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Edit, 
  Trash2, 
  Eye,
  Star,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock4
} from "lucide-react"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface Job {
  id: string
  title: string
  description: string
  category_id: string
  job_type: string
  payment_type: string
  payment_amount?: number
  location: string
  event_date: string
  status: string
  priority: string
  featured: boolean
  required_skills: string[]
  required_experience: string
  contact_email?: string
  contact_phone?: string
  external_link?: string
  created_at: string
  updated_at: string
}

interface TourJobsListProps {
  tourId: string
}

export function TourJobsList({ tourId }: TourJobsListProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [tourId])

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}/jobs`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      } else {
        console.error('Failed to fetch jobs')
        toast.error('Failed to load jobs')
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      toast.error('Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteJob = async () => {
    if (!selectedJob) return

    try {
      const response = await fetch(`/api/artist-jobs/${selectedJob.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setJobs(jobs.filter(job => job.id !== selectedJob.id))
        toast.success('Job deleted successfully')
        setIsDeleteDialogOpen(false)
      } else {
        toast.error('Failed to delete job')
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error('Failed to delete job')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400'
      case 'closed': return 'bg-red-500/20 text-red-400'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <CheckCircle className="h-4 w-4" />
      case 'closed': return <XCircle className="h-4 w-4" />
      case 'draft': return <Clock4 className="h-4 w-4" />
      default: return <Clock4 className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/20 text-orange-400'
      case 'normal': return 'bg-blue-500/20 text-blue-400'
      case 'low': return 'bg-slate-500/20 text-slate-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading jobs...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tour Jobs</h2>
          <p className="text-slate-400">Jobs posted for this tour</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-slate-800/50 border-slate-600 text-slate-300">
            {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Grid */}
      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="bg-slate-900/50 border-slate-700/50 hover:bg-slate-900/70 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-white">{job.title}</h4>
                      {job.featured && (
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{job.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatSafeDate(job.event_date)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{job.payment_type === 'paid' ? `$${job.payment_amount}` : job.payment_type}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{job.required_experience}</span>
                      </div>
                    </div>

                    {job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {job.required_skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs bg-slate-800/50 border-slate-600 text-slate-300">
                            {skill}
                          </Badge>
                        ))}
                        {job.required_skills.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-slate-800/50 border-slate-600 text-slate-300">
                            +{job.required_skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span>Posted {formatSafeDate(job.created_at)}</span>
                      {job.contact_email && (
                        <span>• {job.contact_email}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(job.status)}>
                    {getStatusIcon(job.status)}
                    <span className="ml-1 capitalize">{job.status}</span>
                  </Badge>
                  <Badge className={getPriorityColor(job.priority)}>
                    <span className="capitalize">{job.priority}</span>
                  </Badge>
                  
                  <div className="flex items-center space-x-1">
                    {job.external_link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(job.external_link, '_blank')}
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedJob(job)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedJob(job)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Jobs Found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'No jobs match your current filters'
                : 'No jobs have been posted for this tour yet'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <p className="text-slate-500 text-sm">
                Use the "Post Tour Job" button above to create your first job posting
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Job</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Are you sure you want to delete "{selectedJob?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 