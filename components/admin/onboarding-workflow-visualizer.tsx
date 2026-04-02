"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Eye,
  MessageSquare,
  Calendar,
  User,
  Building,
  FileText,
  Send,
  Users,
  Award,
  Target,
  Zap,
  ArrowRight,
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Info
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface WorkflowStep {
  id: string
  stage: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  started_at?: string
  completed_at?: string
  assigned_to?: string
  notes?: string
  metadata?: Record<string, any>
}

interface Workflow {
  id: string
  venue_id: string
  candidate_id: string
  job_posting_id?: string
  current_stage: string
  status: string
  steps: WorkflowStep[]
  created_at: string
  updated_at: string
  estimated_completion?: string
  actual_completion?: string
  candidate?: {
    name: string
    email: string
    position: string
    department: string
    avatar_url?: string
  }
}

interface OnboardingWorkflowVisualizerProps {
  venueId: string
  onWorkflowUpdate?: (workflowId: string, newStage: string) => void
  onViewCandidate?: (candidateId: string) => void
  onSendMessage?: (candidateId: string) => void
}

const WORKFLOW_STAGES = [
  { id: 'job_posted', name: 'Job Posted', icon: Building, color: 'bg-blue-500' },
  { id: 'application_received', name: 'Application Received', icon: FileText, color: 'bg-green-500' },
  { id: 'screening', name: 'Screening', icon: Eye, color: 'bg-yellow-500' },
  { id: 'invitation_sent', name: 'Invitation Sent', icon: Send, color: 'bg-purple-500' },
  { id: 'onboarding_started', name: 'Onboarding Started', icon: Play, color: 'bg-indigo-500' },
  { id: 'onboarding_completed', name: 'Onboarding Completed', icon: CheckCircle, color: 'bg-emerald-500' },
  { id: 'review_pending', name: 'Review Pending', icon: Clock, color: 'bg-orange-500' },
  { id: 'approved', name: 'Approved', icon: Award, color: 'bg-green-600' },
  { id: 'team_assigned', name: 'Team Assigned', icon: Users, color: 'bg-teal-500' }
]

