import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MusicCertificationReviewPanel } from "@/components/admin/music-certification-review-panel"
import { MusicRoyaltiesOpsPanel } from "@/components/admin/music-royalties-ops-panel"
import { MusicMarketplaceOpsPanel } from "@/components/admin/music-marketplace-ops-panel"
import { MusicInstitutionalOpsPanel } from "@/components/admin/music-institutional-ops-panel"
import { MusicLicensingOpsPanel } from "@/components/admin/music-licensing-ops-panel"
import { MusicRightsAdminOpsPanel } from "@/components/admin/music-rights-admin-ops-panel"
import { MusicRightsIntelligenceOpsPanel } from "@/components/admin/music-rights-intelligence-ops-panel"
import { MusicCreatorCooperativeOpsPanel } from "@/components/admin/music-creator-cooperative-ops-panel"
import { MusicCreatorFederationOpsPanel } from "@/components/admin/music-creator-federation-ops-panel"
import { MusicCreatorPublicInfrastructureOpsPanel } from "@/components/admin/music-creator-public-infrastructure-ops-panel"
import { MusicCreatorDigitalCommonsOpsPanel } from "@/components/admin/music-creator-digital-commons-ops-panel"
import { MusicCreatorProtocolConstitutionOpsPanel } from "@/components/admin/music-creator-protocol-constitution-ops-panel"
import { MusicCreatorInteropConventionOpsPanel } from "@/components/admin/music-creator-interop-convention-ops-panel"
import { MusicCreatorInteropOrganizationOpsPanel } from "@/components/admin/music-creator-interop-organization-ops-panel"
import { MusicCreatorInteropInstitutionOpsPanel } from "@/components/admin/music-creator-interop-institution-ops-panel"
import { MusicCreatorTreatyOpsPanel } from "@/components/admin/music-creator-treaty-ops-panel"
import { MusicCreatorTreatyRenewalOpsPanel } from "@/components/admin/music-creator-treaty-renewal-ops-panel"
import { MusicCreatorTreatyLegacyOpsPanel } from "@/components/admin/music-creator-treaty-legacy-ops-panel"

interface AdminTrack {
  id: string
  title: string | null
  genre: string | null
  created_at: string
  user_id: string
  is_public: boolean | null
}

export default async function MusicPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("artist_music")
    .select("id, title, genre, created_at, user_id, is_public")
    .order("created_at", { ascending: false })
    .limit(40)

  const tracks = (data || []) as AdminTrack[]
  const publicCount = tracks.filter((track) => track.is_public).length
  const privateCount = tracks.filter((track) => !track.is_public).length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Music Dashboard"
        subtitle="Track uploaded songs and basic visibility health across artist accounts."
        actions={
          <Button asChild variant="outline" className="border-slate-700 text-slate-200">
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        }
      />

      {error ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-6 text-sm text-amber-100">
            Could not load music records. Check admin access to `artist_music`.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Total tracks</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-white">{tracks.length}</CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Public</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-400">{publicCount}</CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-300">Private</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-400">{privateCount}</CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-white">Recent tracks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tracks.length ? tracks.map((track) => (
            <div key={track.id} className="flex flex-col gap-2 rounded-md border border-slate-700 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">{track.title || "Untitled track"}</p>
                <p className="text-xs text-slate-400">
                  {track.genre || "genre: n/a"} - user {track.user_id.slice(0, 8)} - {new Date(track.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant={track.is_public ? "default" : "secondary"}>
                {track.is_public ? "public" : "private"}
              </Badge>
            </div>
          )) : (
            <p className="text-sm text-slate-400">No artist tracks found.</p>
          )}
        </CardContent>
      </Card>
      <MusicCertificationReviewPanel />
      <MusicRoyaltiesOpsPanel />
      <MusicMarketplaceOpsPanel />
      <MusicInstitutionalOpsPanel />
      <MusicLicensingOpsPanel />
      <MusicRightsAdminOpsPanel />
      <MusicRightsIntelligenceOpsPanel />
      <MusicCreatorCooperativeOpsPanel />
      <MusicCreatorFederationOpsPanel />
      <MusicCreatorPublicInfrastructureOpsPanel />
      <MusicCreatorDigitalCommonsOpsPanel />
      <MusicCreatorProtocolConstitutionOpsPanel />
      <MusicCreatorInteropConventionOpsPanel />
      <MusicCreatorInteropOrganizationOpsPanel />
      <MusicCreatorInteropInstitutionOpsPanel />
      <MusicCreatorTreatyOpsPanel />
      <MusicCreatorTreatyRenewalOpsPanel />
      <MusicCreatorTreatyLegacyOpsPanel />
    </div>
  )
}
