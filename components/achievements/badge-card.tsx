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
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge as BadgeType, UserBadge } from "@/types/achievements"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface BadgeCardProps {
  badge: BadgeType
  userBadge?: UserBadge
  showDetails?: boolean
  onClick?: () => void
  className?: string
}

const categoryConfig = {
  verification: {
    color: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600',
    icon: Shield,
    glow: 'shadow-blue-500/20'
  },
  expertise: {
    color: 'bg-green-500',
    borderColor: 'border-green-400',
    textColor: 'text-green-600',
    icon: Award,
    glow: 'shadow-green-500/20'
  },
  specialization: {
    color: 'bg-purple-500',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-600',
    icon: Star,
    glow: 'shadow-purple-500/20'
  },
  recognition: {
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-600',
    icon: Crown,
    glow: 'shadow-yellow-500/20'
  },
  partnership: {
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-600',
    icon: CheckCircle,
    glow: 'shadow-indigo-500/20'
  },
  certification: {
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-600',
    icon: Award,
    glow: 'shadow-emerald-500/20'
  },
  award: {
    color: 'bg-rose-500',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-600',
    icon: Award,
    glow: 'shadow-rose-500/20'
  },
  milestone: {
    color: 'bg-orange-500',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-600',
    icon: Star,
    glow: 'shadow-orange-500/20'
  },
  community: {
    color: 'bg-teal-500',
    borderColor: 'border-teal-400',
    textColor: 'text-teal-600',
    icon: Award,
    glow: 'shadow-teal-500/20'
  },
  custom: {
    color: 'bg-gray-500',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-600',
    icon: Star,
    glow: 'shadow-gray-500/20'
  }
}

const rarityConfig = {
  common: {
    color: 'bg-gray-500',
    borderColor: 'border-gray-400',
    textColor: 'text-gray-600'
  },
  uncommon: {
    color: 'bg-green-500',
    borderColor: 'border-green-400',
    textColor: 'text-green-600'
  },
  rare: {
    color: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600'
  },
  epic: {
    color: 'bg-purple-500',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-600'
  },
  legendary: {
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-600'
  }
}

