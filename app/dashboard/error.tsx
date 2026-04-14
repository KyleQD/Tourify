"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react"

function isStorageSecurityError(error: unknown): boolean {
  if (!error) return false
  const e = error as { name?: string; message?: string; cause?: unknown }
  const raw = `${e?.name ?? ""} ${e?.message ?? ""} ${String(e?.cause ?? "")} ${String(error)}`
  const msg = raw.toLowerCase().replace(/\u00a0/g, ' ').replace(/\u202f/g, ' ')
  return (
    e?.name === "SecurityError" ||
    e?.name === "NS_ERROR_DOM_SECURITY_ERR" ||
    msg.includes("operation is insecure") ||
    msg.includes("securityerror") ||
    msg.includes("access is denied") ||
    msg.includes("the operation is not allowed") ||
    msg.includes("failed to read the \"cookie\"") ||
    msg.includes("failed to read the \"localstorage\"")
  )
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [retryCount, setRetryCount] = useState(0)
  const isPrivacyError = useMemo(() => isStorageSecurityError(error), [error])

  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error)
  }, [error])

  function handleRetry() {
    setRetryCount((c) => c + 1)
    reset()
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            {isPrivacyError ? (
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            )}
            <CardTitle className="text-slate-100">
              {isPrivacyError ? "Browser privacy conflict" : "Dashboard could not load"}
            </CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            {isPrivacyError
              ? "Your browser's privacy settings are blocking storage access needed by this page."
              : "We hit a snag loading your dashboard. This is usually temporary."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isPrivacyError ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
              <li>Disable strict tracking protection for this site</li>
              <li>
                Allow cookies for{" "}
                <span className="font-medium text-white">tourify.live</span>
              </li>
              <li>Exit private / incognito browsing mode</li>
              <li>Try a different browser (Chrome, Firefox, Edge)</li>
            </ul>
          ) : (
            <p className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
              {error.message || "An unexpected error occurred"}
            </p>
          )}
          {retryCount >= 2 && !isPrivacyError && (
            <p className="mt-3 text-xs text-slate-500">
              Still failing? Try refreshing the page or clearing your browser cache.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            onClick={handleRetry}
            className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
          >
            <RefreshCw className="h-4 w-4" />
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
