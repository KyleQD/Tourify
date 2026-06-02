"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RotateCw } from "lucide-react"

interface MessagesErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MessagesError({ error, reset }: MessagesErrorProps) {
  useEffect(() => {
    console.error("[/messages] route error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-slate-900/70 backdrop-blur border-slate-700/60">
        <CardContent className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Messages failed to load</h2>
          <p className="text-sm text-slate-400 mb-6">
            We hit a hiccup while loading your conversations. Try again or come back later.
          </p>
          <Button
            onClick={reset}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
