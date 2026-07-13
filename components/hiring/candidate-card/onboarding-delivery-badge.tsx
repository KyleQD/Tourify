import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OnboardingDeliveryStatus } from "@/types/hiring-candidate-workflow"

interface OnboardingDeliveryBadgeProps {
  status?: OnboardingDeliveryStatus
  className?: string
}

const DELIVERY_META: Record<OnboardingDeliveryStatus, { label: string; className: string }> = {
  not_sent: { label: "Onboarding not sent", className: "border-amber-500/50 text-amber-200" },
  sent: { label: "Sent to notifications", className: "border-cyan-500/40 text-cyan-200" },
  in_progress: { label: "Onboarding in progress", className: "border-blue-500/40 text-blue-200" },
  completed: { label: "Onboarding complete", className: "border-emerald-500/40 text-emerald-200" },
}

export function OnboardingDeliveryBadge({ status = "not_sent", className }: OnboardingDeliveryBadgeProps) {
  const meta = DELIVERY_META[status] ?? DELIVERY_META.not_sent
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  )
}
