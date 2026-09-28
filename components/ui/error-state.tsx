import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

/** A semantic, reusable error surface with an accessible live alert. */
export function ErrorState({
  title = "Something went wrong",
  description,
  icon = <AlertTriangle className="h-6 w-6" />,
  action,
  className,
  ...props
}: ErrorStateProps) {
  const titleId = React.useId()
  const descriptionId = description ? `${titleId}-description` : undefined

  return (
    <section
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive-foreground",
        className,
      )}
      role="alert"
      {...props}
    >
      <div aria-hidden="true" className="mb-3 rounded-full bg-destructive/15 p-3 text-destructive">
        {icon}
      </div>
      <h2 id={titleId} className="text-lg font-semibold">
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
