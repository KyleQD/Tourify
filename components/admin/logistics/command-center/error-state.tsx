"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ErrorState } from "@/components/ui/error-state"
import { cn } from "@/lib/utils"

export interface LogisticsCommandCenterErrorProps {
  title?: React.ReactNode
  description?: React.ReactNode
  onRetry?: () => void
  className?: string
}

export function LogisticsCommandCenterError({
  title = "Logistics data is unavailable",
  description = "The command center could not be loaded. Existing records have not been changed.",
  onRetry,
  className,
}: LogisticsCommandCenterErrorProps) {
  return (
    <ErrorState
      action={
        onRetry ? (
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            Try again
          </Button>
        ) : undefined
      }
      className={cn("min-h-72", className)}
      description={description}
      title={title}
    />
  )
}
