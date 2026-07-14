"use client"

import type React from "react"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type TaskStatus = "completed" | "in-progress" | "not-started"

export interface Task {
  id: string
  name: string
  status: TaskStatus
  dueDate: string
  description?: string
}

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Omit<Task, "id">) => void
  task?: Task
  title?: string
}

export function TaskDialog({ open, onOpenChange, onSave, task, title = "Add Task" }: TaskDialogProps) {
  const [name, setName] = useState(task?.name || "")
  const [status, setStatus] = useState<TaskStatus>(task?.status || "not-started")
  const [dueDate, setDueDate] = useState(task?.dueDate || new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState(task?.description || "")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave({
      name,
      status,
      dueDate,
      description,
    })
    resetForm()
  }

  function resetForm() {
    if (!task) {
      setName("")
      setStatus("not-started")
      setDueDate(new Date().toISOString().split("T")[0])
      setDescription("")
    }
  }

  function handleStatusChange(value: string) {
    setStatus(value as TaskStatus)
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDueDate(e.target.value)
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value)
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Fill out the form below to {task ? "update the" : "create a new"} task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-300">
                Task Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                className="bg-slate-800 border-slate-700 text-slate-100"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-slate-300">
                Status
              </Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate" className="text-slate-300">
                Due Date
              </Label>
              <div className="relative">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={handleDueDateChange}
                  className="bg-slate-800 border-slate-700 text-slate-100 pl-10"
                  required
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-slate-300">
                Description (Optional)
              </Label>
              <textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                className="min-h-[80px] rounded-md border bg-slate-800 border-slate-700 text-slate-100 p-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              {task ? "Update" : "Create"} Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
