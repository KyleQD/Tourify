import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden={ariaHidden}
      {...props}
    />
  )
}

export { Skeleton }
