"use client"

import { useState } from "react"
import { Plus, CheckCircle2, Circle, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface User {
  id: string
  name: string
  avatar?: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assignee?: User
  dueDate?: Date
  createdAt: Date
}

interface TasksProps {
  tasks: Task[]
  users: User[]
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void
}

export function Tasks({ tasks, users, onAddTask, onUpdateTask }: TasksProps) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTask, setNewTask] = useState<{
    title: string
    description: string
    status: 'todo' | 'in_progress' | 'completed'
    priority: 'low' | 'medium' | 'high'
    assigneeId: string
    dueDate: string
  }>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigneeId: '',
    dueDate: ''
  })

  const handleAddTask = async () => {
    if (!newTask.title) return

    setIsSubmitting(true)
    try {
      if (onAddTask) {
        const assignee = users.find(user => user.id === newTask.assigneeId)
        await onAddTask({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          assignee: assignee,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined
        })
      }
      setShowAddTask(false)
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assigneeId: '',
        dueDate: ''
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'in_progress':
        return <Circle className="w-4 h-4 text-yellow-500" />
      default:
        return <Circle className="w-4 h-4 text-slate-500" />
    }
  }

  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-200">Tasks</h2>
        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task and assign it to a team member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200 min-h-[100px]"
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Assignee</label>
                  <select
                    value={newTask.assigneeId}
                    onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-200"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddTask(false)}
                className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                disabled={isSubmitting || !newTask.title}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Task'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(['todo', 'in_progress', 'completed'] as const).map(status => (
          <Card key={status} className="bg-slate-900/70 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-300 capitalize">
                {status.replace('_', ' ')}
                <Badge variant="outline" className="ml-2 text-xs">
                  {tasksByStatus[status].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasksByStatus[status].map(task => (
                  <div
                    key={task.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => onUpdateTask?.(task.id, {
                            status: task.status === 'completed' ? 'todo' : 'completed'
                          })}
                          className="mt-1"
                        >
                          {getStatusIcon(task.status)}
                        </button>
                        <div>
                          <h4 className="font-medium text-slate-200">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-300"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[160px] bg-slate-900 border-slate-700"
                        >
                          <DropdownMenuItem
                            onClick={() => onUpdateTask?.(task.id, { status: 'todo' })}
                            className="text-slate-300 focus:text-slate-200 focus:bg-slate-800"
                          >
                            Mark as Todo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateTask?.(task.id, { status: 'in_progress' })}
                            className="text-slate-300 focus:text-slate-200 focus:bg-slate-800"
                          >
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdateTask?.(task.id, { status: 'completed' })}
                            className="text-slate-300 focus:text-slate-200 focus:bg-slate-800"
                          >
                            Mark as Completed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        {task.assignee && (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="bg-slate-800 text-slate-400">
                                {task.assignee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-slate-400">{task.assignee.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {task.dueDate && (
                          <span className="text-slate-400">
                            {formatSafeDate(task.dueDate.toISOString())}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={getPriorityColor(task.priority)}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 