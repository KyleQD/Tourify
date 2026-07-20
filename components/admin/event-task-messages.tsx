"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { featureUnavailableMessage, isFeatureUnavailableResponse } from "@/lib/api/feature-unavailable"
import {
  Send,
  Plus,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  Upload,
  FileText,
  Users,
  Loader2,
  ArrowRight,
  XCircle,
  Lock,
  Eye,
} from "lucide-react"
import { getAllTaskActions } from "@/lib/messaging/task-link-registry"
import type { TaskAction } from "@/lib/messaging/task-link-registry"

interface EventTaskMessagesProps {
  eventId: string
  isAdmin: boolean
  userRole: string
}

interface TaskMessage {
  id: string
  event_id: string
  sender_id: string
  sender_name: string
  recipient_ids: string[]
  task_action: string
  title: string
  description?: string
  action_url: string
  priority: string
  due_date?: string
  is_sensitive: boolean
  require_completion: boolean
  status: string
  completed_by: string[]
  created_at: string
}

const PRIORITY_STYLES: Record<string, { bg: string; label: string }> = {
  low: { bg: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Low' },
  normal: { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Normal' },
  high: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'High' },
  urgent: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Urgent' },
}

const STATUS_STYLES: Record<string, { bg: string; label: string; icon: typeof Clock }> = {
  pending: { bg: 'bg-yellow-500/20 text-yellow-400', label: 'Pending', icon: Clock },
  in_progress: { bg: 'bg-blue-500/20 text-blue-400', label: 'In Progress', icon: ArrowRight },
  completed: { bg: 'bg-green-500/20 text-green-400', label: 'Completed', icon: CheckCircle },
  cancelled: { bg: 'bg-slate-500/20 text-slate-400', label: 'Cancelled', icon: XCircle },
}

function buildFetchInit(extra?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...extra,
    headers: { 'Cache-Control': 'no-cache', ...(extra?.headers || {}) },
  }
}

export function EventTaskMessages({ eventId, isAdmin, userRole }: EventTaskMessagesProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const taskActions = getAllTaskActions()

  const [newTask, setNewTask] = useState({
    recipient_ids: [] as string[],
    task_action: 'upload_documents' as TaskAction,
    title: '',
    description: '',
    priority: 'normal',
    due_date: '',
    is_sensitive: false,
    require_completion: true,
  })

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const res = await fetch(`/api/admin/events/${eventId}/task-messages?${params}`, buildFetchInit())
      const data = await res.json()
      if (data.success) setTasks(data.tasks || [])
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId, filterStatus])

  useEffect(() => { void fetchTasks() }, [fetchTasks])

  async function handleCreate() {
    if (!newTask.title.trim()) {
      toast.error('Title is required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/task-messages`, buildFetchInit({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          recipient_ids: newTask.recipient_ids.length > 0 ? newTask.recipient_ids : ['placeholder'],
          context: { eventId },
        }),
      }))
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (isFeatureUnavailableResponse(res.status, err))
          throw new Error(featureUnavailableMessage(err, 'Task messages are temporarily unavailable.'))
        throw new Error(err.error || 'Failed')
      }
      toast.success('Task assigned successfully')
      setShowCreate(false)
      setNewTask({
        recipient_ids: [],
        task_action: 'upload_documents',
        title: '',
        description: '',
        priority: 'normal',
        due_date: '',
        is_sensitive: false,
        require_completion: true,
      })
      await fetchTasks()
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign task')
    } finally {
      setCreating(false)
    }
  }

  async function handleAction(taskId: string, action: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/task-messages`, buildFetchInit({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, action }),
      }))
      if (!res.ok) throw new Error()
      toast.success(action === 'complete' ? 'Task marked complete' : 'Task cancelled')
      await fetchTasks()
    } catch {
      toast.error('Action failed')
    }
  }

  function navigateToTask(task: TaskMessage) {
    if (task.action_url) {
      router.push(task.action_url)
    }
  }

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Task Assignments</h3>
          <p className="text-sm text-slate-400">
            {isAdmin ? 'Assign tasks with direct action links to team members' : 'Your assigned tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Plus className="mr-1 h-4 w-4" /> Assign Task
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Send className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">
              {isAdmin ? 'No tasks assigned yet. Assign tasks with direct links to team members.' : 'No tasks assigned to you.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal
            const status = STATUS_STYLES[task.status] || STATUS_STYLES.pending
            const StatusIcon = status.icon
            const completionCount = task.completed_by?.length || 0
            const totalRecipients = task.recipient_ids?.length || 1

            return (
              <Card key={task.id} className={`bg-slate-900/50 border-slate-700/50 ${task.is_sensitive ? 'ring-1 ring-amber-500/20' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${status.bg.includes('text-') ? status.bg.split(' ').find(c => c.startsWith('text-')) : 'text-slate-400'}`} />
                        <h4 className="font-semibold text-white text-sm">{task.title}</h4>
                        <Badge className={priority.bg}>{priority.label}</Badge>
                        <Badge className={status.bg}>{status.label}</Badge>
                        {task.is_sensitive && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            <Lock className="h-3 w-3 mr-1" /> Sensitive
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-slate-400 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>From: {task.sender_name}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                          </span>
                        )}
                        {task.require_completion && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {completionCount}/{totalRecipients} completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          onClick={() => navigateToTask(task)}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs h-7 px-3"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Go to Task
                        </Button>
                      )}
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(task.id, 'complete')}
                          className="border-green-600/50 text-green-400 hover:bg-green-600/10 text-xs h-7 px-2"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                      {isAdmin && task.status !== 'cancelled' && task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(task.id, 'cancel')}
                          className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Task</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a task with a direct action link. Recipients will be notified and can navigate directly to complete it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Task Type</Label>
              <Select
                value={newTask.task_action}
                onValueChange={(v) => {
                  const action = taskActions.find(a => a.value === v)
                  setNewTask(p => ({
                    ...p,
                    task_action: v as TaskAction,
                    title: p.title || action?.label || '',
                    is_sensitive: action?.isSensitive || false,
                  }))
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 max-h-60">
                  {taskActions.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      <div className="flex items-center gap-2">
                        {action.isSensitive && <Lock className="h-3 w-3 text-amber-400" />}
                        <span>{action.label}</span>
                        <span className="text-xs text-slate-500 ml-1">({action.category})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
                placeholder="Additional instructions..."
                rows={3}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.is_sensitive}
                  onCheckedChange={(v) => setNewTask(p => ({ ...p, is_sensitive: v }))}
                />
                <Label className="text-slate-300 text-sm flex items-center gap-1">
                  <Shield className="h-3 w-3 text-amber-400" /> Sensitive material
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.require_completion}
                  onCheckedChange={(v) => setNewTask(p => ({ ...p, require_completion: v }))}
                />
                <Label className="text-slate-300 text-sm">Track completion</Label>
              </div>
            </div>
            {newTask.is_sensitive && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                  This task involves sensitive material. All access will be logged and files will be stored with encryption. Only admins can view uploaded documents.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-purple-600 hover:bg-purple-700">
              {creating ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
