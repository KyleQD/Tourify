"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

interface SegmentErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  title: string
  description?: string
  recoveryHref?: string
  recoveryLabel?: string
}

export function SegmentError({
  error,
  reset,
  title,
  description = "We hit a snag loading this page. This is usually temporary.",
  recoveryHref = "/dashboard",
  recoveryLabel = "Go to dashboard",
}: SegmentErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.error(`[${title}]`, error?.message?.slice(0, 200))
  }, [error, title])

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            {error.message?.slice(0, 300) || "An unexpected error occurred"}
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} className="flex-1 gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => router.push(recoveryHref)}>
            {recoveryLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
