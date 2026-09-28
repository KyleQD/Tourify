"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Link2, ShieldOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useActingContext } from "@/hooks/use-acting-context"

interface ShareLinkRow {
  id: string
  name: string
  expiresAt: string | null
  allowDownload: boolean
  maxUses: number | null
  useCount: number
  hasPasscode: boolean
  revokedAt: string | null
  publicationTitle?: string | null
}

interface PublicationShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourId?: string
  eventId?: string
  snapshotId?: string
  publicationType?: string
  title?: string
}

function buildInit(actingHeaders: Record<string, string>, input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

export function PublicationShareLinkDialog({
  open,
  onOpenChange,
  tourId,
  eventId,
  snapshotId,
  publicationType,
  title = "Secure share link",
}: PublicationShareLinkDialogProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [name, setName] = useState("Share link")
  const [expiresAt, setExpiresAt] = useState("")
  const [passcode, setPasscode] = useState("")
  const [allowDownload, setAllowDownload] = useState(false)
  const [maxUses, setMaxUses] = useState("")
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [links, setLinks] = useState<ShareLinkRow[]>([])
  const [history, setHistory] = useState<
    Array<{
      id: string
      title: string | null
      status: string
      accessState: string
      version: number | null
      sequence: number | null
    }>
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [retractingId, setRetractingId] = useState<string | null>(null)

  const loadLinks = useCallback(async () => {
    if (!isActingReady || (!tourId && !eventId && !snapshotId)) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tourId", tourId)
      if (eventId) params.set("eventId", eventId)
      if (snapshotId) params.set("snapshotId", snapshotId)
      const [linksRes, historyRes] = await Promise.all([
        fetch(
          `/api/admin/publication/share-links?${params.toString()}`,
          buildInit(actingHeaders),
        ),
        tourId || eventId
          ? fetch(
              `/api/admin/publication/history?${
                tourId
                  ? `tourId=${encodeURIComponent(tourId)}`
                  : `eventId=${encodeURIComponent(eventId!)}`
              }`,
              buildInit(actingHeaders),
            )
          : Promise.resolve(null),
      ])
      const data = await linksRes.json().catch(() => ({}))
      if (!linksRes.ok) throw new Error(data.error || "Failed to load share links")
      setLinks(Array.isArray(data.rows) ? data.rows : [])

      if (historyRes) {
        const historyData = await historyRes.json().catch(() => ({}))
        if (historyRes.ok) setHistory(Array.isArray(historyData.rows) ? historyData.rows : [])
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load share links")
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady, snapshotId, tourId])

  useEffect(() => {
    if (open) {
      setCreatedUrl(null)
      void loadLinks()
    }
  }, [open, loadLinks])

  async function handleCreate() {
    setIsCreating(true)
    setCreatedUrl(null)
    try {
      const res = await fetch(
        "/api/admin/publication/share-links",
        buildInit(actingHeaders, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourId,
            eventId,
            snapshotId,
            publicationType,
            name: name.trim() || "Share link",
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            passcode: passcode.trim() || null,
            allowDownload,
            maxUses: maxUses.trim() ? Number(maxUses) : null,
          }),
        }),
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to create share link")
      setCreatedUrl(data.link?.url || data.link?.path || null)
      toast.success("Secure share link created — copy it now; the token is shown once.")
      await loadLinks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share link")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(
        `/api/admin/publication/share-links/${id}/revoke`,
        buildInit(actingHeaders, { method: "POST" }),
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Revoke failed")
      toast.success("Share link revoked")
      await loadLinks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revoke failed")
    }
  }

  async function handleRetract(snapshotIdToRetract: string) {
    const reason = window.prompt("Retraction reason (required)")
    if (!reason || reason.trim().length < 3) {
      toast.error("A retraction reason is required")
      return
    }
    setRetractingId(snapshotIdToRetract)
    try {
      const res = await fetch(
        `/api/admin/publication/snapshots/${snapshotIdToRetract}/retract`,
        buildInit(actingHeaders, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        }),
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Retraction failed")
      toast.success("Publication retracted — access invalidated and notice queued")
      await loadLinks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retraction failed")
    } finally {
      setRetractingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-700 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-400">
          Creates a scoped, revocable publication link. Admin dashboard URLs are not used for
          sharing.
        </p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="share-name">Name</Label>
            <Input
              id="share-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 border-slate-700 bg-slate-950"
            />
          </div>
          <div>
            <Label htmlFor="share-expires">Expires</Label>
            <Input
              id="share-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-1 border-slate-700 bg-slate-950"
            />
          </div>
          <div>
            <Label htmlFor="share-passcode">Optional passcode</Label>
            <Input
              id="share-passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="mt-1 border-slate-700 bg-slate-950"
              placeholder="Min 4 characters"
            />
          </div>
          <div>
            <Label htmlFor="share-max-uses">Max uses (optional)</Label>
            <Input
              id="share-max-uses"
              type="number"
              min={1}
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
              className="mt-1 border-slate-700 bg-slate-950"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2">
            <Label htmlFor="share-download">Allow download</Label>
            <Switch
              id="share-download"
              checked={allowDownload}
              onCheckedChange={setAllowDownload}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isCreating || !isActingReady}
            className="w-full"
          >
            {isCreating ? "Creating…" : "Create secure link"}
          </Button>
        </div>

        {createdUrl ? (
          <div className="space-y-2 rounded-md border border-emerald-700/40 bg-emerald-950/30 p-3">
            <Label>Copy this link now</Label>
            <div className="flex gap-2">
              <Input readOnly value={createdUrl} className="border-slate-700 bg-slate-950" />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-slate-600"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdUrl)
                    toast.success("Secure link copied")
                  } catch {
                    toast.error("Could not copy")
                  }
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active links</p>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-slate-500">No active share links yet.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{link.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      uses {link.useCount}
                      {link.maxUses != null ? `/${link.maxUses}` : ""}
                      {link.hasPasscode ? " · passcode" : ""}
                      {link.allowDownload ? " · download" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRevoke(link.id)}
                  >
                    <ShieldOff className="mr-1 h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Publication history (retained)
            </p>
            <ul className="max-h-36 space-y-2 overflow-y-auto">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.title || "Publication"} · v{row.version ?? "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.accessState} · seq {row.sequence ?? "—"}
                    </p>
                  </div>
                  {row.status === "committed" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={retractingId === row.id}
                      onClick={() => void handleRetract(row.id)}
                    >
                      Retract
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
