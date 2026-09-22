"use client"

import { useEffect, useState } from "react"

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { useActingContext } from "@/hooks/use-acting-context"
import {
  evaluateCapabilityAccess,
  evaluateNavHrefAccess,
  type CapabilityAccessResult,
} from "@/lib/admin/capability-aware-ui"

interface EffectiveCapabilitiesResponse {
  success?: boolean
  capabilities?: AdminCapability[]
  orgId?: string
  membershipRole?: string
  enforcement?: string
}

/**
 * SEC-205 — Load acting-org capabilities for UI reflection only.
 */
export function useAdminCapabilities() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [capabilities, setCapabilities] = useState<AdminCapability[] | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [membershipRole, setMembershipRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActingReady) {
      setCapabilities(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void (async () => {
      try {
        const response = await fetch("/api/admin/effective-capabilities", {
          credentials: "include",
          headers: { ...actingHeaders },
        })
        const body = (await response.json().catch(() => ({}))) as EffectiveCapabilitiesResponse
        if (cancelled) return
        if (!response.ok) {
          setError(typeof body === "object" && body && "error" in body
            ? String((body as { error?: unknown }).error || "Failed to load capabilities")
            : "Failed to load capabilities")
          setCapabilities(null)
          return
        }
        setCapabilities(Array.isArray(body.capabilities) ? body.capabilities : [])
        setOrgId(typeof body.orgId === "string" ? body.orgId : null)
        setMembershipRole(typeof body.membershipRole === "string" ? body.membershipRole : null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load capabilities")
          setCapabilities(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [actingContextKey, actingHeaders, isActingReady])

  function can(capability: AdminCapability): boolean {
    if (!capabilities) return false
    return hasAdminCapability(capabilities, capability)
  }

  function canAny(required: readonly AdminCapability[]): boolean {
    return required.some((cap) => can(cap))
  }

  function accessFor(args: {
    anyOf: readonly AdminCapability[]
    surfaceLabel: string
  }): CapabilityAccessResult {
    return evaluateCapabilityAccess({
      capabilities: capabilities || [],
      anyOf: args.anyOf,
      surfaceLabel: args.surfaceLabel,
    })
  }

  function navAccess(href: string): CapabilityAccessResult {
    return evaluateNavHrefAccess({ href, capabilities })
  }

  return {
    capabilities,
    orgId,
    membershipRole,
    isLoading,
    error,
    isReady: capabilities !== null,
    can,
    canAny,
    accessFor,
    navAccess,
    /** UI must never treat client caps as authorization. */
    enforcement: "server_only" as const,
  }
}
