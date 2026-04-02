"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NeoDateInput } from "@/components/ui/neo-date-input"
import { toast } from "sonner"
import { 
  Music,
  Check,
  X,
  Plus,
  Sparkles
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { dashboardCreatePattern, getStepPillClasses } from "@/components/dashboard/dashboard-create-pattern"

const eventSchema = z.object({
  eventTitle: z.string().min(1, "Event title is required").max(120, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  eventType: z.enum(["concert", "festival", "tour", "recording", "interview", "other"]).default("concert"),
  eventDate: z.string().min(1, "Event date is required"),
  doorsOpen: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venueName: z.string().min(1, "Venue name is required"),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  capacity: z.string().optional(),
  tags: z.array(z.string()).default([]),
  setlist: z.array(z.string()).default([]),
})

type EventFormData = z.infer<typeof eventSchema>

interface EnhancedEventCreatorProps {
  isOpen: boolean
  onClose: () => void
  onEventCreated?: (event: any) => void
  editingEvent?: any
}

export function EnhancedEventCreator({ 
  isOpen, 
  onClose, 
  onEventCreated, 
  editingEvent 
}: EnhancedEventCreatorProps) {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [newSetlistItem, setNewSetlistItem] = useState("")
  const closeModal = onClose

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventTitle: "",
      description: "",
      eventType: "concert",
      eventDate: new Date().toISOString().split("T")[0],
      doorsOpen: "18:30",
      startTime: "19:00",
      endTime: "22:00",
      venueName: "",
      address: "",
      city: "",
      state: "",
      country: "USA",
      capacity: "",
      tags: [],
      setlist: [],
    }
  })

  const watchedValues = watch()
  const stepLabels = ["Basic Info", "Venue & Time", "Capacity", "Metadata", "Review"] as const
  const totalSteps = stepLabels.length

  useEffect(() => {
    if (!isOpen) return

    const defaultValues: EventFormData = {
      eventTitle: editingEvent?.name ?? editingEvent?.title ?? "",
      description: editingEvent?.description ?? "",
      eventType: editingEvent?.event_type ?? "concert",
      eventDate: editingEvent?.event_date ?? new Date().toISOString().split("T")[0],
      doorsOpen: editingEvent?.doors_open ?? "18:30",
      startTime: editingEvent?.start_time ?? "19:00",
      endTime: editingEvent?.end_time ?? "22:00",
      venueName: editingEvent?.venue_name ?? "",
      address: editingEvent?.address ?? "",
      city: editingEvent?.city ?? "",
      state: editingEvent?.state ?? "",
      country: editingEvent?.country ?? "USA",
      capacity: editingEvent?.capacity ? String(editingEvent.capacity) : "",
      tags: editingEvent?.tags ?? [],
      setlist: editingEvent?.setlist ?? [],
    }

    reset(defaultValues)
    setCurrentStep(1)
  }, [editingEvent, isOpen, reset])

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !watchedValues.tags?.includes(newTag.trim())) {
      setValue('tags', [...(watchedValues.tags || []), newTag.trim()])
      setNewTag("")
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedValues.tags?.filter(tag => tag !== tagToRemove) || [])
  }

  // Add setlist item
  const addSetlistItem = () => {
    if (newSetlistItem.trim()) {
      setValue('setlist', [...(watchedValues.setlist || []), newSetlistItem.trim()])
      setNewSetlistItem("")
    }
  }

  // Remove setlist item
  const removeSetlistItem = (index: number) => {
    setValue('setlist', watchedValues.setlist?.filter((_, i) => i !== index) || [])
  }

  // Handle form submission
  const onSubmit = async (formData: EventFormData) => {
    if (!user) {
      toast.error("Please sign in to create an event")
      return
    }

    try {
      setIsSubmitting(true)

      console.log("EVENT PAYLOAD:", formData)

      const payload = {
        artist_id: user.id,
        creator_account_type: "artist",
        name: formData.eventTitle,
        title: formData.eventTitle,
        description: formData.description || "",
        event_type: formData.eventType || "concert",
        type: formData.eventType || "concert",
        status: "draft",
        event_date: formData.eventDate,
        doors_open: formData.doorsOpen || null,
        start_time: formData.startTime || null,
        end_time: formData.endTime || null,
        venue_name: formData.venueName,
        address: formData.address || "",
        city: formData.city,
        state: formData.state || "",
        country: formData.country,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        tags: formData.tags || [],
        setlist: formData.setlist || [],
        created_at: new Date().toISOString()
      }

      console.log("FORMATTED PAYLOAD:", payload)

      const { data, error } = await supabase
        .from("events")
        .insert([payload])
        .select()
        .single()

      console.log("SUPABASE RESPONSE:", { data, error })

      if (error) throw error

      toast.success("Event created successfully")
      onEventCreated?.(data)
      reset()
      closeModal()
      router.refresh()
    } catch (error) {
      console.error("FULL ERROR:", error)
      if ((error as any)?.message) console.error("Message:", (error as any).message)
      if ((error as any)?.details) console.error("Details:", (error as any).details)
      if ((error as any)?.hint) console.error("Hint:", (error as any).hint)
      if ((error as any)?.code) console.error("Code:", (error as any).code)
      toast.error((error as any)?.message || "Failed to create event")
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepFieldMap: Record<number, Array<keyof EventFormData>> = {
    1: ["eventTitle", "eventType"],
    2: ["eventDate", "venueName", "city", "country"],
    3: [],
    4: [],
    5: [],
  }

  const progressValue = useMemo(() => (currentStep / totalSteps) * 100, [currentStep])

  async function goToNextStep() {
    const fields = stepFieldMap[currentStep]
    const isValid = fields.length ? await trigger(fields) : true
    if (!isValid) return
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  function goToPreviousStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const isStepOneInvalid = !!errors.eventTitle || !!errors.eventType
  const isStepTwoInvalid = !!errors.eventDate || !!errors.venueName || !!errors.city || !!errors.country

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={dashboardCreatePattern.modalContent}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className={dashboardCreatePattern.headerIcon}>
              <Sparkles className="h-5 w-5" />
            </span>
            <span>{editingEvent ? "Edit Event" : "Create New Event"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className={dashboardCreatePattern.shell}>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_45%)]" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={dashboardCreatePattern.subtleText}>Step {currentStep} of {totalSteps}</p>
              <p className={dashboardCreatePattern.subtleText}>{Math.round(progressValue)}% complete</p>
            </div>
            {(() => {
              const clampedProgress = Math.min(100, Math.max(0, progressValue))
              return (
                <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-slate-700/60 bg-slate-900/40">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(147,51,234,0.35),transparent_55%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_60%)] opacity-80" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full progress-glow"
                    style={{ width: `${clampedProgress}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500/40 via-blue-500/40 to-cyan-400/30 blur-md opacity-80"
                    style={{ width: `${clampedProgress}%` }}
                  />
                </div>
              )
            })()}
            <div className={dashboardCreatePattern.stepRail}>
              {stepLabels.map((label, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === currentStep
                const isComplete = stepNumber < currentStep

                return (
                  <div key={label} className={getStepPillClasses({ isActive, isComplete })}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/40 text-[11px]">
                        {isComplete ? <Check className="h-3 w-3" /> : stepNumber}
                      </span>
                      <span>{label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          {currentStep === 1 && (
            <div className={`${dashboardCreatePattern.panel} space-y-4`}>
              <p className={dashboardCreatePattern.subtleText}>Set the essentials your audience will see first.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="eventTitle">Event Title *</Label>
                  <Input
                    id="eventTitle"
                    {...register("eventTitle")}
                    placeholder="Enter event title"
                    className={`${dashboardCreatePattern.input} ${errors.eventTitle ? "border-red-500" : ""}`}
                  />
                  {errors.eventTitle && (
                    <p className="text-sm text-red-500">{errors.eventTitle.message}</p>
                  )}
                </div>

                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select
                    value={watchedValues.eventType}
                    onValueChange={(value) => setValue("eventType", value as EventFormData["eventType"])}
                  >
                    <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900 text-white">
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="tour">Tour</SelectItem>
                      <SelectItem value="recording">Recording Session</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Describe your event..."
                  rows={4}
                  className={dashboardCreatePattern.input}
                />
              </div>
              {isStepOneInvalid && <p className="text-sm text-red-500">Please complete the required fields to continue.</p>}
            </div>
          )}

          {currentStep === 2 && (
            <div className={`${dashboardCreatePattern.panel} space-y-4`}>
              <p className={dashboardCreatePattern.subtleText}>Lock in date, venue, and location details for attendees.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="eventDate">Event Date *</Label>
                  <NeoDateInput
                    id="eventDate"
                    placeholder="YYYY-MM-DD"
                    value={watchedValues.eventDate}
                    {...register("eventDate")}
                    className={`${errors.eventDate ? "ring-1 ring-red-500/60" : ""}`}
                  />
                  {errors.eventDate && (
                    <p className="text-sm text-red-500">{errors.eventDate.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="doorsOpen">Doors Open</Label>
                  <Input
                    id="doorsOpen"
                    type="time"
                    {...register("doorsOpen")}
                    className={dashboardCreatePattern.input}
                  />
                </div>

                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register("startTime")}
                    className={dashboardCreatePattern.input}
                  />
                </div>

                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register("endTime")}
                    className={dashboardCreatePattern.input}
                  />
                </div>
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label htmlFor="venueName">Venue Name *</Label>
                <Input
                  id="venueName"
                  {...register("venueName")}
                  placeholder="Enter venue name"
                  className={`${dashboardCreatePattern.input} ${errors.venueName ? "border-red-500" : ""}`}
                />
                {errors.venueName && (
                  <p className="text-sm text-red-500">{errors.venueName.message}</p>
                )}
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label htmlFor="address">Venue Address</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Enter venue address"
                  className={dashboardCreatePattern.input}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="City"
                    className={`${dashboardCreatePattern.input} ${errors.city ? "border-red-500" : ""}`}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    placeholder="State"
                    className={dashboardCreatePattern.input}
                  />
                </div>

                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={watchedValues.country}
                    onValueChange={(value) => setValue("country", value)}
                  >
                    <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-900 text-white">
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="UK">UK</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.country && (
                    <p className="text-sm text-red-500">{errors.country.message}</p>
                  )}
                </div>
              </div>
              {isStepTwoInvalid && <p className="text-sm text-red-500">Please complete required venue/date fields to continue.</p>}
            </div>
          )}

          {currentStep === 3 && (
            <div className={`${dashboardCreatePattern.panel} space-y-4`}>
              <p className={dashboardCreatePattern.subtleText}>Optional capacity helps with planning and analytics.</p>
              <div className={dashboardCreatePattern.fieldGroup}>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  {...register("capacity")}
                  placeholder="Venue capacity"
                  className={dashboardCreatePattern.input}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className={`${dashboardCreatePattern.panel} space-y-4`}>
              <p className={dashboardCreatePattern.subtleText}>Add tags and optional setlist details for richer event context.</p>
              <div className={dashboardCreatePattern.fieldGroup}>
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    className={dashboardCreatePattern.input}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watchedValues.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className={dashboardCreatePattern.tag} onClick={() => removeTag(tag)}>
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label>Setlist</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSetlistItem}
                    onChange={(e) => setNewSetlistItem(e.target.value)}
                    placeholder="Add a song"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSetlistItem()
                      }
                    }}
                    className={dashboardCreatePattern.input}
                  />
                  <Button type="button" onClick={addSetlistItem} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {watchedValues.setlist?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/80 p-2">
                      <span className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-purple-300" />
                        {item}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSetlistItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className={dashboardCreatePattern.panel}>
              <p className={dashboardCreatePattern.subtleText}>
                Review your event details before creating the draft.
              </p>
              <div className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
                <p><strong>Title:</strong> {watchedValues.eventTitle}</p>
                <p><strong>Type:</strong> {watchedValues.eventType}</p>
                <p><strong>Date:</strong> {watchedValues.eventDate}</p>
                <p><strong>Venue:</strong> {watchedValues.venueName}</p>
                <p><strong>City/Country:</strong> {watchedValues.city}, {watchedValues.country}</p>
                <p><strong>Status:</strong> Draft</p>
                {!!watchedValues.capacity && <p><strong>Capacity:</strong> {watchedValues.capacity}</p>}
                {!!watchedValues.tags?.length && <p><strong>Tags:</strong> {watchedValues.tags.join(", ")}</p>}
                {!!watchedValues.setlist?.length && <p><strong>Setlist:</strong> {watchedValues.setlist.join(", ")}</p>}
              </div>
            </div>
          )}

          <div className={dashboardCreatePattern.footer}>
            <Button
              type="button"
              variant="outline"
              className={dashboardCreatePattern.btnOutline}
              onClick={currentStep === 1 ? onClose : goToPreviousStep}
            >
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={goToNextStep}
                className={dashboardCreatePattern.btnPrimary}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className={dashboardCreatePattern.btnPrimary}
              >
                {isSubmitting ? "Creating..." : editingEvent ? "Update Event" : "Create Event"}
              </Button>
            )}
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
