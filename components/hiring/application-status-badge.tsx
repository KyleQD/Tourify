import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ApplicationStatusConfig {
  label: string
  className: string
}

interface ApplicationStatusBadgeProps {
  status: string
  className?: string
}

function getApplicationStatusConfig(status: string): ApplicationStatusConfig {
  const normalizedStatus = status.toLowerCase()

  if (normalizedStatus === "approved" || normalizedStatus === "accepted")
    return { label: "Approved", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" }
  if (normalizedStatus === "pending")
    return { label: "Pending", className: "border-amber-500/30 bg-amber-500/15 text-amber-300" }
  if (normalizedStatus === "rejected")
    return { label: "Rejected", className: "border-rose-500/30 bg-rose-500/15 text-rose-300" }
  if (normalizedStatus === "reviewed")
    return { label: "Reviewed", className: "border-blue-500/30 bg-blue-500/15 text-blue-300" }
  if (normalizedStatus === "shortlisted")
    return { label: "Shortlisted", className: "border-purple-500/30 bg-purple-500/15 text-purple-300" }
  if (normalizedStatus === "withdrawn")
    return { label: "Withdrawn", className: "border-slate-500/30 bg-slate-500/15 text-slate-300" }
  if (normalizedStatus === "contract_sent")
    return { label: "Contract Sent", className: "border-indigo-500/30 bg-indigo-500/15 text-indigo-300" }
  if (normalizedStatus === "contract_signed")
    return { label: "Contract Signed", className: "border-teal-500/30 bg-teal-500/15 text-teal-300" }
  if (normalizedStatus.includes("onboarding"))
    return { label: "Onboarding", className: "border-cyan-500/30 bg-cyan-500/15 text-cyan-300" }
  return { label: "Pending", className: "border-amber-500/30 bg-amber-500/15 text-amber-300" }
}

export function ApplicationStatusBadge({ status, className }: ApplicationStatusBadgeProps) {
  const config = getApplicationStatusConfig(status)

  return (
    <Badge variant="outline" className={cn("capitalize", config.className, className)}>
      {config.label}
    </Badge>
  )
}
