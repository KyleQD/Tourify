'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, ShieldAlert, Home } from 'lucide-react'
import { isStorageSecurityError } from '@/lib/utils/is-storage-security-error'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const isPrivacyError = useMemo(() => isStorageSecurityError(error), [error])

  useEffect(() => {
    console.error('Admin Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center p-6 min-h-[60vh]">
      <Card className="w-full max-w-md rounded-2xl border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
            {isPrivacyError ? (
              <ShieldAlert className="h-6 w-6 text-amber-300" />
            ) : (
              <AlertCircle className="h-6 w-6 text-rose-300" />
            )}
          </div>
          <CardTitle className="text-white">
            {isPrivacyError ? "Browser privacy conflict" : "Dashboard could not load"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {isPrivacyError
              ? "Your browser's privacy settings are blocking features this page needs."
              : "We hit a snag loading your dashboard. This is usually temporary."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPrivacyError ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              <li>Disable strict tracking protection for this site</li>
              <li>Allow cookies for <span className="font-medium text-white">tourify.live</span></li>
              <li>Exit private/incognito browsing mode</li>
              <li>Try a different browser (Chrome, Firefox, Edge)</li>
            </ul>
          ) : (
            error.message && (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="break-all font-mono text-xs text-slate-300">
                  {error.message.slice(0, 300)}
                </p>
              </div>
            )
          )}
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
