"use client"

import { CheckCircle2, Circle, CircleAlert, CircleDot } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { WORKFLOW_STAGES } from "@/lib/hiring/candidate-workflow-utils"
import type { HiringCandidateWorkflowStep, WorkflowStageId, WorkflowStepStatus } from "@/types/hiring-candidate-workflow"

interface WorkflowTimelineProps {
  steps?: HiringCandidateWorkflowStep[]
  currentStage?: WorkflowStageId
  compact?: boolean
  className?: string
}

function getStepStatusIcon(status: WorkflowStepStatus) {
  if (status === "completed") return CheckCircle2
  if (status === "active") return CircleDot
  if (status === "blocked") return CircleAlert
  return Circle
}

function getNodeClassName(status: WorkflowStepStatus): string {
  if (status === "completed") return "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
  if (status === "active") return "border-cyan-400/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
  if (status === "blocked") return "border-rose-500/60 bg-rose-500/15 text-rose-300"
  return "border-slate-600/60 bg-slate-800/50 text-slate-400"
}

function getConnectorClassName(status: WorkflowStepStatus): string {
  if (status === "completed") return "bg-emerald-400/50"
  if (status === "active") return "bg-gradient-to-r from-emerald-400/50 to-cyan-400/50"
  return "bg-slate-700/60"
}

function buildDefaultSteps(currentStage?: WorkflowStageId): HiringCandidateWorkflowStep[] {
  const currentIndex = currentStage ? WORKFLOW_STAGES.findIndex((stage) => stage.id === currentStage) : 0

  return WORKFLOW_STAGES.map((stage, index) => ({
    ...stage,
    status: index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending",
  }))
}

export function WorkflowTimeline({ steps, currentStage, compact = true, className }: WorkflowTimelineProps) {
  const visibleSteps = steps?.length ? steps : buildDefaultSteps(currentStage)
  const completedCount = visibleSteps.filter((step) => step.status === "completed").length
  const activeStep = visibleSteps.find((step) => step.status === "active" || step.status === "blocked")
  const progressPercent = Math.round((completedCount / visibleSteps.length) * 100)

  if (!compact) {
    return <WorkflowTimelineDetail steps={visibleSteps} className={className} />
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white">Workflow</p>
        <span className="text-xs text-slate-400">
          {completedCount} / {visibleSteps.length} stages
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center overflow-x-auto pb-1">
        {visibleSteps.map((step, index) => {
          const Icon = getStepStatusIcon(step.status)
          const isLast = index === visibleSteps.length - 1

          return (
            <div key={step.id} className="flex min-w-0 shrink-0 items-center">
              <div className="flex flex-col items-center gap-1" style={{ width: 60 }}>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border transition",
                    getNodeClassName(step.status)
                  )}
                  title={step.label}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-center text-[10px] leading-tight",
                    step.status === "active" ? "text-cyan-200" : "text-slate-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? <span className={cn("h-0.5 w-6 shrink-0 rounded-full", getConnectorClassName(step.status))} /> : null}
            </div>
          )
        })}
      </div>

      {activeStep ? (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-2">
          <p className="text-sm font-medium text-white">{activeStep.label}</p>
          <p className="text-xs text-slate-400">{activeStep.description}</p>
        </div>
      ) : null}

      <Accordion type="single" collapsible>
        <AccordionItem value="stage-details" className="border-slate-700/60">
          <AccordionTrigger className="py-2 text-xs text-slate-400">Stage details</AccordionTrigger>
          <AccordionContent>
            <WorkflowTimelineDetail steps={visibleSteps} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function WorkflowTimelineDetail({ steps, className }: { steps: HiringCandidateWorkflowStep[]; className?: string }) {
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const Icon = getStepStatusIcon(step.status)
        const isLast = index === steps.length - 1

        return (
          <li key={step.id} className="relative flex gap-3">
            {!isLast ? <span className="absolute left-4 top-9 h-full w-px bg-slate-700/60" aria-hidden="true" /> : null}
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                getNodeClassName(step.status)
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium text-white">{step.label}</p>
              <p className="text-xs text-slate-400">{step.description}</p>
              {step.timestamp ? (
                <p className="mt-1 text-[11px] text-slate-500">{new Date(step.timestamp).toLocaleString()}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
