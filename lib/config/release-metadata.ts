export const RELEASE_SHA_HEADER = 'x-tourify-release-sha'

type ReleaseMetadataEnvironment = Readonly<Record<string, string | undefined>>

/**
 * Vercel injects the immutable commit SHA for a deployment. Do not fall back to
 * branch names, package versions, shortened SHAs, or user-defined values: an
 * absent identity must remain absent so release certification fails closed.
 */
export function getAuthoritativeReleaseSha(
  environment: ReleaseMetadataEnvironment = process.env,
): string | null {
  const candidate = environment.VERCEL_GIT_COMMIT_SHA?.trim() ?? ''
  return /^[0-9a-f]{40}$/i.test(candidate) ? candidate.toLowerCase() : null
}

export function getReleaseMetadataHeaders(
  environment: ReleaseMetadataEnvironment = process.env,
): Record<string, string> {
  const releaseSha = getAuthoritativeReleaseSha(environment)
  return releaseSha ? { [RELEASE_SHA_HEADER]: releaseSha } : {}
}

