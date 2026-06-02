import { Suspense } from 'react'
import { MessagesPageClient } from './messages-page-client'
import { MessagesSkeleton } from './messages-skeleton'

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesPageClient />
    </Suspense>
  )
}
