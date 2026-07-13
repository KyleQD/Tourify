import { Skeleton } from '@/components/ui/skeleton'

export default function ContentHubLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56 bg-slate-800" />
        <Skeleton className="h-4 w-80 bg-slate-800" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-800" />
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-800" />
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-800" />
        <Skeleton className="h-10 w-24 rounded-xl bg-slate-800" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl bg-slate-800" />
        <Skeleton className="h-28 rounded-xl bg-slate-800" />
        <Skeleton className="h-28 rounded-xl bg-slate-800" />
      </div>
      <Skeleton className="h-40 rounded-xl bg-slate-800" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-44 rounded-xl bg-slate-800" />
        <Skeleton className="h-44 rounded-xl bg-slate-800" />
        <Skeleton className="h-44 rounded-xl bg-slate-800" />
      </div>
    </div>
  )
}
