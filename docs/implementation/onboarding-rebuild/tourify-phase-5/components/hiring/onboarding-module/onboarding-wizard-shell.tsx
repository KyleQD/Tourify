"use client"

import { ReactNode } from "react"
import { BriefcaseBusiness, Building2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
    <main className={cn("min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8", className)}>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-2xl md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
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

            <Card className="border-slate-800 bg-slate-950/70 md:min-w-[280px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Building2 className="h-4 w-4 text-purple-300" />
                  Hiring profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold text-white">{getEmployerLabel(employer)}</p>
                {position ? <p className="text-slate-300">Role: {position}</p> : null}
                {department ? <p className="text-slate-400">Department: {department}</p> : null}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className="font-medium text-white">{normalizedProgress}%</span>
            </div>
            <Progress value={normalizedProgress} />
          </div>
        </section>

        <OnboardingStepper steps={steps} activeStepId={activeStepId} onStepSelect={onStepSelect} />

        <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
          <CardContent className="p-4 md:p-6">{children}</CardContent>
        </Card>

        {footer ? <div>{footer}</div> : null}
      </div>
    </main>
  )
}
