'use client'

import { motion } from 'framer-motion'
import {
  Check,
  MapPin,
  UserPlus,
  Users,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { FriendSuggestion } from '@/lib/types/social'
import type { KeyboardEvent } from 'react'

interface SuggestedProfileCardProps {
  suggestion: FriendSuggestion
  onConnect: (suggestion: FriendSuggestion) => void
  onViewProfile: (suggestion: FriendSuggestion) => void
  isConnecting?: boolean
  className?: string
}

const RECENT_JOIN_DAYS = 14

function avatarFallback(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function accountTypeLabel(accountType?: string | null) {
  if (!accountType) return 'Member'
  if (accountType === 'organization' || accountType === 'admin') return 'Organization'
  return accountType.charAt(0).toUpperCase() + accountType.slice(1)
}

function isJoinedRecently(createdAt?: string | null) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  const cutoff = Date.now() - RECENT_JOIN_DAYS * 24 * 60 * 60 * 1000
  return created >= cutoff
}

export function SuggestedProfileCard({
  suggestion,
  onConnect,
  onViewProfile,
  isConnecting = false,
  className,
}: SuggestedProfileCardProps) {
  const canConnect = suggestion.can_send_request !== false
  const displayName = suggestion.full_name || suggestion.username
  const hasOutgoingPending = suggestion.outgoing_request?.status === 'pending'
  const avatarUrl = suggestion.avatar_url?.trim() || undefined
  const joinedRecently = isJoinedRecently(suggestion.created_at)

  function handleCardActivate() {
    onViewProfile(suggestion)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardActivate()
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn('h-full', className)}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={handleCardActivate}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-full cursor-pointer border-slate-700/60 bg-slate-800/50 backdrop-blur-sm',
          'transition-colors hover:border-purple-500/40 hover:bg-slate-800/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 ring-2 ring-slate-600">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                {avatarFallback(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-base text-white">
                  {displayName}
                </CardTitle>
                {suggestion.is_verified && (
                  <Badge className="shrink-0 border-0 bg-blue-500/20 text-blue-200">
                    <Check className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-slate-400">@{suggestion.username}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="capitalize border-slate-600 bg-slate-700/60 text-slate-200"
            >
              {accountTypeLabel(suggestion.account_type)}
            </Badge>
            {joinedRecently && (
              <Badge className="border-0 bg-emerald-500/15 text-emerald-200">
                <Sparkles className="mr-1 h-3 w-3" />
                Joined recently
              </Badge>
            )}
          </div>

          <p className="line-clamp-2 text-sm text-slate-300">
            {suggestion.bio || 'No bio yet.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {suggestion.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[140px]">{suggestion.location}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {suggestion.followers_count || 0} followers
            </span>
          </div>

          {suggestion.mutual_friends && suggestion.mutual_friends.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex -space-x-1.5">
                {suggestion.mutual_friends.slice(0, 3).map((friend) => {
                  const friendAvatar = friend.avatar_url?.trim() || undefined
                  return (
                    <Avatar key={friend.id} className="h-5 w-5 border border-slate-800">
                      {friendAvatar ? (
                        <AvatarImage src={friendAvatar} alt={friend.full_name} />
                      ) : null}
                      <AvatarFallback className="text-[9px]">
                        {friend.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )
                })}
              </div>
              <span>
                {suggestion.mutual_count || suggestion.mutual_friends.length} mutual
                {(suggestion.mutual_count || suggestion.mutual_friends.length) !== 1
                  ? ' friends'
                  : ' friend'}
              </span>
            </div>
          )}

          <div
            className="flex gap-2"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl border-slate-600 text-white hover:bg-slate-700"
              onClick={() => onViewProfile(suggestion)}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Profile
            </Button>
            {canConnect && !hasOutgoingPending ? (
              <Button
                size="sm"
                className="flex-1 rounded-xl bg-purple-600 text-white hover:bg-purple-500"
                disabled={isConnecting}
                onClick={() => onConnect(suggestion)}
              >
                {isConnecting ? (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Connect
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled
                className="flex-1 rounded-xl bg-slate-700/80 text-slate-300"
              >
                {hasOutgoingPending ? 'Request Sent' : 'Connected'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
