"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-4">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-16 h-64 w-64 rotate-12 rounded-[2rem] bg-purple-500/15 blur-3xl" />
            <div className="absolute -right-20 bottom-8 h-72 w-72 -rotate-12 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
          </div>
          
          <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            <CardHeader className="relative space-y-1 text-center">
              <div className="flex items-center space-x-2 mb-4">
                <AlertCircle className="h-8 w-8 text-rose-300" />
              </div>
              <CardTitle className="text-2xl text-white">Something went wrong</CardTitle>
              <CardDescription className="text-slate-300">
                We apologize for the inconvenience. Please try again.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative flex flex-col items-center text-center">
              <div className="mt-2 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-200">
                {error.message || "An unexpected error occurred"}
              </div>
            </CardContent>
            
            <CardFooter className="relative flex justify-center">
              <div className="space-x-2">
                <Button
                  variant="default"
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
                  onClick={() => reset()}
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
                  onClick={() => window.location.href = "/"}
                >
                  Go to homepage
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  )
} 