"use client"

import { CheckCircle, Clock, AlertCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { SlackService } from "../../lib/slack-service"
import type { Task, TaskStatus } from "./task-dialog"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface TaskCardProps {
  task: Task
  eventId: string
  eventName: string
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
}

export function TaskCard({ task, eventId, eventName, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    // First update the task status locally
    onStatusChange(taskId, status)

    // Then send notification to Slack if configured
    try {
      const config = await SlackService.getNotificationConfig(eventId)
      if (config) {
        // Only send notifications for configured events
        if (
          (status === "completed" && config.notifications.taskCompleted) ||
          (status !== "completed" && config.notifications.taskCreated)
        ) {
          const statusText =
            status === "completed" ? "completed" : status === "in-progress" ? "in progress" : "not started"
          await SlackService.sendTaskNotification(task.id, statusText)
        }
      }
    } catch (error) {
      console.error("Error sending Slack notification:", error)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="flex items-center">
        {task.status === "completed" ? (
          <CheckCircle className="h-5 w-5 mr-3 text-green-500" />
        ) : task.status === "in-progress" ? (
          <Clock className="h-5 w-5 mr-3 text-amber-500" />
        ) : (
          <AlertCircle className="h-5 w-5 mr-3 text-slate-500" />
        )}
        <div>
          <h4 className="font-medium text-slate-200">{task.name}</h4>
          <p className="text-sm text-slate-400">Due: {formatSafeDate(task.dueDate)}</p>
          {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          className={
            task.status === "completed"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : task.status === "in-progress"
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
          }
        >
          {task.status === "completed" ? "Completed" : task.status === "in-progress" ? "In Progress" : "Not Started"}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-100">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px] bg-slate-900 border-slate-700 text-slate-100">
            <DropdownMenuItem
              className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => onEdit(task)}
            >
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Task</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="cursor-pointer text-green-400 hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => handleStatusChange(task.id, "completed")}
              disabled={task.status === "completed"}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Mark Completed</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-amber-400 hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => handleStatusChange(task.id, "in-progress")}
              disabled={task.status === "in-progress"}
            >
              <Clock className="mr-2 h-4 w-4" />
              <span>Mark In Progress</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-slate-400 hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => handleStatusChange(task.id, "not-started")}
              disabled={task.status === "not-started"}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>Mark Not Started</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-slate-800 focus:bg-slate-800"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Task</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
