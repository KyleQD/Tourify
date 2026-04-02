'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin Dashboard Error:', error)
  }, [error])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-64 w-64 rotate-12 rounded-[2rem] bg-purple-500/15 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-72 w-72 -rotate-12 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
            <AlertCircle className="h-6 w-6 text-rose-300" />
          </div>
          <CardTitle className="text-white">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-slate-300">
            We apologize for the inconvenience. Please try again.
          </p>
          {error.message && (
            <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <p className="break-all font-mono text-xs text-slate-200">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={reset}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/admin/dashboard'}
              className="w-full border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
            >
              Go to Admin Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 