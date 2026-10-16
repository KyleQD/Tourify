import { cn } from "@/lib/utils"

interface AuroraProps {
  className?: string
  colors?: [string, string, string]
}

export function AuroraBg({ className, colors = ["bg-purple-600/30", "bg-blue-600/25", "bg-fuchsia-600/20"] }: AuroraProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className={cn("mkt-aurora-a absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full blur-3xl", colors[0])} />
      <div className={cn("mkt-aurora-b absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full blur-3xl", colors[1])} />
      <div className={cn("mkt-aurora-c absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full blur-3xl", colors[2])} />
    </div>
  )
}
