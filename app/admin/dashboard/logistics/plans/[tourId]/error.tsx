"use client"

import { Button } from "@/components/ui/button"

export default function LogisticsPlanError({ reset }: { error: Error; reset: () => void }) {
  return <div className="space-y-3 px-1 py-8 text-slate-300"><p>Unable to open this logistics plan.</p><Button onClick={reset}>Try again</Button></div>
}
