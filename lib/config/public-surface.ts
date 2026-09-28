import type { Metadata } from 'next'

export const PRODUCTION_CANONICAL_ORIGIN = 'https://tourify.live'
export const STAGING_CANONICAL_ORIGIN = 'https://demo.tourify.live'

type PublicSurfaceEnvironment = Readonly<Record<string, string | undefined>>

export function isProductionIndexingAllowed(
  environment: PublicSurfaceEnvironment = process.env,
): boolean {
  const deploymentEnvironment = environment.DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase()
  const vercelEnvironment = environment.VERCEL_ENV?.trim().toLowerCase()
  if (deploymentEnvironment && deploymentEnvironment !== 'production') return false
  if (vercelEnvironment && vercelEnvironment !== 'production') return false

  const explicitProduction = deploymentEnvironment === 'production' || vercelEnvironment === 'production'
  if (!explicitProduction) return false

  try {
    return new URL(environment.NEXT_PUBLIC_SITE_URL || '').origin === PRODUCTION_CANONICAL_ORIGIN
  } catch {
    return false
  }
}

export function getPublicRobotsMetadata(
  environment: PublicSurfaceEnvironment = process.env,
): NonNullable<Metadata['robots']> {
  const index = isProductionIndexingAllowed(environment)
  return {
    index,
    follow: index,
    googleBot: {
      index,
      follow: index,
    },
  }
}

export function getPublicSitemapOrigin(
  environment: PublicSurfaceEnvironment = process.env,
): string | null {
  if (!isProductionIndexingAllowed(environment)) return null
  return new URL(environment.NEXT_PUBLIC_SITE_URL as string).origin
}
