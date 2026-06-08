"use client"

import { SegmentError } from "@/components/errors/segment-error"

export default function FeedError({
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
      title="Feed could not load"
      recoveryHref="/dashboard"
      recoveryLabel="Dashboard"
    />
  )
}
