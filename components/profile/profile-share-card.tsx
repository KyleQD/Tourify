"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Share2, ExternalLink, Send, MessageCircle, MessageSquare } from "lucide-react"
import { toast } from "sonner"

interface ProfileShareCardProps {
  username: string
  displayName: string
  sharePath?: string
  className?: string
  compact?: boolean
}

export function ProfileShareCard({
  username,
  displayName,
  sharePath = "/profile",
  className = "",
  compact = false,
}: ProfileShareCardProps) {
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_SITE_URL || "https://demo.tourify.live")
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) setOrigin(window.location.origin)
  }, [])

  const safeUsername = username.replace(/^@/, "").trim()
  const safeSharePath = sharePath.startsWith("/") ? sharePath : `/${sharePath}`
  const shareUrl = useMemo(
    () => `${origin}${safeSharePath.replace(/\/$/, "")}/${encodeURIComponent(safeUsername)}`,
    [origin, safeSharePath, safeUsername]
  )
  const shareTitle = `${displayName} on Tourify`
  const shareText = `Check out ${displayName}'s profile on Tourify`
  const shareMessage = `${shareText}: ${shareUrl}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)
      toast.success("Profile link copied")
      setTimeout(() => setIsCopied(false), 1800)
    } catch (error) {
      console.error("Failed to copy profile link:", error)
      toast.error("Unable to copy profile link")
    }
  }

  async function handleNativeShare() {
    try {
      if (!navigator.share) {
        await handleCopyLink()
        return
      }

      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      console.error("Failed to share profile:", error)
      toast.error("Unable to open native share")
    }
  }

  function openShareWindow(url: string) {
    if (typeof window === "undefined") return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleShareX() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    openShareWindow(url)
  }

  function handleShareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    openShareWindow(url)
  }

  function handleShareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    openShareWindow(url)
  }

  function handleShareSms() {
    if (typeof window === "undefined") return
    window.location.href = `sms:?&body=${encodeURIComponent(shareMessage)}`
  }

  return (
    <div
      className={`rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900/85 via-indigo-900/60 to-purple-900/60 p-4 shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Share your profile</p>
          <p className="text-xs text-slate-300">Grow faster with one tap.</p>
        </div>
        <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">
          @{safeUsername}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={shareUrl}
            readOnly
            className="h-9 border-white/20 bg-black/25 text-xs text-slate-100 selection:bg-cyan-400/30"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 border-white/25 bg-white/10 px-3 text-slate-100 hover:bg-white/20"
            onClick={handleCopyLink}
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          <Button
            type="button"
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={handleNativeShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/20"
            onClick={handleShareWhatsApp}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/20"
            onClick={handleShareSms}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/20"
            onClick={handleShareX}
          >
            <Send className="mr-2 h-4 w-4" />
            X
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/20"
            onClick={handleShareLinkedIn}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            LinkedIn
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/10 text-slate-100 hover:bg-white/20"
            asChild
          >
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
