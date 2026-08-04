"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Shield, UserX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useActingContext } from "@/hooks/use-acting-context"
import { toast } from "sonner"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

interface OrgMember {
  userId: string
  role: string
  status: string
  invitedAt: string | null
  activatedAt: string | null
  revokedAt: string | null
}

interface MembersResponse {
  members: OrgMember[]
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  admin: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  tour_manager: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  production: "bg-green-500/20 text-green-300 border-green-500/30",
  member: "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  revoked: "bg-red-500/20 text-red-300 border-red-500/30",
  invited: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
}

export function MembershipWorkspace() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<MembersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<OrgMember | null>(null)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/rbac/members", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load org members"))
        setData(null)
        return
      }
      setData(json as MembersResponse)
    } catch {
      setError("Unable to load org members")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  const handleRevoke = useCallback(
    async (member: OrgMember) => {
      setRevoking(member.userId)
      try {
        const res = await fetch("/api/admin/rbac/members", {
          method: "DELETE",
          credentials: "include",
          headers: { ...actingHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" },
          body: JSON.stringify({ userId: member.userId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(extractErrorMsg(json, "Failed to revoke membership"))
          return
        }
        toast.success("Membership revoked")
        void load()
      } catch {
        toast.error("Failed to revoke membership")
      } finally {
        setRevoking(null)
        setConfirmRevoke(null)
      }
    },
    [actingHeaders, load],
  )

  if (data?.unavailable) {
    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm border-dashed">
        <CardContent className="pt-6 text-sm text-slate-400">
          {data.unavailableReason ?? "Membership workspace not yet available."}
        </CardContent>
      </Card>
    )
  }

  const members = data?.members ?? []
  const active = members.filter((m) => m.status === "active")

  return (
    <>
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              Organization Members
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              SEC-102 · {active.length} active member{active.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {isLoading && !data ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
            </div>
          ) : null}

          {!error && data && members.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No members found.</p>
          ) : null}

          {members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                    <th className="py-2 pr-3 text-left font-medium">User ID</th>
                    <th className="py-2 pr-3 text-left font-medium">Role</th>
                    <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Status</th>
                    <th className="py-2 pr-3 text-left font-medium hidden lg:table-cell">Since</th>
                    <th className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {members.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 pr-3 text-slate-400 font-mono text-xs truncate max-w-[120px]">
                        {m.userId.slice(0, 8)}…
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${ROLE_BADGE[m.role] ?? ROLE_BADGE.member}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="py-2 pr-3 hidden md:table-cell">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${STATUS_BADGE[m.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-500 text-xs hidden lg:table-cell">
                        {m.activatedAt ? new Date(m.activatedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {m.status === "active" && m.role !== "owner" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                            onClick={() => setConfirmRevoke(m)}
                            disabled={revoking === m.userId}
                            aria-label={`Revoke membership for ${m.userId}`}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            {revoking === m.userId ? "Revoking…" : "Revoke"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {m.role === "owner" ? "Owner" : m.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Revocation confirmation dialog */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={(open) => { if (!open) setConfirmRevoke(null) }}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">Revoke membership?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will immediately revoke access for user{" "}
              <code className="text-xs font-mono text-slate-300">{confirmRevoke?.userId.slice(0, 8)}…</code>
              . They will lose all organization capabilities immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmRevoke && void handleRevoke(confirmRevoke)}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
