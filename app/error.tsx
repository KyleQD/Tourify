"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ShieldAlert } from "lucide-react"
import { isStorageSecurityError } from "@/lib/utils/is-storage-security-error"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const isPrivacyError = useMemo(() => isStorageSecurityError(error), [error])

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-64 w-64 rotate-12 rounded-[2rem] bg-purple-500/15 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-72 w-72 -rotate-12 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        <CardHeader className="relative">
          <div className="flex items-center space-x-2">
            {isPrivacyError ? (
              <ShieldAlert className="h-5 w-5 text-amber-300" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-300" />
            )}
            <CardTitle className="text-slate-100">
              {isPrivacyError ? "Browser privacy conflict" : "Something went wrong!"}
            </CardTitle>
          </div>
          <CardDescription className="text-slate-300">
            {isPrivacyError
              ? "Your browser's privacy settings are blocking features this page needs to load."
              : "We apologize for the inconvenience. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {isPrivacyError ? (
            <div className="space-y-2 text-sm text-slate-200">
              <p>Try one of the following:</p>
              <ul className="list-disc space-y-1 pl-5 text-slate-300">
                <li>Disable strict tracking protection for this site</li>
                <li>Allow cookies for <span className="font-medium text-white">tourify.live</span></li>
                <li>Exit private/incognito browsing mode</li>
                <li>Use a different browser (Chrome, Firefox, Edge)</li>
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-200">
              {error.message || "An unexpected error occurred"}
            </p>
          )}
        </CardContent>
        <CardFooter className="relative flex gap-2">
          <Button
            onClick={reset}
            className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
            onClick={() => router.push("/")}
          >
            Go home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