export function BadgeCard({ 
  badge, 
  userBadge, 
  showDetails = false, 
  onClick,
  className 
}: BadgeCardProps) {
  const [showFullDetails, setShowFullDetails] = useState(false)
  const isGranted = !!userBadge
  const isActive = userBadge?.is_active || false
  const isExpired = userBadge?.expires_at && new Date(userBadge.expires_at) < new Date()
  const isRevoked = !!userBadge?.revoked_at
  
  const category = categoryConfig[badge.category]
  const rarity = rarityConfig[badge.rarity]
  const CategoryIcon = category.icon

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      CheckCircle: <CheckCircle className="h-4 w-4" />,
      Building: '🏢',
      Shield: <Shield className="h-4 w-4" />,
      Settings: '⚙️',
      Music: '🎵',
      Volume2: '🔊',
      Star: <Star className="h-4 w-4" />,
      Heart: '❤️',
      Award: <Award className="h-4 w-4" />,
      Handshake: '🤝',
      Crown: <Crown className="h-4 w-4" />,
      Calendar: '📅',
      Clock: <Clock className="h-4 w-4" />,
      Target: '🎯'
    }
    return iconMap[iconName] || iconName
  }

  const getStatusColor = () => {
    if (isRevoked) return 'bg-red-500'
    if (isExpired) return 'bg-yellow-500'
    if (isActive) return 'bg-green-500'
    return 'bg-gray-500'
  }

  const getStatusText = () => {
    if (isRevoked) return 'Revoked'
    if (isExpired) return 'Expired'
    if (isActive) return 'Active'
    return 'Inactive'
  }

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer",
        isGranted && isActive && "ring-2 ring-green-500/50",
        isExpired && "ring-2 ring-yellow-500/50",
        isRevoked && "ring-2 ring-red-500/50",
        category.glow,
        className
      )}
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className={cn(
        "absolute top-2 right-2 w-3 h-3 rounded-full",
        getStatusColor()
      )} />
      
      {/* Background gradient based on status */}
      <div className={cn(
        "absolute inset-0 opacity-5",
        isGranted && isActive 
          ? "bg-gradient-to-br from-green-400 to-emerald-600"
          : isExpired
          ? "bg-gradient-to-br from-yellow-400 to-orange-600"
          : isRevoked
          ? "bg-gradient-to-br from-red-400 to-rose-600"
          : "bg-gradient-to-br from-gray-400 to-slate-600"
      )} />

      <CardContent className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Badge Icon */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white",
            isGranted && isActive 
              ? "bg-gradient-to-br from-green-500 to-emerald-600"
              : isExpired
              ? "bg-gradient-to-br from-yellow-500 to-orange-600"
              : isRevoked
              ? "bg-gradient-to-br from-red-500 to-rose-600"
              : "bg-gradient-to-br from-gray-500 to-slate-600"
          )}>
            {getIconComponent(badge.icon)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-semibold text-lg truncate",
                isGranted && isActive ? "text-green-700" : "text-gray-700"
              )}>
                {badge.name}
              </h3>
              {isGranted && isActive && (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              {isExpired && (
                <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              )}
              {isRevoked && (
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {badge.description}
            </p>

            {/* Badge info */}
            <div className="flex items-center gap-2 mb-3">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  category.borderColor,
                  category.textColor
                )}
              >
                <CategoryIcon className="h-3 w-3 mr-1" />
                {badge.category}
              </Badge>
              
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  rarity.borderColor,
                  rarity.textColor
                )}
              >
                {badge.rarity}
              </Badge>

              {badge.level > 1 && (
                <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                  Level {badge.level}
                </Badge>
              )}
            </div>

            {/* Grant info */}
            {userBadge && (
              <div className="text-xs text-gray-500 space-y-1">
                <div>Granted: {formatSafeDate(userBadge.granted_at)}</div>
                {userBadge.granted_reason && (
                  <div>Reason: {userBadge.granted_reason}</div>
                )}
                {userBadge.expires_at && (
                  <div className={cn(
                    "flex items-center gap-1",
                    isExpired ? "text-red-500" : "text-yellow-600"
                  )}>
                    <Clock className="h-3 w-3" />
                    Expires: {formatSafeDate(userBadge.expires_at)}
                  </div>
                )}
                {userBadge.revoked_at && (
                  <div className="text-red-500">
                    Revoked: {formatSafeDate(userBadge.revoked_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        {isGranted && (
          <div className={cn(
            "absolute top-0 left-0 w-full h-1",
            isActive ? "bg-gradient-to-r from-green-400 to-emerald-600" :
            isExpired ? "bg-gradient-to-r from-yellow-400 to-orange-600" :
            "bg-gradient-to-r from-red-400 to-rose-600"
          )} />
        )}

        {/* Details button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-2 right-2 h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation()
            setShowFullDetails(!showFullDetails)
          }}
        >
          <Info className="h-4 w-4" />
        </Button>

        {/* Full details */}
        {showFullDetails && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Badge Details:</h4>
            <div className="text-xs text-gray-600 space-y-2">
              <div>
                <strong>Status:</strong> {getStatusText()}
              </div>
              {userBadge?.granted_by_user && (
                <div className="flex items-center gap-2">
                  <strong>Granted by:</strong>
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={userBadge.granted_by_user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {userBadge.granted_by_user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{userBadge.granted_by_user.full_name || userBadge.granted_by_user.username}</span>
                </div>
              )}
              {badge.requirements && Object.keys(badge.requirements).length > 0 && (
                <div>
                  <strong>Requirements:</strong>
                  <div className="mt-1 space-y-1">
                    {Object.entries(badge.requirements).map(([key, value]) => (
                      <div key={key} className="ml-2">
                        • {key.replace(/_/g, ' ')}: {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 