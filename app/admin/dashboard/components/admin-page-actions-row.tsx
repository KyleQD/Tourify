import * as React from "react"

import { cn } from "@/lib/utils"

interface AdminPageActionsRowProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AdminPageActionsRow({ className, ...props }: AdminPageActionsRowProps) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)} {...props} />
}
