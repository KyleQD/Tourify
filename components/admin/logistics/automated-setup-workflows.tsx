"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  MapPin,
  Zap,
  Truck,
  Package,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Download,
  Upload,
  Activity,
  BarChart3,
  Timer,
  Target,
  ArrowRight,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlayCircle
} from "lucide-react"
import { EquipmentSetupWorkflow, EquipmentSetupTask } from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"

interface AutomatedSetupWorkflowsProps {
  vendorId: string
  siteMapId?: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  estimatedDuration: number
  taskCount: number
  requiredTeamSize: number
  complexity: 'simple' | 'medium' | 'complex'
  tags: string[]
}

interface WorkflowExecution {
  id: string
  workflowId: string
  name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  progress: number
  startTime?: string
  endTime?: string
  currentTask?: string
  teamMembers: string[]
  estimatedCompletion?: string
}

export function AutomatedSetupWorkflows({ vendorId, siteMapId }: AutomatedSetupWorkflowsProps) {
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<EquipmentSetupWorkflow[]>([])
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([])
  const [activeExecutions, setActiveExecutions] = useState<WorkflowExecution[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<EquipmentSetupWorkflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  // Create workflow form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    templateId: '',
    priority: 1,
    estimatedDuration: 0,
    teamLeader: '',
    teamMembers: [] as string[]
  })

  useEffect(() => {
    loadWorkflowData()
  }, [vendorId, siteMapId])

  const loadWorkflowData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockWorkflows: EquipmentSetupWorkflow[] = [
        {
          id: '1',
          siteMapId: 'site-1',
          name: 'Coachella Main Stage Setup',
          description: 'Complete setup of main stage sound, lighting, and power systems',
          isTemplate: false,
          estimatedDurationMinutes: 480,
          priority: 1,
          status: 'in_progress',
          scheduledStartTime: '2024-01-15T08:00:00Z',
          scheduledEndTime: '2024-01-15T16:00:00Z',
          actualStartTime: '2024-01-15T08:15:00Z',
          assignedTeamLeader: 'user-1',
          teamMembers: ['user-1', 'user-2', 'user-3', 'user-4'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: [
            {
              id: 'task-1',
              workflowId: '1',
              taskName: 'Unload and position sound equipment',
              description: 'Unload speakers, amplifiers, and mixing consoles from truck',
              taskType: 'setup',
              estimatedDurationMinutes: 60,
              requiredTools: ['forklift', 'hand truck', 'cable tester'],
              requiredSkills: ['heavy lifting', 'audio setup'],
              dependencies: [],
              status: 'completed',
              priority: 1,
              orderIndex: 0,
              photos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'task-2',
              workflowId: '1',
              taskName: 'Install lighting rigging',
              description: 'Install LED lights and stage lighting fixtures',
              taskType: 'setup',
              estimatedDurationMinutes: 90,
              requiredTools: ['scissor lift', 'rigging hardware', 'cable management'],
              requiredSkills: ['rigging', 'electrical'],
              dependencies: ['task-1'],
              status: 'in_progress',
              assignedTo: 'user-2',
              priority: 1,
              orderIndex: 1,
              photos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'task-3',
              workflowId: '1',
              taskName: 'Connect power distribution',
              description: 'Connect generators and power distribution boxes',
              taskType: 'power_connection',
              estimatedDurationMinutes: 120,
              requiredTools: ['power cables', 'distribution boxes', 'multimeter'],
              requiredSkills: ['electrical', 'safety protocols'],
              dependencies: ['task-2'],
              status: 'pending',
              priority: 1,
              orderIndex: 2,
              photos: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]
        },
        {
          id: '2',
          siteMapId: 'site-1',
          name: 'VIP Tent Installation',
          description: 'Setup luxury glamping tents for VIP guests',
          isTemplate: false,
          estimatedDurationMinutes: 240,
          priority: 2,
          status: 'planned',
          scheduledStartTime: '2024-01-16T09:00:00Z',
          scheduledEndTime: '2024-01-16T13:00:00Z',
          assignedTeamLeader: 'user-5',
          teamMembers: ['user-5', 'user-6'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: []
        }
      ]

      const mockTemplates: WorkflowTemplate[] = [
        {
          id: 'template-1',
          name: 'Standard Festival Stage Setup',
          description: 'Complete stage setup with sound, lighting, and power',
          category: 'stage',
          estimatedDuration: 480,
          taskCount: 12,
          requiredTeamSize: 6,
          complexity: 'complex',
          tags: ['stage', 'sound', 'lighting', 'power']
        },
        {
          id: 'template-2',
          name: 'Glamping Village Setup',
          description: 'Setup luxury tent accommodations',
          category: 'accommodation',
          estimatedDuration: 240,
          taskCount: 8,
          requiredTeamSize: 4,
          complexity: 'medium',
          tags: ['tents', 'furniture', 'utilities']
        },
        {
          id: 'template-3',
          name: 'Food Court Installation',
          description: 'Setup food vendor areas and utilities',
          category: 'catering',
          estimatedDuration: 180,
          taskCount: 6,
          requiredTeamSize: 3,
          complexity: 'simple',
          tags: ['catering', 'utilities', 'safety']
        }
      ]

      const mockExecutions: WorkflowExecution[] = [
        {
          id: 'exec-1',
          workflowId: '1',
          name: 'Coachella Main Stage Setup',
          status: 'running',
          progress: 65,
          startTime: '2024-01-15T08:15:00Z',
          currentTask: 'Install lighting rigging',
          teamMembers: ['user-1', 'user-2', 'user-3', 'user-4'],
          estimatedCompletion: '2024-01-15T15:30:00Z'
        }
      ]

      setWorkflows(mockWorkflows)
      setWorkflowTemplates(mockTemplates)
      setActiveExecutions(mockExecutions)
    } catch (error) {
      console.error('Error loading workflow data:', error)
      toast({
        title: "Error",
        description: "Failed to load workflow data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Calendar className="h-4 w-4" />
      case 'in_progress': case 'running': return <PlayCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'cancelled': case 'failed': return <XCircle className="h-4 w-4" />
      case 'on_hold': case 'paused': return <Pause className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'complex': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const calculateWorkflowProgress = (workflow: EquipmentSetupWorkflow) => {
    if (!workflow.tasks || workflow.tasks.length === 0) return 0
    const completedTasks = workflow.tasks.filter(task => task.status === 'completed').length
    return Math.round((completedTasks / workflow.tasks.length) * 100)
  }

  const createWorkflowFromTemplate = async (templateId: string) => {
    try {
      const template = workflowTemplates.find(t => t.id === templateId)
      if (!template) return

      // Create workflow from template logic here
      toast({
        title: "Success",
        description: `Workflow created from template: ${template.name}`
      })
      setShowTemplateDialog(false)
      loadWorkflowData()
    } catch (error) {
      console.error('Error creating workflow from template:', error)
      toast({
        title: "Error",
        description: "Failed to create workflow from template",
        variant: "destructive"
      })
    }
  }

  const startWorkflow = async (workflowId: string) => {
    try {
      // Start workflow execution logic here
      toast({
        title: "Success",
        description: "Workflow started successfully"
      })
      loadWorkflowData()
    } catch (error) {
      console.error('Error starting workflow:', error)
      toast({
        title: "Error",
        description: "Failed to start workflow",
        variant: "destructive"
      })
    }
  }

  const pauseWorkflow = async (workflowId: string) => {
    try {
      // Pause workflow execution logic here
      toast({
        title: "Success",
        description: "Workflow paused"
      })
      loadWorkflowData()
    } catch (error) {
      console.error('Error pausing workflow:', error)
      toast({
        title: "Error",
        description: "Failed to pause workflow",
        variant: "destructive"
      })
    }
  }

  const stopWorkflow = async (workflowId: string) => {
    try {
      // Square workflow execution logic here
      toast({
        title: "Success",
        description: "Workflow stopped"
      })
      loadWorkflowData()
    } catch (error) {
      console.error('Error stopping workflow:', error)
      toast({
        title: "Error",
        description: "Failed to stop workflow",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading setup workflows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automated Setup Workflows</h3>
          <p className="text-sm text-gray-600">
            Create and manage automated equipment setup procedures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                From Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workflow from Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4">
                  {workflowTemplates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => createWorkflowFromTemplate(template.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge className={getComplexityColor(template.complexity)}>
                          {template.complexity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.estimatedDuration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Settings className="h-3 w-3" />
                          {template.taskCount} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {template.requiredTeamSize} people
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Setup Workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter workflow name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter workflow description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={createForm.priority.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, priority: parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">High</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      value={createForm.estimatedDuration}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    // Create workflow logic here
                    setShowCreateDialog(false)
                    toast({
                      title: "Success",
                      description: "Workflow created successfully"
                    })
                  }}>
                    Create Workflow
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Workflow Executions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeExecutions.map((execution) => (
              <div key={execution.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <h4 className="font-medium">{execution.name}</h4>
                      <p className="text-sm text-gray-600">
                        {execution.currentTask && `Current: ${execution.currentTask}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(execution.status)}>
                      {execution.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => pauseWorkflow(execution.workflowId)}>
                        <Pause className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => stopWorkflow(execution.workflowId)}>
                        <Square className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-bold">{execution.progress}%</span>
                    </div>
                    <Progress value={execution.progress} className="h-2" />
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Team: {execution.teamMembers.length} members</p>
                    {execution.estimatedCompletion && (
                      <p>ETA: {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(execution.estimatedCompletion))}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows.map((workflow) => {
              const progress = calculateWorkflowProgress(workflow)
              return (
                <div key={workflow.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(workflow.status)}
                      <div>
                        <h4 className="font-medium">{workflow.name}</h4>
                        <p className="text-sm text-gray-600">{workflow.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(workflow.status)}>
                        {workflow.status.replace('_', ' ')}
                      </Badge>
                      <div className="flex gap-1">
                        {workflow.status === 'planned' && (
                          <Button variant="ghost" size="sm" onClick={() => startWorkflow(workflow.id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{workflow.estimatedDurationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{workflow.teamMembers.length} team members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span>{workflow.tasks?.length || 0} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-gray-500" />
                      <span>Priority {workflow.priority}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                  
                  {workflow.tasks && workflow.tasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium">Tasks:</h5>
                      <div className="space-y-1">
                        {workflow.tasks.slice(0, 3).map((task, index) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              {task.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                              {task.status === 'in_progress' && <PlayCircle className="h-3 w-3 text-blue-600" />}
                              {task.status === 'pending' && <Clock className="h-3 w-3 text-gray-400" />}
                              {task.status === 'failed' && <XCircle className="h-3 w-3 text-red-600" />}
                              <span className={task.status === 'completed' ? 'line-through text-gray-500' : ''}>
                                {task.taskName}
                              </span>
                            </div>
                          </div>
                        ))}
                        {workflow.tasks.length > 3 && (
                          <p className="text-xs text-gray-500">+{workflow.tasks.length - 3} more tasks</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflowTemplates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{template.name}</h4>
                  <Badge className={getComplexityColor(template.complexity)}>
                    {template.complexity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.estimatedDuration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    {template.taskCount} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {template.requiredTeamSize} people
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => createWorkflowFromTemplate(template.id)}
                >
                  Use Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
