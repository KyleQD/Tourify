"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, Loader2 } from "lucide-react"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import { cn } from "@/lib/utils"

interface Row {
  id: string
  title: string
  status: string
  user_id: string
  counterparty_user_id: string | null
  updated_at: string | null
}

export default function ContractsInboxPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/login?redirectTo=${encodeURIComponent("/contracts")}`)
        return
      }
      setUserId(user.id)

      const { data, error } = await supabase
        .from("artist_contracts")
        .select("id,title,status,user_id,counterparty_user_id,updated_at")
        .or(`user_id.eq.${user.id},counterparty_user_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (!cancelled) {
        if (error) setRows([])
        else setRows((data || []) as Row[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className={cn(dashboardCreatePattern.shell, "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4")}>
          <div>
            <h1 className="text-2xl font-bold">Your contracts</h1>
            <p className={dashboardCreatePattern.subtleText}>
              Agreements you sent or were invited to sign. You will also receive email updates when something needs
              attention.
            </p>
          </div>
          <Button asChild variant="outline" className={dashboardCreatePattern.btnOutline}>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardContent className="py-12 text-center text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No contracts yet. When someone sends you an agreement, it will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const role = r.user_id === userId ? "You are the sender" : "You were invited to sign"
              return (
                <Card key={r.id} className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-lg text-white">{r.title || "Untitled agreement"}</CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          r.status === "signed" && "border-emerald-500/40 text-emerald-300",
                          r.status === "sent" && "border-blue-500/40 text-blue-300",
                          r.status === "draft" && "border-slate-500 text-slate-400"
                        )}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-500">{role}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button asChild variant="outline" size="sm" className={dashboardCreatePattern.btnOutline}>
                      <Link href={`/contracts/${r.id}`}>
                        Open
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
