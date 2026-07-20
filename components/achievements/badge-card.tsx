"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  CheckCircle,
  Shield,
  Award,
  Star,
  Crown,
  Clock,
  X,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge as BadgeType, UserBadge } from "@/types/achievements"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { AchievementIcon } from "@/components/achievements/achievement-icon"
import { humanizeCategory, humanizeRarity } from "@/lib/achievements/labels"

interface BadgeCardProps {
  badge: BadgeType
  userBadge?: UserBadge
  showDetails?: boolean
  onClick?: () => void
  className?: string
  silhouette?: boolean
}

const categoryConfig = {
  verification: {
    color: 'bg-sky-400',
    borderColor: 'border-sky-400/50',
    textColor: 'text-sky-300',
    icon: Shield,
    glow: 'shadow-sky-500/20',
  },
  expertise: {
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-400/50',
    textColor: 'text-emerald-300',
    icon: Award,
    glow: 'shadow-emerald-500/20',
  },
  specialization: {
    color: 'bg-violet-400',
    borderColor: 'border-violet-400/50',
    textColor: 'text-violet-300',
    icon: Star,
    glow: 'shadow-violet-500/20',
  },
  recognition: {
    color: 'bg-amber-400',
    borderColor: 'border-amber-400/50',
    textColor: 'text-amber-300',
    icon: Crown,
    glow: 'shadow-amber-500/20',
  },
  partnership: {
    color: 'bg-indigo-400',
    borderColor: 'border-indigo-400/50',
    textColor: 'text-indigo-300',
    icon: CheckCircle,
    glow: 'shadow-indigo-500/20',
  },
  certification: {
    color: 'bg-teal-400',
    borderColor: 'border-teal-400/50',
    textColor: 'text-teal-300',
    icon: Award,
    glow: 'shadow-teal-500/20',
  },
  award: {
    color: 'bg-rose-400',
    borderColor: 'border-rose-400/50',
    textColor: 'text-rose-300',
    icon: Award,
    glow: 'shadow-rose-500/20',
  },
  milestone: {
    color: 'bg-orange-400',
    borderColor: 'border-orange-400/50',
    textColor: 'text-orange-300',
    icon: Star,
    glow: 'shadow-orange-500/20',
  },
  community: {
    color: 'bg-cyan-400',
    borderColor: 'border-cyan-400/50',
    textColor: 'text-cyan-300',
    icon: Award,
    glow: 'shadow-cyan-500/20',
  },
  custom: {
    color: 'bg-slate-400',
    borderColor: 'border-slate-400/50',
    textColor: 'text-slate-300',
    icon: Star,
    glow: 'shadow-slate-500/10',
  },
}

const rarityConfig = {
  common: { borderColor: 'border-slate-400/50', textColor: 'text-slate-300' },
  uncommon: { borderColor: 'border-emerald-400/50', textColor: 'text-emerald-300' },
  rare: { borderColor: 'border-sky-400/50', textColor: 'text-sky-300' },
  epic: { borderColor: 'border-violet-400/50', textColor: 'text-violet-300' },
  legendary: { borderColor: 'border-amber-400/50', textColor: 'text-amber-300' },
}

const defaultCategory = categoryConfig.custom
const defaultRarity = rarityConfig.common

