"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Star,
  Calendar,
  CheckCircle,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Endorsement } from "@/types/achievements"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { humanizeCategory } from "@/lib/achievements/labels"

interface EndorsementCardProps {
  endorsement: Endorsement
  showEndorser?: boolean
  showActions?: boolean
  onEdit?: (endorsement: Endorsement) => void
  onDelete?: (endorsementId: string) => void
  className?: string
  contextLabel?: string
}

const levelConfig: Record<number, { color: string; text: string; border: string; textColor: string }> = {
  1: { color: 'bg-slate-400', text: 'Beginner', border: 'border-slate-400/50', textColor: 'text-slate-300' },
  2: { color: 'bg-sky-400', text: 'Intermediate', border: 'border-sky-400/50', textColor: 'text-sky-300' },
  3: { color: 'bg-emerald-400', text: 'Advanced', border: 'border-emerald-400/50', textColor: 'text-emerald-300' },
  4: { color: 'bg-violet-400', text: 'Expert', border: 'border-violet-400/50', textColor: 'text-violet-300' },
  5: { color: 'bg-amber-400', text: 'Master', border: 'border-amber-400/50', textColor: 'text-amber-300' },
}

const categoryConfig: Record<string, { borderColor: string; textColor: string }> = {
  technical: { borderColor: 'border-sky-400/50', textColor: 'text-sky-300' },
  creative: { borderColor: 'border-violet-400/50', textColor: 'text-violet-300' },
  business: { borderColor: 'border-emerald-400/50', textColor: 'text-emerald-300' },
  interpersonal: { borderColor: 'border-orange-400/50', textColor: 'text-orange-300' },
  leadership: { borderColor: 'border-rose-400/50', textColor: 'text-rose-300' },
  specialized: { borderColor: 'border-indigo-400/50', textColor: 'text-indigo-300' },
}

const defaultLevel = levelConfig[3]

export function EndorsementCard({
  endorsement,
  showEndorser = true,
  showActions = false,
  onEdit,
  onDelete,
  className,
  contextLabel,
}: EndorsementCardProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const level = levelConfig[endorsement.level] || defaultLevel
  const category = endorsement.category
    ? categoryConfig[endorsement.category] || null
    : null

  const hasWorkContext = !!(
    endorsement.job_id ||
    endorsement.event_id ||
    endorsement.collaboration_id ||
    endorsement.project_id
  )

  function renderStars(starLevel: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3 w-3",
          i < starLevel ? "text-amber-400 fill-current" : "text-white/25"
        )}
      />
    ))
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "border-white/10 bg-white/5 text-white backdrop-blur-sm",
        endorsement.is_verified && "ring-2 ring-emerald-400/40",
        className
      )}
    >
      {endorsement.is_verified && (
        <div className="absolute top-2 right-2" title="Verified work endorsement">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
        </div>
      )}

      {endorsement.is_verified && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {showEndorser && endorsement.endorser && (
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={endorsement.endorser.avatar_url} />
              <AvatarFallback className="text-sm bg-white/10">
                {endorsement.endorser.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-white line-clamp-2" title={endorsement.skill}>
                    {endorsement.skill}
                  </h4>
                  {category && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs bg-transparent", category.borderColor, category.textColor)}
                    >
                      {humanizeCategory(endorsement.category)}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">{renderStars(endorsement.level)}</div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs bg-transparent", level.border, level.textColor)}
                  >
                    {level.text}
                  </Badge>
                </div>
              </div>

              {showActions && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>

                  {showActionsMenu && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-slate-900 border border-white/15 rounded-lg shadow-lg z-10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm text-white/80"
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
                        className="w-full justify-start text-sm text-red-300 hover:text-red-200"
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

            {showEndorser && endorsement.endorser && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/50">Endorsed by</span>
                <span className="text-xs font-medium text-white/80">
                  {endorsement.endorser.full_name || endorsement.endorser.username}
                </span>
              </div>
            )}

            {endorsement.comment && (
              <p className="text-sm text-white/65 italic mb-3 line-clamp-3">
                &ldquo;{endorsement.comment}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatSafeDate(endorsement.created_at)}
              </div>

              {endorsement.is_verified && (
                <Badge variant="outline" className="text-xs border-emerald-400/40 text-emerald-300 bg-transparent">
                  Verified work
                </Badge>
              )}

              {contextLabel && (
                <Badge variant="outline" className="text-xs border-white/20 text-white/70 bg-transparent">
                  {contextLabel}
                </Badge>
              )}

              {!contextLabel && hasWorkContext && (
                <>
                  {endorsement.project_id && (
                    <Badge variant="outline" className="text-xs border-sky-400/40 text-sky-300 bg-transparent">
                      Project
                    </Badge>
                  )}
                  {endorsement.collaboration_id && (
                    <Badge variant="outline" className="text-xs border-emerald-400/40 text-emerald-300 bg-transparent">
                      Collaboration
                    </Badge>
                  )}
                  {endorsement.event_id && (
                    <Badge variant="outline" className="text-xs border-violet-400/40 text-violet-300 bg-transparent">
                      Event
                    </Badge>
                  )}
                  {endorsement.job_id && (
                    <Badge variant="outline" className="text-xs border-orange-400/40 text-orange-300 bg-transparent">
                      Job
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
