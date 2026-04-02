import * as React from "react"

import { SurfaceCard } from "@/components/surface/surface-primitives"
import { cn } from "@/lib/utils"

interface AdminSurfaceCardProps extends React.ComponentPropsWithoutRef<typeof SurfaceCard> {}

export function AdminSurfaceCard({ className, ...props }: AdminSurfaceCardProps) {
  return (
    <SurfaceCard
      className={cn("rounded-2xl border-slate-700/50 backdrop-blur-sm", className)}
      {...props}
    />
  )
}
