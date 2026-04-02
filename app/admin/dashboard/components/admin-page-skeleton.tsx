"use client"

export function AdminPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-sm bg-slate-800/80 backdrop-blur-sm" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-sm bg-slate-800/80" />
            <div className="h-4 w-32 rounded-sm bg-slate-800/50" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-sm bg-slate-800/80" />
          <div className="h-9 w-28 rounded-sm bg-slate-800/80" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-sm bg-slate-900/60 border border-slate-700/30 backdrop-blur-sm" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-sm bg-slate-900/40 border border-slate-700/30 backdrop-blur-sm" />
        <div className="h-72 rounded-sm bg-slate-900/40 border border-slate-700/30 backdrop-blur-sm" />
      </div>
    </div>
  )
}
