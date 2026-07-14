"use client"

import { Star } from "lucide-react"
import type { MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ApplicationStarToggleProps {
  isStarred: boolean
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  withLabel?: boolean
  disabled?: boolean
}

/**
 * Recruiter bookmark toggle. Distinct from the shortlist status action: starring
 * flags an applicant to revisit for onboarding without changing their status.
 */
export function ApplicationStarToggle({
  isStarred,
  onToggle,
  size = "icon",
  className,
  withLabel = false,
  disabled = false,
}: ApplicationStarToggleProps) {
  return (
    <Button
      type="button"
      size={withLabel ? size : "icon"}
      variant="ghost"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isStarred}
      aria-label={isStarred ? "Remove star" : "Star applicant"}
      className={cn("text-slate-400 hover:text-amber-300", isStarred && "text-amber-400", className)}
    >
      <Star className={cn("h-4 w-4", isStarred && "fill-amber-400", withLabel && "mr-2")} />
      {withLabel ? (isStarred ? "Starred" : "Star") : null}
    </Button>
  )
}