export default function OnboardingWorkflowVisualizer({
  venueId,
  onWorkflowUpdate,
  onViewCandidate,
  onSendMessage
}: OnboardingWorkflowVisualizerProps) {
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [showWorkflowDetail, setShowWorkflowDetail] = useState(false)
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchWorkflows()
    fetchAnalytics()
  }, [venueId])

  async function fetchWorkflows() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/onboarding/workflows?venue_id=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching workflows:", error)
      toast({
        title: "Error",
        description: "Failed to fetch workflows",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnalytics() {
    try {
      const response = await fetch(`/api/admin/onboarding/workflows/analytics?venue_id=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  async function advanceWorkflow(workflowId: string, newStage: string) {
    try {
      const response = await fetch('/api/admin/onboarding/workflows/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, new_stage: newStage })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Workflow advanced successfully"
        })
        fetchWorkflows()
        onWorkflowUpdate?.(workflowId, newStage)
      }
    } catch (error) {
      console.error("Error advancing workflow:", error)
      toast({
        title: "Error",
        description: "Failed to advance workflow",
        variant: "destructive"
      })
    }
  }

  function getStageIndex(stage: string): number {
    return WORKFLOW_STAGES.findIndex(s => s.id === stage)
  }

  function getWorkflowProgress(workflow: Workflow): number {
    const currentIndex = getStageIndex(workflow.current_stage)
    return currentIndex >= 0 ? ((currentIndex + 1) / WORKFLOW_STAGES.length) * 100 : 0
  }

  function getStageStatus(workflow: Workflow, stageId: string): 'completed' | 'active' | 'pending' {
    const stageIndex = getStageIndex(stageId)
    const currentIndex = getStageIndex(workflow.current_stage)
    
    if (stageIndex < currentIndex) return 'completed'
    if (stageIndex === currentIndex) return 'active'
    return 'pending'
  }

  function getFilteredWorkflows() {
    return workflows.filter(workflow => {
      const matchesStage = filterStage === 'all' || workflow.current_stage === filterStage
      const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus
      const matchesSearch = !searchTerm || 
        workflow.candidate?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.candidate?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.candidate?.position?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStage && matchesStatus && matchesSearch
    })
  }

  const filteredWorkflows = getFilteredWorkflows()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-2">Loading workflows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Workflows</p>
                  <p className="text-2xl font-bold text-white">{analytics.total_workflows}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">{analytics.active_workflows}</p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{analytics.completed_workflows}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Avg Duration</p>
                  <p className="text-2xl font-bold text-white">{analytics.average_duration_days}d</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Stages</option>
                {WORKFLOW_STAGES.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <div className="space-y-4">
        {filteredWorkflows.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No workflows found</h3>
              <p className="text-slate-400">No workflows match your current filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={workflow.candidate?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        {workflow.candidate?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{workflow.candidate?.name}</h3>
                      <p className="text-slate-400">{workflow.candidate?.position} • {workflow.candidate?.department}</p>
                      <p className="text-slate-500 text-sm">{workflow.candidate?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={workflow.status === 'active' ? 'bg-green-600' : workflow.status === 'completed' ? 'bg-emerald-600' : 'bg-slate-600'}>
                      {workflow.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWorkflow(workflow)
                        setShowWorkflowDetail(true)
                      }}
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Progress</span>
                    <span className="text-sm text-white font-medium">{Math.round(getWorkflowProgress(workflow))}%</span>
                  </div>
                  <Progress value={getWorkflowProgress(workflow)} className="h-2" />
                </div>

                {/* Workflow Stages */}
                <div className="grid grid-cols-1 lg:grid-cols-9 gap-2 mb-4">
                  {WORKFLOW_STAGES.map((stage, index) => {
                    const status = getStageStatus(workflow, stage.id)
                    const Icon = stage.icon
                    
                    return (
                      <div key={stage.id} className="flex flex-col items-center">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium
                          ${status === 'completed' ? 'bg-green-600' : 
                            status === 'active' ? 'bg-blue-600' : 'bg-slate-600'}
                        `}>
                          {status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        {index < WORKFLOW_STAGES.length - 1 && (
                          <div className={`
                            w-full h-0.5 mt-2
                            ${status === 'completed' ? 'bg-green-600' : 'bg-slate-600'}
                          `} />
                        )}
                        <span className="text-xs text-slate-400 mt-1 text-center hidden lg:block">
                          {stage.name}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>Started {formatSafeDate(workflow.created_at)}</span>
                    {workflow.estimated_completion && (
                      <>
                        <span>•</span>
                        <span>Est. {formatSafeDate(workflow.estimated_completion)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {onViewCandidate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewCandidate(workflow.candidate_id)}
                        className="border-slate-600 hover:bg-slate-800"
                      >
                        <User className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    {onSendMessage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSendMessage(workflow.candidate_id)}
                        className="border-slate-600 hover:bg-slate-800"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    )}
                    {workflow.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const currentIndex = getStageIndex(workflow.current_stage)
                          const nextStage = WORKFLOW_STAGES[currentIndex + 1]
                          if (nextStage) {
                            advanceWorkflow(workflow.id, nextStage.id)
                          }
                        }}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Advance
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Workflow Detail Dialog */}
      <Dialog open={showWorkflowDetail} onOpenChange={setShowWorkflowDetail}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Workflow Details</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-6">
              {/* Candidate Info */}
              <div className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedWorkflow.candidate?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {selectedWorkflow.candidate?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedWorkflow.candidate?.name}</h3>
                  <p className="text-slate-400">{selectedWorkflow.candidate?.position} • {selectedWorkflow.candidate?.department}</p>
                  <p className="text-slate-500">{selectedWorkflow.candidate?.email}</p>
                </div>
              </div>

              {/* Workflow Steps */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Workflow Steps</h4>
                {selectedWorkflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-4 p-4 bg-slate-800/50 rounded-lg">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium
                      ${step.status === 'completed' ? 'bg-green-600' : 
                        step.status === 'active' ? 'bg-blue-600' : 'bg-slate-600'}
                    `}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : step.status === 'active' ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-medium">{step.stage.replace('_', ' ')}</h5>
                      <p className="text-slate-400 text-sm">{step.notes || 'No notes'}</p>
                      {step.started_at && (
                        <p className="text-slate-500 text-xs">Started: {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(step.started_at))}</p>
                      )}
                      {step.completed_at && (
                        <p className="text-slate-500 text-xs">Completed: {new Intl.DateTimeFormat("en-US", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(step.completed_at))}</p>
                      )}
                    </div>
                    <Badge className={step.status === 'completed' ? 'bg-green-600' : step.status === 'active' ? 'bg-blue-600' : 'bg-slate-600'}>
                      {step.status}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWorkflowDetail(false)}
                  className="border-slate-600"
                >
                  Close
                </Button>
                {selectedWorkflow.status === 'active' && (
                  <Button
                    onClick={() => {
                      const currentIndex = getStageIndex(selectedWorkflow.current_stage)
                      const nextStage = WORKFLOW_STAGES[currentIndex + 1]
                      if (nextStage) {
                        advanceWorkflow(selectedWorkflow.id, nextStage.id)
                        setShowWorkflowDetail(false)
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Advance to Next Stage
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 