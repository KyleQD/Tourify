export interface ReleaseDependency {
  releaseId: string
  participantIds: string[]
  minimumParticipants: number
}

export function releasesAffectedByOptOut(input: {
  participantId: string
  releases: ReleaseDependency[]
}): string[] {
  return input.releases.filter((release) => {
    if (!release.participantIds.includes(input.participantId)) return false
    return release.participantIds.length - 1 < release.minimumParticipants
  }).map((release) => release.releaseId)
}
