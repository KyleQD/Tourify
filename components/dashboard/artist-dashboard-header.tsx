'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Eye, ExternalLink, RefreshCw, Settings, Sparkles, User } from 'lucide-react'
import { cn } from '@/utils'
import {
  ARTIST_CARD,
  ARTIST_ICON_WELL,
  ARTIST_OUTLINE_BTN,
  ARTIST_PROGRESS_FILL,
  ARTIST_PROGRESS_TRACK,
  ARTIST_SECTION_LABEL,
} from '@/components/dashboard/artist-tokens'

interface ArtistDashboardHeaderProps {
  displayName: string
  avatarInitial: string
  avatarUrl?: string | null
  profileCompletion: number
  artistPublicPath: string | null
  lastRefreshLabel?: string | null
  onViewPublicProfile: () => void
  onRefresh: () => void
}

export function ArtistDashboardHeader({
  displayName,
  avatarInitial,
  avatarUrl,
  profileCompletion,
  artistPublicPath,
  lastRefreshLabel,
  onViewPublicProfile,
  onRefresh,
}: ArtistDashboardHeaderProps) {
  return (
    <header className={cn(ARTIST_CARD, 'mb-6 overflow-hidden p-5 sm:p-6')}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(ARTIST_ICON_WELL, 'shrink-0 p-0.5')}>
            <Avatar className="h-14 w-14 ring-1 ring-white/10">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-blue-600 text-lg font-bold text-white">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <div className={cn(ARTIST_SECTION_LABEL, 'mb-1.5 flex items-center gap-1.5')}>
              <Sparkles className="h-3 w-3 text-purple-400" />
              Command Center
            </div>
            <h1 className="truncate bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent lg:text-3xl">
              {displayName}
            </h1>
            <div className="mt-2 flex max-w-xs items-center gap-2">
              <div className={cn(ARTIST_PROGRESS_TRACK, 'flex-1')}>
                <div
                  className={ARTIST_PROGRESS_FILL}
                  style={{ width: `${Math.min(100, Math.max(0, profileCompletion))}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {profileCompletion}% profile
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewPublicProfile}
            disabled={!artistPublicPath}
            className={cn(ARTIST_OUTLINE_BTN, 'disabled:opacity-50')}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Public
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
          <Button asChild variant="outline" size="sm" className={ARTIST_OUTLINE_BTN}>
            <Link href="/artist/profile">
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className={ARTIST_OUTLINE_BTN}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {lastRefreshLabel && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              Updated {lastRefreshLabel}
            </span>
          )}
          <Button asChild variant="outline" size="sm" className={ARTIST_OUTLINE_BTN}>
            <Link href="/artist/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
