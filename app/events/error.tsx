"use client"

import { SegmentError } from "@/components/errors/segment-error"

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      title="Events could not load"
      recoveryHref="/events"
      recoveryLabel="Events"
    />
  )
}
