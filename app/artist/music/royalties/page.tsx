"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface FlagAwareResponse {
  enabled?: boolean
  data?: any
  error?: { code?: string; message?: string }
}

function formatMinor(value: string | number | null | undefined, currency = "USD") {
  if (value == null) return "—"
  const minor = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(minor)) return String(value)
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100)
}

function DisabledNotice({ feature }: { feature: string }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/10">
      <CardContent className="pt-6 text-sm text-amber-100">
        {feature} is flag-gated and currently disabled for this account. Enable the corresponding
        music royalties feature flag to use this tab.
      </CardContent>
    </Card>
  )
}

export default function ArtistMusicRoyaltiesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [imports, setImports] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [statements, setStatements] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [valuations, setValuations] = useState<any[]>([])
  const [flags, setFlags] = useState({
    imports: false,
    matches: false,
    statements: false,
    payouts: false,
    valuation: false,
  })
  const [csvText, setCsvText] = useState("isrc,net,currency,usage_start,usage_end,territory\nUSRC17607839,1.50,USD,2026-01-01,2026-01-31,US")
  const [provider, setProvider] = useState("generic_csv")

  const loadTab = useCallback(async (path: string) => {
    const response = await fetch(path, { credentials: "include", cache: "no-store" })
    const body = (await response.json().catch(() => ({}))) as FlagAwareResponse
    if (response.status === 404 && body?.error?.code === "feature_disabled")
      return { enabled: false, data: [] as any[] }
    if (!response.ok)
      throw new Error(body?.error?.message || "Request failed")
    return { enabled: true, data: body.data || [] }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [importsRes, matchesRes, statementsRes, payoutsRes, valuationsRes] = await Promise.all([
        loadTab("/api/artist/music/royalties/imports"),
        loadTab("/api/artist/music/royalties/matches"),
        loadTab("/api/artist/music/royalties/statements"),
        loadTab("/api/artist/music/payouts/status"),
        loadTab("/api/artist/music/valuation"),
      ])
      setImports(importsRes.data)
      setMatches(matchesRes.data)
      setStatements(statementsRes.data)
      setPayouts(payoutsRes.data)
      setValuations(valuationsRes.data)
      setFlags({
        imports: importsRes.enabled,
        matches: matchesRes.enabled,
        statements: statementsRes.enabled,
        payouts: payoutsRes.enabled,
        valuation: valuationsRes.enabled,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load royalties workspace")
    } finally {
      setLoading(false)
    }
  }, [loadTab])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  async function createPilotImport() {
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/royalties/imports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          csv_text: csvText,
          currency: "USD",
          original_filename: "pilot.csv",
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Import failed")
      toast.success("Import created")
      await loadAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  async function decideMatch(candidateId: string, action: "accept" | "reject") {
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/royalties/matches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, candidate_id: candidateId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Match update failed")
      toast.success(action === "accept" ? "Match accepted" : "Candidate rejected")
      await loadAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Match update failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 text-slate-300" onClick={() => router.push("/artist/music")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to music library
            </Button>
            <h1 className="text-3xl font-bold text-white">Royalties &amp; valuation</h1>
            <p className="text-slate-400">
              Import statements, review matches, issue participant statements, track payouts, and run model valuations.
              Amounts are integer minor units — never float cash.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadAll()} disabled={loading || busy}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
          </div>
        ) : (
          <Tabs defaultValue="imports" className="space-y-4">
            <TabsList className="bg-slate-900/80">
              <TabsTrigger value="imports">Imports</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="statements">Statements</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
            </TabsList>

            <TabsContent value="imports" className="space-y-4">
              {!flags.imports ? <DisabledNotice feature="Royalty imports" /> : (
                <>
                  <Card className="border-slate-700 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="text-white">Pilot CSV import</CardTitle>
                      <CardDescription>
                        Paste a generic royalty CSV for local pilot normalization. File uploads use signed URLs to the private music-royalty-statements bucket.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Input id="provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="border-slate-700 bg-slate-800" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="csv">CSV text</Label>
                        <Textarea id="csv" value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={8} className="border-slate-700 bg-slate-800 font-mono text-xs" />
                      </div>
                      <Button onClick={() => void createPilotImport()} disabled={busy}>
                        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create import
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-700 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="text-white">Import batches</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!imports.length ? <p className="text-sm text-slate-400">No imports yet.</p> : imports.map((item) => (
                        <div key={item.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-white">{item.original_filename || item.provider}</p>
                            <p className="text-xs text-slate-400">
                              {formatMinor(item.normalized_total_minor || item.source_total_minor, item.currency || "USD")}
                              {" · "}
                              {item.period_start || "—"} → {item.period_end || "—"}
                            </p>
                          </div>
                          <Badge>{String(item.status).replaceAll("_", " ")}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="matches" className="space-y-4">
              {!flags.matches ? <DisabledNotice feature="Royalty matching" /> : (
                <Card className="border-slate-700 bg-slate-900/60">
                  <CardHeader>
                    <CardTitle className="text-white">Match review queue</CardTitle>
                    <CardDescription>Review candidate, ambiguous, and unmatched lines. Title-only matches are never auto-accepted.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!matches.length ? <p className="text-sm text-slate-400">No lines need review.</p> : matches.map((line) => {
                      const candidates = line.music_royalties_match_candidates || []
                      return (
                        <div key={line.id} className="space-y-2 rounded-md border border-slate-700 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">{line.isrc || "No ISRC"} · {formatMinor(line.net_royalty_minor, line.currency)}</p>
                              <p className="text-xs text-slate-400">{line.usage_start} → {line.usage_end} · {line.territory || "territory n/a"}</p>
                            </div>
                            <Badge variant="secondary">{line.match_status}</Badge>
                          </div>
                          {candidates.filter((candidate: any) => candidate.status === "open").map((candidate: any) => (
                            <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 p-2">
                              <p className="text-sm text-slate-300">
                                Track {String(candidate.artist_music_id).slice(0, 8)} · confidence {candidate.confidence}
                              </p>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={busy} onClick={() => void decideMatch(candidate.id, "accept")}>Accept</Button>
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => void decideMatch(candidate.id, "reject")}>Reject</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="statements" className="space-y-4">
              {!flags.statements ? <DisabledNotice feature="Participant statements" /> : (
                <Card className="border-slate-700 bg-slate-900/60">
                  <CardHeader>
                    <CardTitle className="text-white">Participant statements</CardTitle>
                    <CardDescription>Issued statements show gross, deductions, recoupment, holds, and payable separately.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!statements.length ? <p className="text-sm text-slate-400">No statements issued yet.</p> : statements.map((statement) => (
                      <div key={statement.id} className="rounded-md border border-slate-700 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">Payee {statement.payee_party_id}</p>
                          <Badge>{statement.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">
                          Payable {formatMinor(statement.payable_minor, statement.currency)}
                          {" · held "}
                          {formatMinor(statement.held_minor, statement.currency)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payouts" className="space-y-4">
              {!flags.payouts ? <DisabledNotice feature="Royalty payouts" /> : (
                <Card className="border-slate-700 bg-slate-900/60">
                  <CardHeader>
                    <CardTitle className="text-white">Payout batches</CardTitle>
                    <CardDescription>Maker-checker approval is required before submission. Provider IDs only — no bank numbers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!payouts.length ? <p className="text-sm text-slate-400">No payout batches yet.</p> : payouts.map((batch) => (
                      <div key={batch.id} className="rounded-md border border-slate-700 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{batch.currency} batch</p>
                          <Badge>{String(batch.status).replaceAll("_", " ")}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {(batch.music_royalties_payout_instructions || []).length} instructions
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="valuation" className="space-y-4">
              {!flags.valuation ? <DisabledNotice feature="Catalog valuation" /> : (
                <Card className="border-slate-700 bg-slate-900/60">
                  <CardHeader>
                    <CardTitle className="text-white">Catalog valuations</CardTitle>
                    <CardDescription>
                      Model estimates only — not offers to sell securities or guarantees of future cash flows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!valuations.length ? <p className="text-sm text-slate-400">No valuations yet.</p> : valuations.map((valuation) => (
                      <div key={valuation.id} className="rounded-md border border-slate-700 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{valuation.valuation_date}</p>
                          <Badge>{valuation.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-300">
                          Downside {formatMinor(valuation.downside_minor, valuation.currency)}
                          {" · base "}
                          {formatMinor(valuation.base_minor, valuation.currency)}
                          {" · upside "}
                          {formatMinor(valuation.upside_minor, valuation.currency)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
