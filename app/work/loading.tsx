import { Skeleton } from "@/components/ui/skeleton"

export default function WorkModeLoading() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-24 w-full bg-slate-800" />
        <Skeleton className="h-14 w-full bg-slate-800" />
        <Skeleton className="h-80 w-full bg-slate-800" />
      </div>
    </div>
  )
}