export function BadgeCard({
  badge,
  userBadge,
  onClick,
  className,
  silhouette = false,
}: BadgeCardProps) {
  const [showFullDetails, setShowFullDetails] = useState(false)
  const isGranted = !!userBadge
  const isActive = userBadge?.is_active || false
  const isExpired = !!(userBadge?.expires_at && new Date(userBadge.expires_at) < new Date())
  const isRevoked = !!userBadge?.revoked_at
  const isSilhouette = silhouette || !isGranted

  const category = categoryConfig[badge.category as keyof typeof categoryConfig] || defaultCategory
  const rarity = rarityConfig[badge.rarity as keyof typeof rarityConfig] || defaultRarity
  const CategoryIcon = category.icon

  function getStatusColor() {
    if (isRevoked) return 'bg-red-400'
    if (isExpired) return 'bg-amber-400'
    if (isActive) return 'bg-emerald-400'
    return 'bg-slate-400'
  }

  function getStatusText() {
    if (isRevoked) return 'Revoked'
    if (isExpired) return 'Expired'
    if (isActive) return 'Active'
    if (!isGranted) return 'Available'
    return 'Inactive'
  }

  function grantSourceLabel() {
    if (badge.is_verification_badge) return 'Verified'
    if (userBadge?.granted_by) return 'Manager-granted'
    if (badge.is_auto_granted) return 'System'
    return 'Awarded'
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer",
        "border-white/10 bg-white/5 text-white backdrop-blur-sm",
        isGranted && isActive && "ring-2 ring-emerald-400/40",
        isExpired && "ring-2 ring-amber-400/40",
        isRevoked && "ring-2 ring-red-400/40",
        isSilhouette && "opacity-70",
        category.glow,
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn("absolute top-2 right-2 w-3 h-3 rounded-full", getStatusColor())}
        title={getStatusText()}
        aria-label={getStatusText()}
      />

      {isGranted && (
        <div
          className={cn(
            "absolute top-0 left-0 w-full h-1",
            isActive
              ? "bg-gradient-to-r from-emerald-400 to-teal-500"
              : isExpired
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-red-400 to-rose-500"
          )}
        />
      )}

      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              isSilhouette
                ? "bg-white/10 text-white/35"
                : isGranted && isActive
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                  : "bg-gradient-to-br from-slate-600 to-slate-700 text-white"
            )}
          >
            {isSilhouette ? (
              <Award className="h-5 w-5 opacity-40" />
            ) : (
              <AchievementIcon name={badge.icon} className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3
                className={cn(
                  "font-semibold text-base line-clamp-2",
                  isGranted && isActive ? "text-emerald-200" : "text-white"
                )}
                title={badge.name}
              >
                {isSilhouette ? badge.name : badge.name}
              </h3>
              {isGranted && isActive && (
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              )}
              {isExpired && <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />}
              {isRevoked && <X className="h-4 w-4 text-red-400 flex-shrink-0" />}
            </div>

            <p className="text-white/65 text-sm mb-3 line-clamp-2" title={badge.description}>
              {badge.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                variant="outline"
                className={cn("text-xs bg-transparent", category.borderColor, category.textColor)}
              >
                <CategoryIcon className="h-3 w-3 mr-1" />
                {humanizeCategory(badge.category)}
              </Badge>

              <Badge
                variant="outline"
                className={cn("text-xs bg-transparent", rarity.borderColor, rarity.textColor)}
              >
                {humanizeRarity(badge.rarity)}
              </Badge>

              {isGranted && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70 bg-transparent">
                  {grantSourceLabel()}
                </Badge>
              )}

              {badge.level > 1 && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70 bg-transparent">
                  Level {badge.level}
                </Badge>
              )}
            </div>

            {userBadge && (
              <div className="text-xs text-white/50 space-y-1">
                <div>Granted: {formatSafeDate(userBadge.granted_at)}</div>
                {userBadge.granted_reason && <div>Reason: {userBadge.granted_reason}</div>}
                {userBadge.expires_at && (
                  <div className={cn("flex items-center gap-1", isExpired ? "text-red-300" : "text-amber-300")}>
                    <Clock className="h-3 w-3" />
                    Expires: {formatSafeDate(userBadge.expires_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-2 right-2 h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation()
            setShowFullDetails(!showFullDetails)
          }}
          aria-label="Badge details"
        >
          <Info className="h-4 w-4" />
        </Button>

        {showFullDetails && (
          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10">
            <h4 className="font-medium text-sm text-white/80 mb-2">Badge details</h4>
            <div className="text-xs text-white/60 space-y-2">
              <div>
                <strong className="text-white/80">Status:</strong> {getStatusText()}
              </div>
              {userBadge?.granted_by_user && (
                <div className="flex items-center gap-2">
                  <strong className="text-white/80">Granted by:</strong>
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={userBadge.granted_by_user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {userBadge.granted_by_user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {userBadge.granted_by_user.full_name || userBadge.granted_by_user.username}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
