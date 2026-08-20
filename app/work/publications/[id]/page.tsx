import { WorkPublicationDetail } from "@/components/work-mode/work-publication-detail"

export default async function WorkPublicationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WorkPublicationDetail publicationId={id} />
}
