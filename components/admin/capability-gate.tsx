"use client"

import type { ReactNode } from "react"

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import {
  evaluateCapabilityAccess,
  publicCapabilityDenialPayload,
  type CapabilityDenial,
} from "@/lib/admin/capability-aware-ui"
import { useAdminCapabilities } from "@/hooks/use-admin-capabilities"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CapabilityGateProps {
  anyOf: readonly AdminCapability[]
  surfaceLabel: string
  children: ReactNode
  /** Shown when denied (default: disabled wrapper + tooltip). */
  fallback?: ReactNode
  /** When capabilities are still loading, render children (server enforces). */
  allowWhileLoading?: boolean
}

export function CapabilityDeniedNotice({
  denial,
  className,
}: {
  denial: CapabilityDenial
  className?: string
}) {
  const safe = publicCapabilityDenialPayload(denial)
  return (
    <p className={className || "text-sm text-muted-foreground"} role="status">
      {safe.message}
    </p>
  )
}

/**
 * SEC-205 — Hide/disable controls by capability for UX.
 * Never the security boundary — APIs must still enforce.
 */
export function CapabilityGate({
  anyOf,
  surfaceLabel,
  children,
  fallback,
  allowWhileLoading = false,
}: CapabilityGateProps) {
  const { capabilities, isReady, isLoading } = useAdminCapabilities()

  if (!isReady && allowWhileLoading) return <>{children}</>
  if (isLoading && allowWhileLoading) return <>{children}</>
  if (!isReady || isLoading) {
    if (fallback) return <>{fallback}</>
    return (
      <span className="inline-flex cursor-wait opacity-50" aria-busy="true" aria-disabled="true">
        <span className="pointer-events-none">{children}</span>
      </span>
    )
  }

  const access = evaluateCapabilityAccess({
    capabilities: capabilities || [],
    anyOf,
    surfaceLabel,
  })

  if (access.allowed) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed opacity-50" aria-disabled="true">
            <span className="pointer-events-none">{children}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <CapabilityDeniedNotice denial={access} className="text-xs text-inherit" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
