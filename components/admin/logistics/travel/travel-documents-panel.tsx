"use client"

import { useCallback, useEffect, useState } from "react"
import { FileText, Lock, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
  }
  return fallback
}

interface TravelDocument {
  id: string
  documentType: string
  provider: string | null
  fileName: string
  isSensitive: boolean
  uploadStatus: string
  matched: boolean
  createdAt: string
}

interface DocumentsResponse {
  documents: TravelDocument[]
  unmatched: number
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

/**
 * w13-travel-documents
 * TRAVEL-501 / TRAVEL-502 — Protected provider documents and unmatched imports.
 */
export function TravelDocumentsPanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [documents, setDocuments] = useState<TravelDocument[]>([])
  const [unmatched, setUnmatched] = useState(0)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tour_id", tourId)
      if (eventId) params.set("event_id", eventId)
      const res = await fetch(`/api/admin/travel/documents?${params}`)
      const json = (await res.json()) as DocumentsResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load travel documents"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setDocuments(json.documents ?? [])
      setUnmatched(json.unmatched ?? 0)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading travel documents")
      setState("error")
    }
  }, [tourId, eventId])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading travel documents…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Travel documents not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Travel Documents</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">
              {documents.length}
            </Badge>
            {unmatched > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5">
                {unmatched} unmatched
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No travel documents.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm border ${!doc.matched ? "border-amber-500/20 bg-amber-500/5" : "border-slate-700/30 bg-slate-800/20"}`}
              >
                <FileText className={`h-3.5 w-3.5 shrink-0 ${doc.isSensitive ? "text-purple-400" : "text-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{doc.documentType}{doc.provider ? ` · ${doc.provider}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {doc.isSensitive && <Lock className="h-3 w-3 text-purple-400" aria-label="Sensitive" />}
                  {!doc.matched && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1">
                      unmatched
                    </Badge>
                  )}
                  <Badge className={`text-[10px] px-1.5 border ${doc.uploadStatus === "ready" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>
                    {doc.uploadStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
