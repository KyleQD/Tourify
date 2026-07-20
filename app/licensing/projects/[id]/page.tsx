"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function LicensingProjectPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id
  const [error, setError] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<any[]>([])
  const [shortlist, setShortlist] = useState<any[]>([])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    Promise.all([
      fetch(`/api/licensing/briefs?project_id=${projectId}`),
      fetch(`/api/licensing/discovery?project_id=${projectId}`),
    ])
      .then(async ([briefsRes, discoveryRes]) => {
        if (cancelled) return
        if (briefsRes.status === 404 || discoveryRes.status === 404) {
          setError("Licensing modules are feature-flagged off.")
          return
        }
        if (!briefsRes.ok) {
          setError("Unable to load project.")
          return
        }
        const briefsJson = await briefsRes.json()
        setBriefs(briefsJson.data || [])
        if (discoveryRes.ok) {
          const discoveryJson = await discoveryRes.json()
          setShortlist(discoveryJson.data?.shortlist || [])
        }
      })
      .catch(() => setError("Unable to load project."))
    return () => {
      cancelled = true
    }
  }, [projectId])

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Licensing project</h1>
        <p className="text-sm text-muted-foreground">
          Briefs, discovery shortlists, and clearance requests. Search results are not licences.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Briefs</CardTitle>
          <CardDescription>{error || "Versioned buyer briefs for clearance."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!error && briefs.length === 0 ? <p className="text-muted-foreground">No briefs yet.</p> : null}
          {briefs.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">Version {item.version}{item.is_current ? " · current" : ""}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shortlist</CardTitle>
          <CardDescription>Default-deny availability; incomplete authority stays inquiry-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {shortlist.length === 0 ? <p className="text-muted-foreground">No shortlisted tracks.</p> : null}
          {shortlist.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="font-medium">{item.artist_music_id}</div>
              <div className="text-muted-foreground">{item.notes || "No notes"}</div>
            </div>
          ))}
          <Button asChild variant="outline">
            <Link href="/licensing">Back to licensing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
