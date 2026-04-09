import type { LucideIcon } from "lucide-react"
import { Loader2 } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HiringStateCardProps {
  title: string
  description: string
  icon?: LucideIcon
  isLoading?: boolean
  className?: string
  actionLabel?: string
  onAction?: () => void
}

export function HiringStateCard({
  title,
  description,
  icon: Icon,
  isLoading = false,
  className,
  actionLabel,
  onAction,
}: HiringStateCardProps) {
  return (
    <Card className={cn("border-slate-700 bg-slate-800", className)}>
      <CardContent className="p-8 text-center">
        {isLoading ? (
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-500" />
        ) : Icon ? (
          <Icon className="mx-auto mb-4 h-8 w-8 text-slate-500" />
        ) : null}
        <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
        <p className="text-slate-400">{description}</p>
        {actionLabel && onAction ? (
          <Button className="mt-4" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
