"use client"

import { Suspense } from "react"
import { ContentHubShell } from "@/components/admin/content-hub/content-hub-shell"

function ContentHubFallback() {
  return (
    <div className="rounded-sm border border-slate-700/50 bg-slate-900/60 p-12 text-center text-sm text-slate-400">
      Loading Content Hub…
    </div>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={<ContentHubFallback />}>
      <ContentHubShell />
    </Suspense>
  )
}
