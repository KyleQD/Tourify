import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyFeedStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyFeedState({
  title = "Nothing here yet",
  description = "Follow artists, join forums, or explore events to personalize your feed.",
  actionLabel = "Explore content",
  onAction,
}: EmptyFeedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-16 text-center backdrop-blur-xl">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/20">
        <Sparkles className="h-7 w-7 text-purple-300" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
      {onAction && (
        <Button
          className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
