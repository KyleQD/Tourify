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

  if (normalizedStatus === "approved")
    return { label: "Approved", className: "border-emerald-500/40 bg-emerald-700/70 text-emerald-100" }
  if (normalizedStatus === "rejected")
    return { label: "Rejected", className: "border-rose-500/40 bg-rose-700/70 text-rose-100" }
  if (normalizedStatus === "reviewed")
    return { label: "Reviewed", className: "border-blue-500/40 bg-blue-700/70 text-blue-100" }
  if (normalizedStatus === "shortlisted")
    return { label: "Shortlisted", className: "border-purple-500/40 bg-purple-700/70 text-purple-100" }
  if (normalizedStatus === "withdrawn")
    return { label: "Withdrawn", className: "border-slate-500/40 bg-slate-700/70 text-slate-100" }
  if (normalizedStatus === "contract_sent")
    return { label: "Contract Sent", className: "border-indigo-500/40 bg-indigo-700/70 text-indigo-100" }
  if (normalizedStatus === "contract_signed")
    return { label: "Contract Signed", className: "border-teal-500/40 bg-teal-700/70 text-teal-100" }
  if (normalizedStatus.includes("onboarding"))
    return { label: "Onboarding", className: "border-cyan-500/40 bg-cyan-700/70 text-cyan-100" }
  return { label: "Pending", className: "border-amber-500/40 bg-amber-700/70 text-amber-100" }
}

export function ApplicationStatusBadge({ status, className }: ApplicationStatusBadgeProps) {
  const config = getApplicationStatusConfig(status)

  return (
    <Badge variant="outline" className={cn("capitalize", config.className, className)}>
      {config.label}
    </Badge>
  )
}
