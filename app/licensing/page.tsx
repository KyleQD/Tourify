"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MusicTrustFlagOffNote } from "@/components/music/music-trust-flag-off-note"

export default function LicensingHomePage() {
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [disclaimer, setDisclaimer] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch("/api/licensing/projects")
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setEnabled(false)
          setError("Licensing briefs are feature-flagged off.")
          return
        }
        if (!res.ok) {
          setError("Unable to load licensing workspace.")
          return
        }
        const json = await res.json()
        setEnabled(true)
        setProjects(json.data || [])
        setDisclaimer(json.disclaimer || "")
      })
      .catch(() => setError("Unable to load licensing workspace."))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Licensing exchange</h1>
        <p className="text-sm text-muted-foreground">
          Partner-led clearance and agreements. Tourify is not a CMO, PRO, publisher, label, insurer, counsel, or bank.
        </p>
        {disclaimer ? <p className="text-sm text-muted-foreground">{disclaimer}</p> : null}
        <MusicTrustFlagOffNote enabled={enabled} showStagingHint={!enabled} />
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <MusicTrustFlagOffNote enabled={false} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Buyer projects</CardTitle>
            <CardDescription>Classification before quote. Only an executed, effective agreement authorizes use.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              projects.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-muted-foreground">
                    {item.status} · {item.confidentiality}
                  </div>
                  <Button asChild variant="link" className="h-auto px-0" size="sm">
                    <Link href={`/licensing/projects/${item.id}`}>Open project</Link>
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/artist/music/licensing">Artist licensing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
