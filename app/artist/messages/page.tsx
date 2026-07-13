'use client'

import { Suspense } from 'react'
import { MessagesPageClient } from '@/app/messages/messages-page-client'
import { MessagesSkeleton } from '@/app/messages/messages-skeleton'

export default function ArtistMessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesPageClient />
    </Suspense>
  )
}
