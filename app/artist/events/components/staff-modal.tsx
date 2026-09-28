"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { StaffMember } from "./event-operations"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  status: z.enum(["confirmed", "pending", "declined"]),
  contact: z.string().min(1, "Contact information is required"),
})

interface StaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<StaffMember, "id" | "event_id">) => void
  initialData?: StaffMember
}

export function StaffModal({ isOpen, onClose, onSubmit, initialData }: StaffModalProps) {
  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: initialData || {
      name: "",
      role: "",
      status: "pending",
      contact: "",
    },
  })

  const handleSubmit = (data: z.infer<typeof staffSchema>) => {
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
            {initialData ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className={detailSurfacePattern.label}>Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              className={detailSurfacePattern.input}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className={detailSurfacePattern.label}>Role</Label>
            <Input
              id="role"
              {...form.register("role")}
              className={detailSurfacePattern.input}
            />
            {form.formState.errors.role && (
              <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
            )}
          </div>

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
                <SelectItem value="confirmed" className="text-white">Confirmed</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
                <SelectItem value="declined" className="text-white">Declined</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-red-500">{form.formState.errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" className={detailSurfacePattern.label}>Contact Information</Label>
            <Input
              id="contact"
              {...form.register("contact")}
              className={detailSurfacePattern.input}
            />
            {form.formState.errors.contact && (
              <p className="text-sm text-red-500">{form.formState.errors.contact.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className={detailSurfacePattern.btnOutline}>
              Cancel
            </Button>
            <Button type="submit" className={detailSurfacePattern.btnPrimary}>
              {initialData ? "Save Changes" : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
