"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SharedPublication {
  title: string | null
  publicationType: string | null
  sequence: number
  version: number
  publishedAt: string | null
  checksum: string | null
  sections: Record<string, unknown>
}

export default function PublicationShareViewerPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [passcode, setPasscode] = useState("")
  const [needsPasscode, setNeedsPasscode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publication, setPublication] = useState<SharedPublication | null>(null)
  const [allowDownload, setAllowDownload] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(
    async (withPasscode?: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/publication/shared/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
          body: JSON.stringify({
            action: "view",
            passcode: withPasscode || undefined,
          }),
          cache: "no-store",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (data.code === "passcode_required" || data.code === "passcode_failed") {
            setNeedsPasscode(true)
            setError(
              data.code === "passcode_failed"
                ? "Incorrect passcode."
                : "This link requires a passcode.",
            )
            setPublication(null)
            return
          }
          if (data.code === "snapshot_retracted" || data.code === "revoked") {
            throw new Error("This publication was retracted and is no longer available.")
          }
          if (data.code === "snapshot_superseded" || data.code === "superseded_hit") {
            throw new Error(
              "This publication was superseded by a newer version. Request an updated share link.",
            )
          }
          throw new Error(data.error || "This share link is unavailable.")
        }
        setNeedsPasscode(false)
        setAllowDownload(Boolean(data.share?.allowDownload))
        setPublication(data.publication)
      } catch (err) {
        setPublication(null)
        setError(err instanceof Error ? err.message : "Unable to open share link")
      } finally {
        setIsLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void load()
  }, [load])

  async function handleDownload() {
    const res = await fetch(`/api/publication/shared/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download", passcode: passcode || undefined }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || "Download not allowed")
      return
    }
    const blob = new Blob([JSON.stringify(data.publication, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `publication-v${data.publication?.version || 1}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tourify share</p>
          <h1 className="text-2xl font-semibold">
            {publication?.title || "Shared publication"}
          </h1>
          {publication ? (
            <p className="text-sm text-slate-400">
              {publication.publicationType} · v{publication.version} · seq {publication.sequence}
              {publication.publishedAt
                ? ` · ${new Date(publication.publishedAt).toLocaleString()}`
                : ""}
            </p>
          ) : null}
        </header>

        {isLoading ? <p className="text-slate-400">Loading…</p> : null}

        {needsPasscode ? (
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="border-slate-700 bg-slate-950"
            />
            <Button type="button" onClick={() => void load(passcode)}>
              Unlock
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {publication ? (
          <div className="space-y-4">
            <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-xs text-slate-300">
              {JSON.stringify(publication.sections, null, 2)}
            </pre>
            {allowDownload ? (
              <Button type="button" variant="outline" onClick={() => void handleDownload()}>
                Download
              </Button>
            ) : null}
            {publication.checksum ? (
              <p className="text-xs text-slate-500">Checksum {publication.checksum.slice(0, 16)}…</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  )
}
