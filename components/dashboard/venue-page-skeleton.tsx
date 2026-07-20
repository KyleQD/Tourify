"use client"

export function VenuePageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-zinc-800" />
            <div className="h-4 w-32 rounded-md bg-zinc-800/60" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-zinc-800" />
          <div className="h-9 w-28 rounded-md bg-zinc-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-md border border-zinc-800 bg-zinc-900/60" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-md border border-zinc-800 bg-zinc-900/40" />
        <div className="h-72 rounded-md border border-zinc-800 bg-zinc-900/40" />
      </div>
    </div>
  )
}
