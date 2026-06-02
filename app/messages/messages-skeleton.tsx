import { Loader2 } from 'lucide-react'

export function MessagesSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto h-screen max-w-6xl">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            <p className="text-sm">Loading messages…</p>
          </div>
        </div>
      </div>
    </div>
  )
}
