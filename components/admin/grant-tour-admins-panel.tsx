"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActingContext } from "@/hooks/use-acting-context"
import { buildAdminJsonRequest, mapAdminScopeError, readAdminErrorMessage } from "@/lib/admin/admin-request"

interface GrantTourAdminsPanelProps {
  tourId: string
  /** Optional prefilled user ids (comma-separated or one per line in the textarea UX). */
  defaultUserIds?: string[]
}

/**
 * One-click path to make band members / collaborators tour admins
 * via /api/admin/tours/[id]/grant-admins (admin team + optional org_members).
 */
export function GrantTourAdminsPanel({ tourId, defaultUserIds = [] }: GrantTourAdminsPanelProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [userIdsText, setUserIdsText] = useState(defaultUserIds.join("\n"))
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleGrant() {
    const user_ids = userIdsText
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (user_ids.length === 0) {
      toast.error("Add at least one user id")
      return
    }

    if (!isActingReady) {
      toast.error("Select an organization account before granting tour admins")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `/api/admin/tours/${tourId}/grant-admins`,
        buildAdminJsonRequest(actingHeaders, {
          method: "POST",
          body: JSON.stringify({
            user_ids,
            role: "admin",
            // Tour-scoped only — do not widen band members to org membership/billing.
            grant_org_membership: false,
          }),
        }),
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const mapped = mapAdminScopeError(res.status, body.code, body.error || await readAdminErrorMessage(res))
        throw new Error(mapped.message)
      }
      toast.success(
        `Granted tour admin to ${body.granted?.length ?? user_ids.length} member(s)`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant tour admins")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Grant tour admins</CardTitle>
        </div>
        <CardDescription>
          Add band members as tour-scoped team admins so they can help plan and track progress.
          This does not grant organization ownership, billing, or unrelated org access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="grant-admin-user-ids">User IDs</Label>
          <Input
            id="grant-admin-user-ids"
            value={userIdsText}
            onChange={(event) => setUserIdsText(event.target.value)}
            placeholder="Paste auth user UUIDs (comma or newline separated)"
          />
        </div>
        <Button type="button" onClick={handleGrant} disabled={isSubmitting}>
          {isSubmitting ? "Granting…" : "Make tour admins"}
        </Button>
      </CardContent>
    </Card>
  )
}
