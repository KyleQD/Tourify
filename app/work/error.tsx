"use client"

import { Button } from "@/components/ui/button"

export default function WorkModeError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-md rounded-xl border border-rose-500/30 bg-slate-900 p-6 text-center">
        <h1 className="text-xl font-semibold">Work Mode could not open</h1>
        <p className="mt-2 text-sm text-slate-300">
          Your assignment selection is safe. Retry when the connection is available.
        </p>
        <Button className="mt-5" onClick={reset}>
          Retry
        </Button>
      </div>
    </main>
  )
}
