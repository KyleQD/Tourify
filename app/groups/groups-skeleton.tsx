import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function GroupsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 bg-slate-800" />
          <Skeleton className="h-5 w-96 max-w-full bg-slate-800" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-slate-700/60 bg-slate-900/70">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-6 w-2/3 bg-slate-800" />
                <Skeleton className="h-4 w-full bg-slate-800" />
                <Skeleton className="h-4 w-1/3 bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
