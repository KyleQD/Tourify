import type { SocialPlatform } from "@/types/organization-social-integrations.type"

const PLATFORM_ENV: Record<SocialPlatform, string> = {
  instagram: "FACEBOOK_APP_ID",
  facebook: "FACEBOOK_APP_ID",
  youtube: "GOOGLE_CLIENT_ID",
  tiktok: "TIKTOK_CLIENT_KEY",
  twitter: "TWITTER_CLIENT_ID",
}

export function isSocialProviderConfigured(platform: SocialPlatform): boolean {
  const envName = PLATFORM_ENV[platform]
  return Boolean(process.env[envName])
}

export function getSocialProviderConfigStatus(): Record<
  SocialPlatform,
  { configured: boolean; envVar: string; analyticsReady: boolean }
> {
  const platforms: SocialPlatform[] = ["instagram", "facebook", "youtube", "tiktok", "twitter"]
  const result = {} as Record<
    SocialPlatform,
    { configured: boolean; envVar: string; analyticsReady: boolean }
  >
  for (const platform of platforms) {
    result[platform] = {
      configured: isSocialProviderConfigured(platform),
      envVar: PLATFORM_ENV[platform],
      analyticsReady: platform === "instagram" || platform === "facebook",
    }
  }
  return result
}
