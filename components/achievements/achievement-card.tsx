"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Star,
  Zap,
  Target,
  CheckCircle,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Achievement, UserAchievement } from "@/types/achievements"
import { AchievementIcon } from "@/components/achievements/achievement-icon"
import { humanizeCategory, humanizeRarity } from "@/lib/achievements/labels"

interface AchievementCardProps {
  achievement: Achievement
  userAchievement?: UserAchievement
  showProgress?: boolean
  onClick?: () => void
  className?: string
  silhouette?: boolean
}

const rarityConfig = {
  common: {
    color: 'bg-slate-400',
    borderColor: 'border-slate-400/50',
    textColor: 'text-slate-300',
    icon: Star,
    glow: 'shadow-slate-500/10',
  },
  uncommon: {
    color: 'bg-emerald-400',
    borderColor: 'border-emerald-400/50',
    textColor: 'text-emerald-300',
    icon: Star,
    glow: 'shadow-emerald-500/20',
  },
  rare: {
    color: 'bg-sky-400',
    borderColor: 'border-sky-400/50',
    textColor: 'text-sky-300',
    icon: Zap,
    glow: 'shadow-sky-500/20',
  },
  epic: {
    color: 'bg-violet-400',
    borderColor: 'border-violet-400/50',
    textColor: 'text-violet-300',
    icon: Trophy,
    glow: 'shadow-violet-500/20',
  },
  legendary: {
    color: 'bg-amber-400',
    borderColor: 'border-amber-400/50',
    textColor: 'text-amber-300',
    icon: Target,
    glow: 'shadow-amber-500/25',
  },
}

const defaultRarity = rarityConfig.common

export function AchievementCard({
  achievement,
  userAchievement,
  showProgress = true,
  onClick,
  className,
  silhouette = false,
}: AchievementCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isCompleted = userAchievement?.is_completed || false
  const progress = userAchievement?.progress_percentage || 0
  const rarity = rarityConfig[achievement.rarity] || defaultRarity
  const RarityIcon = rarity.icon
  const isLockedHidden = silhouette || (achievement.is_hidden && !isCompleted)

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer",
        "border-white/10 bg-white/5 text-white backdrop-blur-sm",
        isCompleted && "ring-2 ring-emerald-400/40",
        rarity.glow,
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute top-2 right-2 w-3 h-3 rounded-full",
          rarity.color
        )}
        title={`${humanizeRarity(achievement.rarity)} rarity`}
        aria-label={`${humanizeRarity(achievement.rarity)} rarity`}
      />

      {isCompleted && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      )}

      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white",
              isLockedHidden
                ? "bg-white/10 text-white/40"
                : isCompleted
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-slate-600 to-slate-700"
            )}
          >
            {isLockedHidden ? (
              <Trophy className="h-5 w-5 opacity-40" />
            ) : (
              <AchievementIcon name={achievement.icon} className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3
                className={cn(
                  "font-semibold text-base line-clamp-2",
                  isCompleted ? "text-emerald-200" : "text-white"
                )}
                title={achievement.name}
              >
                {isLockedHidden ? "Hidden achievement" : achievement.name}
              </h3>
              {isCompleted && (
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" aria-label="Completed" />
              )}
            </div>

            <p className="text-white/65 text-sm mb-3 line-clamp-2" title={achievement.description}>
              {isLockedHidden
                ? "Keep exploring to uncover this achievement."
                : achievement.description}
            </p>

            {showProgress && !isLockedHidden && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-2 bg-white/10"
                />
                {userAchievement && (
                  <div className="text-xs text-white/50">
                    {userAchievement.current_value} / {userAchievement.target_value}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className={cn("text-xs bg-transparent", rarity.borderColor, rarity.textColor)}
              >
                <RarityIcon className="h-3 w-3 mr-1" />
                {humanizeRarity(achievement.rarity)}
              </Badge>

              <Badge variant="outline" className="text-xs border-white/20 text-white/70 bg-transparent">
                {achievement.points} pts
              </Badge>

              <Badge variant="outline" className="text-xs border-white/20 text-white/70 bg-transparent">
                {humanizeCategory(achievement.category)}
              </Badge>
            </div>
          </div>
        </div>

        {!isLockedHidden && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              setShowDetails(!showDetails)
            }}
            aria-label="Achievement details"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}

        {showDetails && !isLockedHidden && (
          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10">
            <h4 className="font-medium text-sm text-white/80 mb-2">Requirements</h4>
            <div className="text-xs text-white/60 space-y-1">
              {Object.entries(achievement.requirements || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      userAchievement?.progress_data?.[key] ? "bg-emerald-400" : "bg-white/25"
                    )}
                  />
                  <span className="capitalize">{key.replace(/_/g, ' ')}: {String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
