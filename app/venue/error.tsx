"use client"

import { SegmentError } from "@/components/errors/segment-error"

export default function VenueError({
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
      title="Venue dashboard could not load"
      recoveryHref="/venue/dashboard"
      recoveryLabel="Venue dashboard"
    />
  )
}
