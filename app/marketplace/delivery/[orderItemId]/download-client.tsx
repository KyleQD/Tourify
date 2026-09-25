"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { extractApiError } from "@/lib/api/extract-error"

interface DownloadResponse {
  data?: {
    downloadUrl?: string | null
    signedUrlExpiresAt?: string | null
    maxDownloads?: number | null
    downloadCount?: number | null
  }
}

export function MarketplaceDownloadClient({ orderItemId }: { orderItemId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [downloadMeta, setDownloadMeta] = useState<DownloadResponse["data"] | null>(null)

  async function startDownload() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/marketplace/delivery/${orderItemId}`, {
        credentials: "include",
        cache: "no-store",
      })
      const body = (await response.json()) as DownloadResponse

      if (response.status === 401) {
        window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(`/marketplace/delivery/${orderItemId}`)}`
        return
      }

      if (!response.ok || !body.data?.downloadUrl) {
        setErrorMessage(extractApiError(body, "Unable to prepare this download."))
        return
      }

      setDownloadMeta(body.data)
      window.location.href = body.data.downloadUrl
    } catch {
      setErrorMessage("Unable to prepare this download right now.")
    } finally {
      setIsLoading(false)
    }
  }

  const remainingDownloads =
    downloadMeta?.maxDownloads && downloadMeta.maxDownloads > 0 && typeof downloadMeta.downloadCount === "number"
      ? Math.max(downloadMeta.maxDownloads - downloadMeta.downloadCount, 0)
      : null

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ready when you are</h2>
          <p className="mt-1 text-sm text-slate-300">
            Each click creates a fresh secure link and records one download attempt.
          </p>
        </div>
        <Badge variant="secondary" className="bg-slate-800 text-slate-200">
          Secure link
        </Badge>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      {downloadMeta ? (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Download started.
          {remainingDownloads !== null ? ` ${remainingDownloads} downloads remaining.` : null}
        </div>
      ) : null}

      <Button className="mt-5" onClick={startDownload} disabled={isLoading}>
        {isLoading ? "Preparing..." : "Download file"}
      </Button>
    </section>
  )
}
