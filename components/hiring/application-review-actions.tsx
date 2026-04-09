import { CheckCircle, MessageSquare, Star, XCircle } from "lucide-react"
import type { MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ApplicationReviewActionsProps {
  onApprove: (event: MouseEvent<HTMLButtonElement>) => void
  onReject: (event: MouseEvent<HTMLButtonElement>) => void
  onShortlist?: (event: MouseEvent<HTMLButtonElement>) => void
  onMessage?: (event: MouseEvent<HTMLButtonElement>) => void
  iconOnly?: boolean
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  approveClassName?: string
  rejectClassName?: string
  shortlistClassName?: string
  messageClassName?: string
  approveVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  rejectVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function ApplicationReviewActions({
  onApprove,
  onReject,
  onShortlist,
  onMessage,
  iconOnly = false,
  size = "default",
  className,
  approveClassName,
  rejectClassName,
  shortlistClassName,
  messageClassName,
  approveVariant = "default",
  rejectVariant = "destructive",
}: ApplicationReviewActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        size={size}
        variant={approveVariant}
        onClick={onApprove}
        className={cn(
          approveVariant === "default" ? "bg-green-600 hover:bg-green-700" : undefined,
          approveClassName
        )}
      >
        <CheckCircle className={cn("h-4 w-4", iconOnly ? "" : "mr-2")} />
        {iconOnly ? null : "Approve"}
      </Button>
      <Button
        size={size}
        variant={rejectVariant}
        onClick={onReject}
        className={cn(rejectClassName)}
      >
        <XCircle className={cn("h-4 w-4", iconOnly ? "" : "mr-2")} />
        {iconOnly ? null : "Reject"}
      </Button>
      {onShortlist ? (
        <Button size={size} variant="outline" onClick={onShortlist} className={cn(shortlistClassName)}>
          <Star className={cn("h-4 w-4", iconOnly ? "" : "mr-2")} />
          {iconOnly ? null : "Shortlist"}
        </Button>
      ) : null}
      {onMessage ? (
        <Button size={size} variant="outline" onClick={onMessage} className={cn(messageClassName)}>
          <MessageSquare className={cn("h-4 w-4", iconOnly ? "" : "mr-2")} />
          {iconOnly ? null : "Send Message"}
        </Button>
      ) : null}
    </div>
  )
}
