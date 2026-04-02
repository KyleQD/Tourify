"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardContractsCardProps {
  userId: string
}

interface ContractSignatures {
  owner?: { legal_name?: string; signed_at?: string }
  counterparty?: { legal_name?: string; signed_at?: string }
}

interface DashboardContractRow {
  id: string
  title: string
  status: string
  user_id: string
  metadata: Record<string, unknown> | null
}

function needsMySignature(userId: string, row: DashboardContractRow): boolean {
  if (row.status !== "sent") return false
  const meta = (row.metadata || {}) as { signatures?: ContractSignatures }
  const sig = meta.signatures ?? {}
  if (row.user_id === userId) return !sig.owner
  return !sig.counterparty
}

export function DashboardContractsCard({ userId }: DashboardContractsCardProps) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<DashboardContractRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("artist_contracts")
        .select("id,title,status,user_id,metadata")
        .or(`user_id.eq.${userId},counterparty_user_id.eq.${userId}`)
        .in("status", ["sent", "signed"])
        .order("updated_at", { ascending: false })
        .limit(4)

      if (!cancelled) {
        if (!error && data) setItems(data as DashboardContractRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, userId])

  const actionNeeded = items.filter((i) => needsMySignature(userId, i)).length

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) return null

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-purple-500/30">
            <FileText className="h-4 w-4 text-purple-200" />
          </div>
          <div>
            <CardTitle className="text-white text-base">Contracts</CardTitle>
            <CardDescription className="text-gray-400 text-xs">
              {actionNeeded > 0
                ? `${actionNeeded} waiting on your signature`
                : "Recent agreements"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/contracts/${c.id}`}
            className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{c.title || "Agreement"}</p>
              <p className="text-xs text-gray-500">
                {c.user_id === userId ? "You sent" : "Requested your signature"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px]",
                c.status === "signed" && "border-emerald-500/40 text-emerald-300",
                c.status === "sent" && "border-blue-500/40 text-blue-300"
              )}
            >
              {c.status}
            </Badge>
          </Link>
        ))}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full border-purple-500/40 text-purple-200 hover:bg-purple-500/10 rounded-xl"
        >
          <Link href="/contracts/list">
            View all contracts
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
