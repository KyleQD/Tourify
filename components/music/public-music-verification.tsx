"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react"

export function PublicMusicVerification({ kind, publicId }: { kind: "origin" | "certificate"; publicId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  useEffect(() => {
    let active = true
    fetch(`/api/music/${kind}/${encodeURIComponent(publicId)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return
        if (!response.ok) { setNotFound(true); return }
        setData((await response.json()).data)
      })
      .catch(() => { if (active) setNotFound(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind, publicId])

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (notFound || !data) return <div className="container mx-auto max-w-2xl px-4 py-16"><Card><CardHeader><CardTitle>Verification unavailable</CardTitle><CardDescription>This record is unavailable, inactive, or public verification is not enabled.</CardDescription></CardHeader></Card></div>
  return <div className="container mx-auto max-w-2xl px-4 py-16"><Card className="overflow-hidden"><div className="h-2 bg-emerald-500" /><CardHeader><div className="mb-3 flex items-center gap-3"><div className="rounded-full bg-emerald-100 p-3 text-emerald-700"><ShieldCheck className="h-7 w-7" /></div><div><Badge className="bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" />Active</Badge><CardTitle className="mt-2">{kind === "certificate" ? data.label : "Origin record"}</CardTitle></div></div><CardDescription>{data.track?.title}</CardDescription></CardHeader><CardContent className="space-y-4"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Public ID</dt><dd className="break-all font-mono">{data.public_id}</dd></div><div><dt className="text-muted-foreground">Standard</dt><dd>{data.standard_version || data.schema_version}</dd></div><div><dt className="text-muted-foreground">Recorded</dt><dd>{new Date(data.issued_at || data.recorded_at).toLocaleString()}</dd></div><div><dt className="text-muted-foreground">Manifest hash</dt><dd className="break-all font-mono text-xs">{data.manifest_hash}</dd></div></dl><p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{data.disclaimer}</p></CardContent></Card></div>
}
