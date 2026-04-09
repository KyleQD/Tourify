import { Star } from "lucide-react"

interface ApplicationRatingProps {
  rating?: number
  size?: "sm" | "md"
  showValue?: boolean
}

export function ApplicationRating({ rating, size = "md", showValue = true }: ApplicationRatingProps) {
  if (!rating) return null

  const iconClassName = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`${iconClassName} ${index < rating ? "text-yellow-400 fill-current" : "text-gray-400"}`}
        />
      ))}
      {showValue ? <span className="text-xs text-slate-400 ml-1">({rating})</span> : null}
    </div>
  )
}
