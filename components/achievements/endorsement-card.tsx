"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ThumbsUp, 
  Star, 
  MessageCircle, 
  Calendar,
  CheckCircle,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Endorsement } from "@/types/achievements"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EndorsementCardProps {
  endorsement: Endorsement
  showEndorser?: boolean
  showActions?: boolean
  onEdit?: (endorsement: Endorsement) => void
  onDelete?: (endorsementId: string) => void
  className?: string
}

const levelConfig = {
  1: { color: 'bg-gray-500', text: 'Beginner' },
  2: { color: 'bg-blue-500', text: 'Intermediate' },
  3: { color: 'bg-green-500', text: 'Advanced' },
  4: { color: 'bg-purple-500', text: 'Expert' },
  5: { color: 'bg-yellow-500', text: 'Master' }
}

const categoryConfig = {
  technical: {
    color: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600'
  },
  creative: {
    color: 'bg-purple-500',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-600'
  },
  business: {
    color: 'bg-green-500',
    borderColor: 'border-green-400',
    textColor: 'text-green-600'
  },
  interpersonal: {
    color: 'bg-orange-500',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-600'
  },
  leadership: {
    color: 'bg-red-500',
    borderColor: 'border-red-400',
    textColor: 'text-red-600'
  },
  specialized: {
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-600'
  }
}

export function EndorsementCard({ 
  endorsement, 
  showEndorser = true, 
  showActions = false,
  onEdit,
  onDelete,
  className 
}: EndorsementCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const level = levelConfig[endorsement.level as keyof typeof levelConfig]
  const category = endorsement.category ? categoryConfig[endorsement.category as keyof typeof categoryConfig] : null

  const renderStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3 w-3",
          i < level ? "text-yellow-400 fill-current" : "text-gray-300"
        )}
      />
    ))
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-md",
      endorsement.is_verified && "ring-2 ring-green-500/50",
      className
    )}>
      {/* Verification indicator */}
      {endorsement.is_verified && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Endorser Avatar */}
          {showEndorser && endorsement.endorser && (
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={endorsement.endorser.avatar_url} />
              <AvatarFallback className="text-sm">
                {endorsement.endorser.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                    {endorsement.skill}
                  </h4>
                  {category && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        category.borderColor,
                        category.textColor
                      )}
                    >
                      {endorsement.category}
                    </Badge>
                  )}
                </div>

                {/* Level indicator */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {renderStars(endorsement.level)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      level.color.replace('bg-', 'border-').replace('-500', '-400'),
                      level.color.replace('bg-', 'text-').replace('-500', '-600')
                    )}
                  >
                    {level.text}
                  </Badge>
                </div>
              </div>

              {/* Actions menu */}
              {showActions && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>

                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm"
                        onClick={() => {
                          onEdit?.(endorsement)
                          setShowActionsMenu(false)
                        }}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm text-red-600 hover:text-red-700"
                        onClick={() => {
                          onDelete?.(endorsement.id)
                          setShowActionsMenu(false)
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Endorser info */}
            {showEndorser && endorsement.endorser && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Endorsed by</span>
                <span className="text-xs font-medium text-gray-700">
                  {endorsement.endorser.full_name || endorsement.endorser.username}
                </span>
              </div>
            )}

            {/* Comment */}
            {endorsement.comment && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 italic">
                  "{endorsement.comment}"
                </p>
              </div>
            )}

            {/* Context info */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatSafeDate(endorsement.created_at)}
              </div>

              {/* Context badges */}
              {endorsement.project_id && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                  Project
                </Badge>
              )}
              {endorsement.collaboration_id && (
                <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                  Collaboration
                </Badge>
              )}
              {endorsement.event_id && (
                <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                  Event
                </Badge>
              )}
              {endorsement.job_id && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                  Job
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Verification bar */}
        {endorsement.is_verified && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
        )}
      </CardContent>
    </Card>
  )
} 