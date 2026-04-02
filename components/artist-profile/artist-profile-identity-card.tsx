"use client"

import { useRef } from "react"
import Link from "next/link"
import { Camera, ExternalLink, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import { Star } from "lucide-react"

interface ArtistProfileIdentityCardProps {
  avatarUrl: string | null
  coverImageUrl: string | null
  displayName: string
  avatarInitial: string
  genreLine: string
  username: string | null
  isVerified?: boolean
  hasUnsavedChanges?: boolean
  uploadingAvatar: boolean
  uploadingCover: boolean
  onAvatarFile: (file: File) => void
  onCoverFile: (file: File) => void
  publicProfilePath: string
}

export function ArtistProfileIdentityCard({
  avatarUrl,
  coverImageUrl,
  displayName,
  avatarInitial,
  genreLine,
  username,
  isVerified,
  hasUnsavedChanges,
  uploadingAvatar,
  uploadingCover,
  onAvatarFile,
  onCoverFile,
  publicProfilePath
}: ArtistProfileIdentityCardProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card className={dashboardCreatePattern.shell}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">Public appearance</CardTitle>
        <p className={`${dashboardCreatePattern.subtleText} text-xs`}>
          Avatar and banner appear on your public artist page.{" "}
          <Link
            href={publicProfilePath}
            className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200"
            target="_blank"
            rel="noreferrer"
          >
            View public profile
            <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50 ${dashboardCreatePattern.panel}`}
        >
          <div className="relative aspect-[21/9] min-h-[120px] w-full bg-gradient-to-br from-purple-950/80 via-slate-900 to-black">
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) onCoverFile(f)
                e.target.value = ""
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploadingCover}
              className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
              onClick={() => coverInputRef.current?.click()}
            >
              {uploadingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span className="ml-2">Banner</span>
            </Button>
          </div>

          <div className="relative -mt-12 flex justify-center px-4 pb-4">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-slate-950 shadow-xl ring-2 ring-white/10">
                <AvatarImage key={avatarUrl ?? "none"} src={avatarUrl || undefined} alt="" />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-2xl font-semibold text-white">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onAvatarFile(f)
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                size="icon"
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full border border-white/20 bg-purple-600 shadow-lg hover:bg-purple-500"
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-white">{displayName}</h3>
          {username ? (
            <p className="text-sm text-slate-400">@{username}</p>
          ) : null}
          <p className="text-sm text-slate-400">{genreLine}</p>
          {isVerified ? (
            <Badge className="rounded-full bg-blue-600/90">
              <Star className="mr-1 h-3 w-3" />
              Verified Artist
            </Badge>
          ) : null}
          {hasUnsavedChanges ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-200">
              Unsaved changes
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
