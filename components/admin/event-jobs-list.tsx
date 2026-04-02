"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Eye,
  ExternalLink,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EventJob {
  id: string
  title: string
  description: string
  category_id: string
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
  job_type: string
  payment_type: string
  payment_amount?: number
  payment_currency: string
  location: string
  event_date: string
  event_time?: string
  duration_hours?: number
  deadline?: string
  required_skills: string[]
  required_experience: string
  benefits: string[]
  status: string
  priority: string
  featured: boolean
  applications_count: number
  views_count: number
  created_at: string
  updated_at: string
}

interface EventJobsListProps {
  eventId: string
}

export function EventJobsList({ eventId }: EventJobsListProps) {
  const [jobs, setJobs] = useState<EventJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<EventJob | null>(null)

  useEffect(() => {
    fetchEventJobs()
  }, [eventId])

  const fetchEventJobs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/events/${eventId}/jobs`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event jobs')
      }

      const data = await response.json()
      if (data.success) {
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error fetching event jobs:', error)
      toast.error('Failed to load event jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400'
      case 'closed': return 'bg-red-500/20 text-red-400'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/20 text-orange-400'
      case 'normal': return 'bg-blue-500/20 text-blue-400'
      case 'low': return 'bg-green-500/20 text-green-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getJobTypeDisplay = (jobType: string) => {
    return jobType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPaymentDisplay = (job: EventJob) => {
    if (job.payment_type === 'paid' && job.payment_amount) {
      return `${job.payment_currency} ${job.payment_amount}`
    }
    return job.payment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return new Intl.DateTimeFormat("en-US", {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(`2000-01-01T${timeString}`))
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Jobs Posted Yet</h3>
          <p className="text-slate-400 mb-4">
            You haven't posted any jobs for this event yet. Post a job to find crew members and staff.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Posted Jobs ({jobs.length})</h3>
        <Button
          variant="outline"
          onClick={fetchEventJobs}
          className="border-slate-600 text-slate-300"
        >
          <Clock className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id} className="bg-slate-900/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-lg font-semibold text-white">{job.title}</h4>
                    {job.featured && (
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Star className="mr-1 h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  <p className="text-slate-300 mb-4 line-clamp-2">{job.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{getJobTypeDisplay(job.job_type)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{getPaymentDisplay(job)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{formatDate(job.event_date)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-300">{job.location || 'TBD'}</span>
                    </div>
                  </div>

                  {job.required_skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-slate-400 mb-2">Required Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-slate-700 text-slate-300">
                            {skill}
                          </Badge>
                        ))}
                        {job.required_skills.length > 5 && (
                          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                            +{job.required_skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <Badge className={getPriorityColor(job.priority)}>
                        {job.priority}
                      </Badge>
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Users className="h-4 w-4" />
                        <span>{job.applications_count} applications</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Eye className="h-4 w-4" />
                        <span>{job.views_count} views</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJob(job)}
                        className="border-slate-600 text-slate-300"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/artist/jobs/${job.id}`, '_blank')}
                        className="border-slate-600 text-slate-300"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on Job Board
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">{selectedJob.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-slate-300 font-medium mb-2">Description</h4>
                <p className="text-white">{selectedJob.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Job Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white">{getJobTypeDisplay(selectedJob.job_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment:</span>
                      <span className="text-white">{getPaymentDisplay(selectedJob)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="text-white capitalize">{selectedJob.required_experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <Badge className={getStatusColor(selectedJob.status)}>
                        {selectedJob.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Event Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="text-white">{formatDate(selectedJob.event_date)}</span>
                    </div>
                    {selectedJob.event_time && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time:</span>
                        <span className="text-white">{formatTime(selectedJob.event_time)}</span>
                      </div>
                    )}
                    {selectedJob.duration_hours && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white">{selectedJob.duration_hours} hours</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="text-white">{selectedJob.location || 'TBD'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedJob.required_skills.length > 0 && (
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.required_skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-slate-700 text-slate-300">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.benefits.length > 0 && (
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.benefits.map((benefit) => (
                      <Badge key={benefit} className="bg-green-500/20 text-green-400">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{selectedJob.applications_count} applications</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{selectedJob.views_count} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>Posted {formatDate(selectedJob.created_at)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => window.open(`/artist/jobs/${selectedJob.id}`, '_blank')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Job Board
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 