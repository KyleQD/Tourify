import { Suspense } from "react"
import { GroupThreadClient } from "./group-thread-client"
import { MessagesSkeleton } from "@/app/messages/messages-skeleton"

interface GroupThreadPageProps {
  params: Promise<{ id: string }>
}

export default async function GroupThreadPage({ params }: GroupThreadPageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <GroupThreadClient threadId={id} />
    </Suspense>
  )
}
