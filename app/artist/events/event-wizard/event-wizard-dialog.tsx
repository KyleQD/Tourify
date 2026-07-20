"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventWizardMain, EventWizardMainData } from "./event-wizard-main"
import { EventWizardPhotos, EventWizardPhotosData } from "./event-wizard-photos"
import { EventWizardTicketing, EventWizardTicketingData } from "./event-wizard-ticketing"
import { EventWizardSummary } from "./event-wizard-summary"

interface EventWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<EventWizardMainData & EventWizardPhotosData & EventWizardTicketingData>
  mode?: "edit" | "create"
  onSubmit?: (data: any, mode: "edit" | "create") => void
}

type WizardFormData = Partial<EventWizardMainData> & Partial<EventWizardPhotosData> & Partial<EventWizardTicketingData>

export function EventWizardDialog({ open, onOpenChange, initialData, mode = "create", onSubmit }: EventWizardDialogProps) {
  const [step, setStep] = React.useState(1)
  const [formData, setFormData] = React.useState<WizardFormData>(initialData || {})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && initialData) setFormData(initialData)
  }, [open, initialData])

  function handleMainNext(data: EventWizardMainData) {
    setFormData((prev: WizardFormData) => ({ ...prev, ...data }))
    setStep(2)
  }
  function handlePhotosNext(data: EventWizardPhotosData) {
    setFormData((prev: WizardFormData) => ({ ...prev, ...data }))
    setStep(3)
  }
  function handleTicketingNext(data: EventWizardTicketingData) {
    setFormData((prev: WizardFormData) => ({ ...prev, ...data }))
    setStep(4)
  }
  function handleBack() {
    setStep(step - 1)
  }
  async function handleFinalSubmit() {
    setIsSubmitting(true)
    if (onSubmit) await onSubmit(formData, mode)
    setIsSubmitting(false)
    onOpenChange(false)
    setStep(1)
    setFormData({})
  }
  function renderStep() {
    if (step === 1) return <EventWizardMain onNext={handleMainNext} defaultValues={formData} />
    if (step === 2) return <EventWizardPhotos onNext={handlePhotosNext} defaultValues={formData} />
    if (step === 3) return <EventWizardTicketing onNext={handleTicketingNext} defaultValues={formData} />
    if (step === 4) return <EventWizardSummary data={formData} onBack={handleBack} onSubmit={handleFinalSubmit} isSubmitting={isSubmitting} />
    return <EventWizardMain onNext={handleMainNext} defaultValues={formData} />
  }
  function handleDialogClose(open: boolean) {
    onOpenChange(open)
    if (!open) {
      setStep(1)
      setFormData({})
      setIsSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-xs text-gray-400 mb-2">Step {step} of 4</div>
        <div className="py-2 overflow-y-auto max-h-[80vh]">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 