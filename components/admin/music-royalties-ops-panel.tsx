"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCw } from "lucide-react"

interface RoyaltyImportRow {
  id: string
  provider: string
  status: string
  owner_user_id: string
  currency?: string | null
  source_total_minor?: string | number | null
  normalized_total_minor?: string | number | null
  dead_letter_reason?: string | null
  original_filename?: string | null
  created_at: string
}

export function MusicRoyaltiesOpsPanel() {
  const [imports, setImports] = useState<RoyaltyImportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [disabled, setDisabled] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/music/royalties/imports", {
      credentials: "include",
      cache: "no-store",
    })
    const body = await response.json().catch(() => ({}))
    if (response.status === 404 || response.status === 403) {
      setDisabled(true)
      setImports([])
      setLoading(false)
      return
    }
    if (!response.ok) {
      toast.error(body?.error?.message || "Unable to load royalty imports")
      setLoading(false)
      return
    }
    setDisabled(false)
    setImports(body.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card className="border-slate-700 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white">Royalty import ops</CardTitle>
            <CardDescription>
              Admin queue for royalty statement imports. Flag-gated and restricted to moderators/super admins or music.rights.review.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        ) : disabled ? (
          <p className="text-sm text-slate-400">
            Royalty admin ops are disabled or unavailable for this account.
          </p>
        ) : !imports.length ? (
          <p className="text-sm text-slate-400">No royalty imports found.</p>
        ) : (
          imports.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  {item.original_filename || item.provider}
                </p>
                <p className="text-xs text-slate-400">
                  owner {item.owner_user_id.slice(0, 8)} · {new Date(item.created_at).toLocaleString()}
                  {item.dead_letter_reason ? ` · ${item.dead_letter_reason}` : ""}
                </p>
              </div>
              <Badge>{item.status.replaceAll("_", " ")}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
