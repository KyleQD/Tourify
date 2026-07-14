"use client"

import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { HiringComplianceResult } from "@/types/hiring-compliance"

interface ComplianceStatusCardProps {
  compliance: HiringComplianceResult | null
  isLoading?: boolean
}

export function ComplianceStatusCard({ compliance, isLoading = false }: ComplianceStatusCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-pulse" />
          Checking compliance…
        </CardContent>
      </Card>
    )
  }

  if (!compliance) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Compliance has not been checked yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {compliance.blocked ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            Compliance status
          </CardTitle>
          <Badge variant={compliance.blocked ? "destructive" : "outline"}>
            {compliance.complete ? "Complete" : compliance.blocked ? "Blocked" : "In progress"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required items complete</span>
            <span className="font-medium">
              {compliance.completedRequiredCount}/{compliance.requiredCount}
            </span>
          </div>
          <Progress value={compliance.progress} />
        </div>

        {compliance.issues.length > 0 ? (
          <div className="space-y-2">
            {compliance.issues.map((issue) => (
              <div key={`${issue.fieldId}-${issue.reason}`} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{issue.label}</span>
                  <Badge variant={issue.severity === "blocking" ? "destructive" : "outline"}>
                    {issue.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{issue.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No missing blocking items were found.</p>
        )}
      </CardContent>
    </Card>
  )
}
