"use client"

import { CheckCircle2, Circle, CircleAlert, CircleDot } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WORKFLOW_STAGES } from "@/lib/hiring/candidate-workflow-utils"
import type { HiringCandidateWorkflowStep, WorkflowStageId, WorkflowStepStatus } from "@/types/hiring-candidate-workflow"

interface WorkflowTimelineProps {
  steps?: HiringCandidateWorkflowStep[]
  currentStage?: WorkflowStageId
  className?: string
}

function getStepStatusIcon(status: WorkflowStepStatus) {
  if (status === "completed") return CheckCircle2
  if (status === "active") return CircleDot
  if (status === "blocked") return CircleAlert
  return Circle
}

function getStepStatusClassName(status: WorkflowStepStatus): string {
  if (status === "completed") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (status === "active") return "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive"
  return "border-muted bg-muted/30 text-muted-foreground"
}

function buildDefaultSteps(currentStage?: WorkflowStageId): HiringCandidateWorkflowStep[] {
  const currentIndex = currentStage ? WORKFLOW_STAGES.findIndex((stage) => stage.id === currentStage) : 0

  return WORKFLOW_STAGES.map((stage, index) => ({
    ...stage,
    status: index < currentIndex ? "completed" : index === currentIndex ? "active" : "pending",
  }))
}

export function WorkflowTimeline({ steps, currentStage, className }: WorkflowTimelineProps) {
  const visibleSteps = steps?.length ? steps : buildDefaultSteps(currentStage)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Workflow Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {visibleSteps.map((step, index) => {
            const Icon = getStepStatusIcon(step.status)

            return (
              <li key={step.id} className="relative flex gap-3">
                {index < visibleSteps.length - 1 ? (
                  <span className="absolute left-4 top-9 h-full w-px bg-border" aria-hidden="true" />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    getStepStatusClassName(step.status)
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{step.label}</p>
                    <Badge variant="outline" className="capitalize">
                      {step.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.timestamp ? (
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(step.timestamp).toLocaleString()}</p>
                  ) : null}
                  {step.actorName ? <p className="text-xs text-muted-foreground">By {step.actorName}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
