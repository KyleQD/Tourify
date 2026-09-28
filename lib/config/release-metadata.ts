export const RELEASE_SHA_HEADER = 'x-tourify-release-sha'
export const DEPLOYMENT_ID_HEADER = 'x-tourify-deployment-id'
export const SUPABASE_ORIGIN_HEADER = 'x-tourify-supabase-origin'
export const STRIPE_MODE_HEADER = 'x-tourify-stripe-mode'

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

/** The Vercel-generated deployment ID binds a campaign to one deployed artifact. */
export function getAuthoritativeDeploymentId(
  environment: ReleaseMetadataEnvironment = process.env,
): string | null {
  const candidate = environment.VERCEL_DEPLOYMENT_ID?.trim() ?? ''
  return /^dpl_[A-Za-z0-9]+$/.test(candidate) ? candidate : null
}

export function getReleaseMetadataHeaders(
  environment: ReleaseMetadataEnvironment = process.env,
): Record<string, string> {
  const releaseSha = getAuthoritativeReleaseSha(environment)
  const deploymentId = getAuthoritativeDeploymentId(environment)
  let supabaseOrigin: string | null = null
  try {
    const url = new URL(environment.NEXT_PUBLIC_SUPABASE_URL ?? '')
    if (url.protocol === 'https:' && !url.username && !url.password)
      supabaseOrigin = url.origin
  } catch {
    // An invalid or absent target must remain absent so fixture checks fail closed.
  }
  const stripeKey = environment.STRIPE_SECRET_KEY?.trim() ?? ''
  const stripeMode = stripeKey.startsWith('sk_test_') ? 'test' : stripeKey.startsWith('sk_live_') ? 'live' : null
  return {
    ...(releaseSha ? { [RELEASE_SHA_HEADER]: releaseSha } : {}),
    ...(deploymentId ? { [DEPLOYMENT_ID_HEADER]: deploymentId } : {}),
    ...(supabaseOrigin ? { [SUPABASE_ORIGIN_HEADER]: supabaseOrigin } : {}),
    ...(stripeMode ? { [STRIPE_MODE_HEADER]: stripeMode } : {}),
  }
}
