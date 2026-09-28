import * as React from "react"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

/** A semantic, reusable placeholder for collections or surfaces with no content. */
export function EmptyState({
  title,
  description,
  icon = <Inbox className="h-6 w-6" />,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const titleId = React.useId()
  const descriptionId = description ? `${titleId}-description` : undefined

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center",
        className,
      )}
      {...props}
    >
      <div aria-hidden="true" className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        {icon}
      </div>
      <h2 id={titleId} className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p id={descriptionId} className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </section>
  )
}
