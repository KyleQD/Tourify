"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Task } from "./event-operations"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigned_to: z.string().min(1, "Assignee is required"),
  due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
})

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<Task, "id" | "event_id">) => void
  initialData?: Task
  staffMembers: { id: string; name: string }[]
}

export function TaskModal({ isOpen, onClose, onSubmit, initialData, staffMembers }: TaskModalProps) {
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData || {
      title: "",
      description: "",
      assigned_to: "",
      due_date: new Date().toISOString().split('T')[0],
      status: "pending",
      priority: "medium",
    },
  })

  const handleSubmit = (data: z.infer<typeof taskSchema>) => {
    onSubmit(data)
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("sm:max-w-[425px]", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={detailSurfacePattern.title}>
            {initialData ? "Edit Task" : "Add Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className={detailSurfacePattern.label}>Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              className={detailSurfacePattern.input}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              className={detailSurfacePattern.textarea}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to" className={detailSurfacePattern.label}>Assign To</Label>
            <Select
              value={form.watch("assigned_to")}
              onValueChange={(value) => form.setValue("assigned_to", value)}
            >
              <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {staffMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id} className="text-white">
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.assigned_to && (
              <p className="text-sm text-red-500">{form.formState.errors.assigned_to.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date" className={detailSurfacePattern.label}>Due Date</Label>
            <Input
              id="due_date"
              type="date"
              {...form.register("due_date")}
              className={detailSurfacePattern.input}
            />
            {form.formState.errors.due_date && (
              <p className="text-sm text-red-500">{form.formState.errors.due_date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className={detailSurfacePattern.label}>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => form.setValue("status", value as any)}
              >
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className={detailSurfacePattern.label}>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) => form.setValue("priority", value as any)}
              >
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="low" className="text-white">Low</SelectItem>
                  <SelectItem value="medium" className="text-white">Medium</SelectItem>
                  <SelectItem value="high" className="text-white">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className={detailSurfacePattern.btnOutline}>
              Cancel
            </Button>
            <Button type="submit" className={detailSurfacePattern.btnPrimary}>
              {initialData ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
