"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RightsProject {
  id: string
  title: string
  status: string
  version: number
  artist_music_id: string
  work?: { id: string; title: string; iswc?: string | null } | null
  recording?: { id: string; title: string; isrc?: string | null; musical_work_id?: string | null } | null
  music_rights_musical_works?: Array<{ id: string; title: string; iswc?: string | null }>
  music_rights_sound_recordings?: Array<{ id: string; title: string; isrc?: string | null; musical_work_id?: string | null }>
}

interface RightsParty {
  id: string
  display_name: string
  party_type: string
  status: string
}

interface RightsClaim {
  id: string
  claim_type: string
  rights_category: string
  status: string
  share_numerator: string
  share_denominator: string
  share_unknown: boolean
}

interface RightsContribution {
  id: string
  role: string
  confirmation_status: string
  music_rights_parties?: { display_name?: string } | null
}

interface RightsInvitation {
  id: string
  invitee_email: string
  invitee_display_name?: string | null
  status: string
  proposed_roles?: string[]
}

interface RightsAgreement {
  id: string
  title: string
  status: string
  current_version: number
}

interface RightsPassport {
  id: string
  public_id: string
  status: string
  current_version: number
}

export default function MusicRightsWorkspacePage() {
  const { trackId } = useParams<{ trackId: string }>()
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [project, setProject] = useState<RightsProject | null>(null)
  const [parties, setParties] = useState<RightsParty[]>([])
  const [claims, setClaims] = useState<RightsClaim[]>([])
  const [contributions, setContributions] = useState<RightsContribution[]>([])
  const [invitations, setInvitations] = useState<RightsInvitation[]>([])
  const [agreements, setAgreements] = useState<RightsAgreement[]>([])
  const [passport, setPassport] = useState<RightsPassport | null>(null)
  const [partyName, setPartyName] = useState("")
  const [creditRole, setCreditRole] = useState("songwriter")
  const [shareText, setShareText] = useState("50")
  const [inviteEmail, setInviteEmail] = useState("")
  const [evidenceName, setEvidenceName] = useState("session-notes.pdf")
  const [verifyPath, setVerifyPath] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const projectResponse = await fetch(`/api/artist/music/rights/projects?trackId=${encodeURIComponent(trackId)}`, {
        credentials: "include",
        cache: "no-store",
      })
      const projectBody = await projectResponse.json()
      if (!projectResponse.ok) throw new Error(projectBody?.error?.message || "Unable to load rights project")
      setEnabled(projectBody.enabled === true)
      const current = projectBody.data?.[0] || null
      if (!current) {
        setProject(null)
        setParties([])
        setClaims([])
        setContributions([])
        setInvitations([])
        setAgreements([])
        setPassport(null)
        setVerifyPath(null)
        return
      }
      const work = current.music_rights_musical_works?.[0] || current.work || null
      const recording = current.music_rights_sound_recordings?.[0] || current.recording || null
      setProject({ ...current, work, recording })

      const [
        partiesResponse,
        claimsResponse,
        contributionsResponse,
        invitationsResponse,
        agreementsResponse,
        passportsResponse,
      ] = await Promise.all([
        fetch(`/api/artist/music/rights/parties?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/artist/music/rights/claims?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/artist/music/rights/contributions?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/artist/music/rights/invitations?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/artist/music/rights/agreements?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/artist/music/rights/passports?projectId=${current.id}`, { credentials: "include", cache: "no-store" }),
      ])
      const [
        partiesBody,
        claimsBody,
        contributionsBody,
        invitationsBody,
        agreementsBody,
        passportsBody,
      ] = await Promise.all([
        partiesResponse.json(),
        claimsResponse.json(),
        contributionsResponse.json(),
        invitationsResponse.json(),
        agreementsResponse.json(),
        passportsResponse.json(),
      ])
      if (partiesResponse.ok) setParties(partiesBody.data || [])
      if (claimsResponse.ok) setClaims(claimsBody.data || [])
      if (contributionsResponse.ok) setContributions(contributionsBody.data || [])
      if (invitationsResponse.ok) setInvitations(invitationsBody.data || [])
      if (agreementsResponse.ok) setAgreements(agreementsBody.data || [])
      if (passportsResponse.ok) {
        const currentPassport = passportsBody.data?.[0] || null
        setPassport(currentPassport)
        setVerifyPath(currentPassport ? `/music/verify/passport/${currentPassport.public_id}` : null)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load rights workspace")
    } finally {
      setLoading(false)
    }
  }, [trackId])

  useEffect(() => {
    void load()
  }, [load])

  async function createProject() {
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: trackId, idempotency_key: crypto.randomUUID() }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to create rights project")
      toast.success("Rights workspace created")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create rights project")
    } finally {
      setBusy(false)
    }
  }

  async function addParty() {
    if (!project || !partyName.trim()) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/parties", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          party_type: "person",
          display_name: partyName.trim(),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to add party")
      setPartyName("")
      toast.success("Party added")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add party")
    } finally {
      setBusy(false)
    }
  }

  async function addContribution() {
    if (!project || !parties[0] || !project.work) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/contributions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          party_id: parties[0].id,
          subject_type: "musical_work",
          subject_id: project.work.id,
          role: creditRole,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to add credit")
      toast.success("Credit proposed")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add credit")
    } finally {
      setBusy(false)
    }
  }

  async function addClaim() {
    if (!project || !parties[0] || !project.work) return
    setBusy(true)
    try {
      const numerator = shareText.trim() || "0"
      const response = await fetch("/api/artist/music/rights/claims", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          subject_type: "musical_work",
          subject_id: project.work.id,
          claimant_party_id: parties[0].id,
          claim_type: "ownership",
          rights_category: "composition",
          share: {
            numerator,
            denominator: "100",
            unknown: false,
            originalText: `${numerator}%`,
            originalScale: "100",
          },
          territory_codes: ["WORLDWIDE"],
          perpetual: true,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to add claim")
      toast.success(body.data?.status === "disputed" ? "Claim saved as disputed" : "Claim proposed")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add claim")
    } finally {
      setBusy(false)
    }
  }

  async function inviteContributor() {
    if (!project || !inviteEmail.trim()) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          email: inviteEmail.trim(),
          proposed_roles: [creditRole],
          claim_ids: claims.slice(0, 5).map((claim) => claim.id),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to invite contributor")
      setInviteEmail("")
      toast.success("Contributor invited")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to invite contributor")
    } finally {
      setBusy(false)
    }
  }

  async function createAgreement() {
    if (!project || parties.length === 0) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/agreements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          template_key: "electronic_split_sheet",
          claim_ids: claims.map((claim) => claim.id),
          parties: parties.slice(0, 5).map((party, index) => ({
            party_id: party.id,
            signer_role: "claimant",
            signing_order: index + 1,
          })),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to create agreement")
      toast.success("Agreement version frozen")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create agreement")
    } finally {
      setBusy(false)
    }
  }

  async function registerEvidence() {
    if (!project) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/evidence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          evidence_category: "session_record",
          original_filename: evidenceName.trim() || "evidence.pdf",
          mime_type: "application/pdf",
          byte_size: 1024,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to register evidence")
      toast.success("Evidence upload prepared")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to register evidence")
    } finally {
      setBusy(false)
    }
  }

  async function issuePassport() {
    if (!project) return
    setBusy(true)
    try {
      const response = await fetch("/api/artist/music/rights/passports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          expected_project_version: project.version,
          public_credit_ids: contributions.map((contribution) => contribution.id),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error?.message || "Unable to issue passport")
      setVerifyPath(body.data?.verify_path || null)
      toast.success("Passport issued")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to issue passport")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading rights workspace…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/artist/music")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Music
        </Button>
        <Scale className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-semibold">Rights & Credits</h1>
          <p className="text-sm text-muted-foreground">
            Document composition, master rights, credits, and claims without changing playback.
          </p>
        </div>
      </div>

      {!enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Rights workspace unavailable</CardTitle>
            <CardDescription>
              The `music_rights_workspace_enabled` flag is off. Catalog upload and playback are unchanged.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !project ? (
        <Card>
          <CardHeader>
            <CardTitle>Start a rights project</CardTitle>
            <CardDescription>
              Links a sound recording to this track and creates an underlying musical work draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void createProject()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create rights project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Project {project.status}</Badge>
            <Badge variant="outline">v{project.version}</Badge>
            <Badge variant="secondary">Track-linked recording</Badge>
          </div>

          <Tabs defaultValue="composition">
            <TabsList className="flex h-auto flex-wrap">
              <TabsTrigger value="composition">Composition</TabsTrigger>
              <TabsTrigger value="master">Master Rights</TabsTrigger>
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="claims">Claims & Splits</TabsTrigger>
              <TabsTrigger value="invites">Invites</TabsTrigger>
              <TabsTrigger value="agreements">Agreements</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="passport">Passport</TabsTrigger>
            </TabsList>

            <TabsContent value="composition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{project.work?.title || project.title}</CardTitle>
                  <CardDescription>Underlying musical work. ISWC identifies the work, not ownership.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Work ID: {project.work?.id || "—"} · ISWC: {project.work?.iswc || "not set"}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="master" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{project.recording?.title || project.title}</CardTitle>
                  <CardDescription>
                    Sound recording linked to `artist_music`. Playback continues through the existing stream path.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Recording ID: {project.recording?.id || "—"} · ISRC: {project.recording?.isrc || "not set"}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Parties & credits</CardTitle>
                  <CardDescription>Credits describe roles. They do not create ownership.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor="party-name">Party display name</Label>
                      <Input id="party-name" value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder="Writer / producer name" />
                    </div>
                    <Button className="self-end" onClick={() => void addParty()} disabled={busy || !partyName.trim()}>
                      Add party
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor="credit-role">Credit role</Label>
                      <Input id="credit-role" value={creditRole} onChange={(event) => setCreditRole(event.target.value)} />
                    </div>
                    <Button className="self-end" variant="secondary" onClick={() => void addContribution()} disabled={busy || parties.length === 0}>
                      Propose credit
                    </Button>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {contributions.map((contribution) => (
                      <li key={contribution.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>
                          {contribution.music_rights_parties?.display_name || "Party"} · {contribution.role}
                        </span>
                        <Badge variant="outline">{contribution.confirmation_status}</Badge>
                      </li>
                    ))}
                    {contributions.length === 0 ? <li className="text-muted-foreground">No credits yet.</li> : null}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="claims" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Claims & splits</CardTitle>
                  <CardDescription>
                    Exact shares with territories. Conflicts are returned structured; unknown is not treated as zero.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor="share">Composition ownership share (%)</Label>
                      <Input id="share" value={shareText} onChange={(event) => setShareText(event.target.value)} />
                    </div>
                    <Button className="self-end" onClick={() => void addClaim()} disabled={busy || parties.length === 0}>
                      Propose claim
                    </Button>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {claims.map((claim) => (
                      <li key={claim.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>
                          {claim.claim_type} · {claim.rights_category} ·{" "}
                          {claim.share_unknown ? "unknown" : `${claim.share_numerator}/${claim.share_denominator}`}
                        </span>
                        <Badge variant="outline">{claim.status}</Badge>
                      </li>
                    ))}
                    {claims.length === 0 ? <li className="text-muted-foreground">No claims yet.</li> : null}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invites" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contributor invitations</CardTitle>
                  <CardDescription>
                    Invite collaborators to accept credits/claims. Requires `music_contributor_workflows_enabled`.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor="invite-email">Invitee email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="contributor@example.com"
                      />
                    </div>
                    <Button className="self-end" onClick={() => void inviteContributor()} disabled={busy || !inviteEmail.trim()}>
                      Send invite
                    </Button>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {invitations.map((invitation) => (
                      <li key={invitation.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>
                          {invitation.invitee_display_name || invitation.invitee_email}
                          {invitation.proposed_roles?.length ? ` · ${invitation.proposed_roles.join(", ")}` : ""}
                        </span>
                        <Badge variant="outline">{invitation.status}</Badge>
                      </li>
                    ))}
                    {invitations.length === 0 ? <li className="text-muted-foreground">No invitations yet.</li> : null}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agreements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agreements</CardTitle>
                  <CardDescription>
                    Freeze a deterministic split-sheet version with claim snapshots. Flag-gated.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => void createAgreement()} disabled={busy || parties.length === 0}>
                    Generate split sheet
                  </Button>
                  <ul className="space-y-2 text-sm">
                    {agreements.map((agreement) => (
                      <li key={agreement.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>{agreement.title}</span>
                        <Badge variant="outline">{agreement.status} · v{agreement.current_version}</Badge>
                      </li>
                    ))}
                    {agreements.length === 0 ? <li className="text-muted-foreground">No agreements yet.</li> : null}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evidence</CardTitle>
                  <CardDescription>
                    Private Human-Origin evidence uploads to `music-rights-evidence`. Never public.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor="evidence-name">Filename</Label>
                      <Input id="evidence-name" value={evidenceName} onChange={(event) => setEvidenceName(event.target.value)} />
                    </div>
                    <Button className="self-end" onClick={() => void registerEvidence()} disabled={busy}>
                      Prepare upload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="passport" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rights Passport</CardTitle>
                  <CardDescription>
                    Issue a versioned public manifest + VC-compatible credential. Does not change playback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => void issuePassport()} disabled={busy}>
                    Issue passport version
                  </Button>
                  {passport ? (
                    <div className="space-y-2 text-sm">
                      <p>
                        Status: <Badge variant="outline">{passport.status}</Badge> · v{passport.current_version}
                      </p>
                      <p className="font-mono text-xs break-all">Public ID: {passport.public_id}</p>
                      {verifyPath ? (
                        <Button variant="secondary" size="sm" onClick={() => router.push(verifyPath)}>
                          Open public verify page
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No passport issued yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
