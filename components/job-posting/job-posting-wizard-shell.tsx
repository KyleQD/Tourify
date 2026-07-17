"use client"

import type { ReactNode } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { getJobPostingWizardStepState } from "@/lib/job-posting/job-posting-wizard-state"

export interface JobPostingWizardStep {
  id: number
  label: string
}

interface JobPostingWizardShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  icon?: ReactNode
  steps: JobPostingWizardStep[]
  currentStep: number
  children: ReactNode
  footer: ReactNode
  className?: string
}

export const jobPostingFieldLabelClass =
  "text-xs font-medium uppercase tracking-wide text-slate-400"

export const jobPostingFieldClass =
  "rounded-xl border-white/15 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"

export const jobPostingSelectClass =
  "rounded-xl border-white/15 bg-slate-950/60 text-slate-100 focus:ring-cyan-500/20"

export const jobPostingSelectContentClass =
  "border-white/10 bg-slate-900/95 text-slate-100 backdrop-blur-xl"

export const jobPostingOutlineButtonClass =
  "rounded-xl border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"

export const jobPostingPrimaryButtonClass =
  "rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:from-cyan-300 hover:to-cyan-400"

export const jobPostingDangerButtonClass =
  "rounded-xl border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"

export const jobPostingChipClass =
  "inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300"

export { getJobPostingWizardStepState }

export function JobPostingWizardShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  steps,
  currentStep,
  children,
  footer,
  className,
}: JobPostingWizardShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto border-white/10 bg-slate-950/95 p-0 text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:max-w-4xl sm:rounded-2xl",
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="space-y-5 p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-white">
              {icon ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/20 via-purple-500/20 to-fuchsia-400/20 ring-1 ring-white/10">
                  {icon}
                </div>
              ) : null}
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-slate-400">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <JobPostingWizardSteps steps={steps} currentStep={currentStep} />

          {children}

          <DialogFooter className="flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-between">
            {footer}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function JobPostingWizardSteps({
  steps,
  currentStep,
}: {
  steps: JobPostingWizardStep[]
  currentStep: number
}) {
  return (
    <div className="flex items-center gap-1 py-1">
      {steps.map((step, index) => {
        const { isActive, isDone } = getJobPostingWizardStepState(step.id, currentStep)

        return (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  isActive &&
                    "bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/25",
                  isDone && "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30",
                  !isActive && !isDone && "bg-white/5 text-slate-500 ring-1 ring-white/10"
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:inline",
                  isActive ? "font-medium text-white" : "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mx-1 h-px flex-1",
                  isDone ? "bg-gradient-to-r from-cyan-400/50 to-purple-500/30" : "bg-white/10"
                )}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function JobPostingWizardFooter({
  step,
  totalSteps,
  canContinue,
  isSubmitting,
  onBack,
  onCancel,
  onNext,
  actions,
}: {
  step: number
  totalSteps: number
  canContinue: boolean
  isSubmitting: boolean
  onBack: () => void
  onCancel: () => void
  onNext: () => void
  actions: ReactNode
}) {
  return (
    <>
      <div className="flex gap-2">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            className={jobPostingOutlineButtonClass}
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className={jobPostingOutlineButtonClass}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {step < totalSteps ? (
          <Button
            type="button"
            className={jobPostingPrimaryButtonClass}
            onClick={onNext}
            disabled={!canContinue || isSubmitting}
          >
            Continue
          </Button>
        ) : (
          actions
        )}
      </div>
    </>
  )
}

export function JobPostingWizardPanel({
  title,
  children,
  description,
}: {
  title: string
  children: ReactNode
  description?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function JobPostingReviewRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-200">{value || "—"}</dd>
    </div>
  )
}
