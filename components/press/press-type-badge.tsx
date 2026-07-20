import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PRESS_FORMAT_LABELS, type PressFormat } from '@/lib/press/formats'

const FORMAT_STYLES: Record<PressFormat, string> = {
  blog: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
  article: 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200',
  press_release: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
}

interface PressTypeBadgeProps {
  format: PressFormat
  className?: string
}

export function PressTypeBadge({ format, className }: PressTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', FORMAT_STYLES[format], className)}
    >
      {PRESS_FORMAT_LABELS[format]}
    </Badge>
  )
}
