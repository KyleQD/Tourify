import { LogisticsPlanWorkspace } from "@/components/admin/logistics/workspace/logistics-plan-workspace"

export default async function LogisticsPlanPage({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = await params
  return <LogisticsPlanWorkspace tourId={tourId} />
}
