"use client"

import { ReactNode } from "react"
import { BriefcaseBusiness, Building2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { HiringEntity } from "@/types/hiring-entity"
import { OnboardingStepper, type OnboardingStepItem } from "./onboarding-stepper"

interface OnboardingWizardShellProps {
  employer: HiringEntity
  candidateName?: string | null
  position?: string | null
  department?: string | null
  progress: number
  steps: OnboardingStepItem[]
  activeStepId: string
  onStepSelect?: (stepId: string) => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

function getEmployerLabel(employer: HiringEntity): string {
  if (employer.displayName) return employer.displayName
  if (employer.entityType === "venue") return "Venue"
  if (employer.entityType === "organization") return "Organization"
  return "Artist"
}

/**
 * Shared layout for the worker-facing hiring onboarding wizard.
 * This shell intentionally avoids admin language and focuses on the hired worker experience.
 */
export function OnboardingWizardShell({
  employer,
  candidateName,
  position,
  department,
  progress,
  steps,
  activeStepId,
  onStepSelect,
  children,
  footer,
  className,
}: OnboardingWizardShellProps) {
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <main className={cn("relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-white md:px-8", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.2),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.14),transparent_38%),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.85))]" />

      <div className="relative mx-auto max-w-5xl space-y-6">
        <section className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-sm text-fuchsia-100">
                <BriefcaseBusiness className="h-4 w-4" />
                Hiring onboarding
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {candidateName ? `Welcome, ${candidateName}` : "Complete your onboarding"}
                </h1>
                <p className="max-w-2xl text-slate-300">
                  Finish the required information so your hiring profile can activate your roster and Work Mode access.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 md:min-w-[280px]">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <Building2 className="h-4 w-4 text-cyan-300" />
                Hiring profile
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-white">{getEmployerLabel(employer)}</p>
                {position ? <p className="text-slate-300">Role: {position}</p> : null}
                {department ? <p className="text-slate-400">Department: {department}</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className="font-medium text-white">{normalizedProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${normalizedProgress}%` }}
              />
            </div>
          </div>
        </section>

        <OnboardingStepper steps={steps} activeStepId={activeStepId} onStepSelect={onStepSelect} />

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl md:p-6">
          {children}
        </section>

        {footer ? <div>{footer}</div> : null}
      </div>
    </main>
  )
}
