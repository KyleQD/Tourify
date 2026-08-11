"use client"

import { useCallback, useEffect, useState } from "react"
import { Book, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface TourBook { id: string; tourId: string | null; version: number; checksum: string | null; sectionsIncluded: unknown[]; status: string; fileUrl: string | null; createdAt: string; expiresAt: string | null }
interface TourBookResponse { books: TourBook[]; unavailable?: boolean; unavailableReason?: string; freshAt: string }

/**
 * w17-tour-book
 * EXP-603 — Accessible web/PDF tour book with version/checksum.
 */
export function TourBookPanel({ tourId }: { tourId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [books, setBooks] = useState<TourBook[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (tourId) params.set("tour_id", tourId)
    try {
      const res = await fetch(`/api/admin/exports/tour-book?${params}`)
      const json = (await res.json()) as TourBookResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setBooks(json.books ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [tourId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading tour books…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Tour Book</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{books.length} version(s)</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {books.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No tour books generated. Publish a tour to generate a tour book.</p>
        ) : (
          <div className="space-y-1.5">
            {books.map((book) => (
              <div key={book.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200">Version {book.version}</p>
                  {book.checksum && <p className="text-[10px] text-slate-500 font-mono">SHA: {book.checksum.slice(0, 12)}…</p>}
                  <p className="text-[10px] text-slate-500">{book.sectionsIncluded.length} sections · {new Date(book.createdAt).toLocaleDateString()}</p>
                  {book.expiresAt && <p className="text-[10px] text-slate-500">Expires: {new Date(book.expiresAt).toLocaleDateString()}</p>}
                </div>
                {book.fileUrl && (
                  <a href={book.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline shrink-0">Download</a>
                )}
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${book.status === "ready" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>{book.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
