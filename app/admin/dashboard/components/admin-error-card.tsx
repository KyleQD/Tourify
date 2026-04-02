"use client"

import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AdminErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function AdminErrorCard({ title = "Something went wrong", message, onRetry }: AdminErrorCardProps) {
  return (
    <Card className="rounded-sm bg-red-950/20 border-red-700/30 backdrop-blur-sm">
      <CardContent className="p-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-sm bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-red-500/10">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-300">{title}</h3>
          <p className="text-sm text-red-400/80 mt-0.5">{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 border-red-700/40 text-red-300 hover:bg-red-950/40 transition-all duration-200">
              Try again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
