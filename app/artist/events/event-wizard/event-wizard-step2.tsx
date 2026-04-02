"use client"

import React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NeoDateInput } from "@/components/ui/neo-date-input"

const taskSchema = z.object({
  title: z.string().min(2, "Task title required"),
  dueDate: z.string().min(1, "Due date required")
})

const schema = z.object({
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  tasks: z.array(taskSchema).min(1, "At least one task required")
})

export interface EventWizardStep2Data {
  startDate: string
  endDate: string
  tasks: { title: string; dueDate: string }[]
}

interface EventWizardStep2Props {
  onNext: (data: EventWizardStep2Data) => void
  defaultValues?: Partial<EventWizardStep2Data>
}

export function EventWizardStep2({ onNext, defaultValues }: EventWizardStep2Props) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<EventWizardStep2Data>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { tasks: [{ title: "", dueDate: "" }] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: "tasks" })

  function onSubmit(data: EventWizardStep2Data) {
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input type="datetime-local" placeholder="Start Date & Time" {...register("startDate")}/>
        {errors.startDate && <div className="text-red-500 text-xs mt-1">{errors.startDate.message}</div>}
      </div>
      <div>
        <Input type="datetime-local" placeholder="End Date & Time" {...register("endDate")}/>
        {errors.endDate && <div className="text-red-500 text-xs mt-1">{errors.endDate.message}</div>}
      </div>
      <div>
        <div className="font-semibold text-white mb-2">Tasks & Milestones</div>
        {fields.map((field, idx) => (
          <div key={field.id} className="flex gap-2 mb-2 items-end">
            <Input placeholder="Task Title" {...register(`tasks.${idx}.title` as const)} />
            <NeoDateInput placeholder="Due Date" {...register(`tasks.${idx}.dueDate` as const)} />
            <Button type="button" variant="destructive" onClick={() => remove(idx)} disabled={fields.length === 1}>Remove</Button>
          </div>
        ))}
        {errors.tasks && <div className="text-red-500 text-xs mt-1">{errors.tasks.message as string}</div>}
        <Button type="button" variant="secondary" onClick={() => append({ title: "", dueDate: "" })} className="mt-2">Add Task</Button>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">Next</Button>
    </form>
  )
} 