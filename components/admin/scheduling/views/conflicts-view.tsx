"use client"

import { useMemo } from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/admin/scheduling/ui/card"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { ConflictsPanel } from "@/components/admin/scheduling/scheduling-conflicts"
import { priorityMeta, type Priority } from "@/components/admin/scheduling/scheduling-data"

export function ConflictsView() {
  const { data } = useScheduling()
  const counts = useMemo(() => {
    const by: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const c of data.conflicts) by[c.severity] += 1
    return by
  }, [data.conflicts])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["critical", "high", "medium", "low"] as Priority[]).map((p) => {
          const meta = priorityMeta[p]
          return (
            <Card key={p} className={cn("border bg-card/70 py-0 backdrop-blur", meta.className.split(" ").find((c) => c.startsWith("border")))}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className="text-[11px] capitalize text-muted-foreground">{p}</span>
                  <span className="text-xl font-semibold text-foreground">{counts[p]}</span>
                </div>
                <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ConflictsPanel />
    </div>
  )
}
