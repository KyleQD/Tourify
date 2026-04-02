"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NeoDateInput } from "@/components/ui/neo-date-input"

const schema = z.object({
  name: z.string().min(2, "Event name is required"),
  type: z.string().min(2, "Type is required"),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(2, "Location is required"),
  objectives: z.string().optional()
})

export interface EventWizardStep1Data {
  name: string
  type: string
  date: string
  location: string
  objectives?: string
}

interface EventWizardStep1Props {
  onNext: (data: EventWizardStep1Data) => void
  defaultValues?: Partial<EventWizardStep1Data>
}

export function EventWizardStep1({ onNext, defaultValues }: EventWizardStep1Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EventWizardStep1Data>({
    resolver: zodResolver(schema),
    defaultValues
  })

  function onSubmit(data: EventWizardStep1Data) {
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input placeholder="Event Name" {...register("name")}/>
        {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>}
      </div>
      <div>
        <Input placeholder="Type (e.g. Concert, Festival)" {...register("type")}/>
        {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type.message}</div>}
      </div>
      <div>
        <NeoDateInput placeholder="Date" {...register("date")} />
        {errors.date && <div className="text-red-500 text-xs mt-1">{errors.date.message}</div>}
      </div>
      <div>
        <Input placeholder="Location" {...register("location")}/>
        {errors.location && <div className="text-red-500 text-xs mt-1">{errors.location.message}</div>}
      </div>
      <div>
        <Input placeholder="Objectives (optional)" {...register("objectives")}/>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">Next</Button>
    </form>
  )
} 