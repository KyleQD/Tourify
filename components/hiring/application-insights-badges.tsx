import { Badge } from "@/components/ui/badge"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { cn } from "@/lib/utils"

interface ApplicationInsightsBadgesProps {
  onboardingStage?: string | null
  contractStatus?: string | null
  isEligible?: boolean | null
  reReviewRequestedAt?: string | null
  stackRight?: boolean
  className?: string
}

export function ApplicationInsightsBadges({
  onboardingStage,
  contractStatus,
  isEligible,
  reReviewRequestedAt,
  stackRight = false,
  className,
}: ApplicationInsightsBadgesProps) {
  const hasAnyBadge = Boolean(
    onboardingStage ||
      contractStatus ||
      typeof isEligible === "boolean" ||
      reReviewRequestedAt
  )

  if (!hasAnyBadge) return null

  const wrapperClassName = stackRight
    ? "space-y-1"
    : "flex flex-wrap items-center gap-2"

  return (
    <div className={cn(wrapperClassName, className)}>
      {onboardingStage ? (
        <Badge variant="outline" className="border-cyan-500 text-cyan-300">
          Onboarding: {onboardingStage}
        </Badge>
      ) : null}

      {contractStatus ? (
        <Badge variant="outline" className="border-indigo-500 text-indigo-300">
          Contract: {contractStatus}
        </Badge>
      ) : null}

      {typeof isEligible === "boolean" ? (
        <div className={stackRight ? "flex justify-end" : undefined}>
          <Badge
            variant="outline"
            className={isEligible ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}
          >
            {isEligible ? "Eligible" : "Blocked"}
          </Badge>
        </div>
      ) : null}

      {reReviewRequestedAt ? (
        <div className={stackRight ? "flex justify-end" : undefined}>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300">
            Re-review requested {formatSafeDate(reReviewRequestedAt)}
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
