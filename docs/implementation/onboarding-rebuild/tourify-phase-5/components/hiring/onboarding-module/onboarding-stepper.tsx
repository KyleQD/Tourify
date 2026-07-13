import { CheckCircle2, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface OnboardingStepItem {
  id: string
  label: string
  isComplete?: boolean
}

interface OnboardingStepperProps {
  steps: OnboardingStepItem[]
  activeStepId: string
  onStepSelect?: (stepId: string) => void
  className?: string
}

/**
 * Mobile-friendly step navigation for the worker onboarding flow.
 * This component is presentational only and receives real progress from its parent.
 */
export function OnboardingStepper({
  steps,
  activeStepId,
  onStepSelect,
  className,
}: OnboardingStepperProps) {
  const activeIndex = steps.findIndex((step) => step.id === activeStepId)

  return (
    <nav aria-label="Onboarding progress" className={cn("w-full", className)}>
      <ol className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))] md:overflow-visible">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId
          const isPast = activeIndex >= 0 && index < activeIndex
          const Icon = step.isComplete || isPast ? CheckCircle2 : Circle

          return (
            <li key={step.id} className="min-w-[132px] md:min-w-0">
              <button
                type="button"
                onClick={() => onStepSelect?.(step.id)}
                disabled={!onStepSelect}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                  isActive
                    ? "border-purple-500 bg-purple-500/10 text-white"
                    : "border-slate-800 bg-slate-950/70 text-slate-400",
                  onStepSelect ? "hover:border-slate-600 hover:text-white" : "cursor-default"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    step.isComplete || isPast ? "text-emerald-400" : "text-slate-500",
                    isActive ? "text-purple-300" : undefined
                  )}
                />
                <span className="truncate font-medium">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
