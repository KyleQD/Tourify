"use client"

import { SegmentError } from "@/components/errors/segment-error"

export default function ArtistError({
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
      title="Artist dashboard could not load"
      recoveryHref="/artist"
      recoveryLabel="Artist home"
    />
  )
}
