import { redirect } from 'next/navigation'
import { getPublicOrganizationProfileDTO } from '@/lib/public-organization/get-public-organization-profile'
import { PublicOrganizationPage } from '@/components/public-organization/public-organization-page'

export default async function OrganizationPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const dto = await getPublicOrganizationProfileDTO({ slug })

  if (!dto) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="text-slate-300 text-sm">Organization profile not found.</div>
        </div>
      </div>
    )
  }

  if (dto.slug && dto.slug !== slug)
    redirect(`/organization/${encodeURIComponent(dto.slug)}`)

  return <PublicOrganizationPage dto={dto} />
}
