import { WorkerSiteMapViewer } from '@/components/site-maps/worker-site-map-viewer'

export default async function WorkSiteMapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WorkerSiteMapViewer siteMapId={id} />
}
