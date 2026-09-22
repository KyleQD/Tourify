"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ContentHubAnalytics } from "./content-hub-types"

interface ContentAnalyticsPanelProps {
  analytics: ContentHubAnalytics | null
  isLoading: boolean
}

function downloadCsv(rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = [
    keys.join(","),
    ...rows.map((row) =>
      keys
        .map((key) => {
          const raw = row[key] ?? ""
          const value = String(raw).replace(/"/g, '""')
          return `"${value}"`
        })
        .join(","),
    ),
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `content-hub-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ContentAnalyticsPanel({ analytics, isLoading }: ContentAnalyticsPanelProps) {
  if (isLoading || !analytics) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          Loading analytics…
        </CardContent>
      </Card>
    )
  }

  const platformEntries = Object.entries(analytics.platforms)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          Platform metrics and recent Meta media insights. Generated{" "}
          {formatDistanceToNow(new Date(analytics.generatedAt), { addSuffix: true })}.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 text-slate-300"
          onClick={() => downloadCsv(analytics.csvRows)}
          disabled={analytics.csvRows.length === 0}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {platformEntries.map(([platform, slice]) => (
          <Card key={platform} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm capitalize">{platform}</CardTitle>
                <Badge className="text-[10px] bg-slate-800 text-slate-300 border-slate-600">
                  {slice.statusLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <Metric label="Followers" value={slice.followers} enabled={slice.status === "synced"} />
              <Metric label="Impressions" value={slice.impressions} enabled={slice.status === "synced"} />
              <Metric label="Reach" value={slice.reach} enabled={slice.status === "synced"} />
              <Metric label="Engagement" value={slice.engagement} enabled={slice.status === "synced"} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">
            Recent Meta media ({analytics.mediaInsights.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.mediaInsights.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No Meta media insights yet. Connect Instagram or Facebook and sync.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.mediaInsights.map((media) => (
                <div
                  key={media.id}
                  className="rounded-sm border border-slate-700/50 bg-slate-800/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-2">
                        {media.caption || media.permalink || media.media_id}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 capitalize">
                        {media.platform}
                        {media.posted_at
                          ? ` · ${formatDistanceToNow(new Date(media.posted_at), { addSuffix: true })}`
                          : ""}
                      </p>
                    </div>
                    {media.permalink && (
                      <a
                        href={media.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-violet-300 hover:text-violet-200 shrink-0"
                      >
                        Open
                      </a>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Impr {media.impressions}</span>
                    <span>Reach {media.reach}</span>
                    <span>Eng {media.engagement}</span>
                    <span>Likes {media.likes}</span>
                    <span>Comments {media.comments}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({
  label,
  value,
  enabled,
}: {
  label: string
  value: number
  enabled: boolean
}) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-white tabular-nums font-medium">
        {enabled ? value.toLocaleString() : "—"}
      </p>
    </div>
  )
}
