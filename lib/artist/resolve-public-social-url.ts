/**
 * Resolve stored social values (handles or URLs) into clickable public URLs.
 */

const PLATFORM_BASE: Record<string, string> = {
  website: '',
  instagram: 'https://instagram.com/',
  twitter: 'https://x.com/',
  x: 'https://x.com/',
  youtube: 'https://youtube.com/',
  tiktok: 'https://tiktok.com/@',
  facebook: 'https://facebook.com/',
  spotify: 'https://open.spotify.com/',
  apple_music: 'https://music.apple.com/',
  apple: 'https://music.apple.com/',
  soundcloud: 'https://soundcloud.com/',
  bandcamp: 'https://bandcamp.com/',
  twitch: 'https://twitch.tv/',
  linkedin: 'https://linkedin.com/in/',
}

export function normalizeSocialPlatformKey(platform: string): string {
  const key = platform.trim().toLowerCase().replace(/\s+/g, '_')
  if (key === 'apple') return 'apple_music'
  if (key === 'x') return 'twitter'
  return key
}

export function resolvePublicSocialUrl(platform: string, value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`

  const key = normalizeSocialPlatformKey(platform)
  const handle = raw.replace(/^@/, '').replace(/^\//, '')

  if (key === 'website') {
    return `https://${handle}`
  }

  const base = PLATFORM_BASE[key]
  if (!base) {
    if (handle.includes('.')) return `https://${handle}`
    return null
  }

  if (key === 'youtube' && !handle.includes('/') && !handle.startsWith('@')) {
    return `${base}@${handle}`
  }

  return `${base}${handle}`
}

export function listPublicSocialLinks(
  socialLinks: Record<string, string> | null | undefined
): Array<{ platform: string; label: string; url: string; value: string }> {
  if (!socialLinks || typeof socialLinks !== 'object') return []

  const labels: Record<string, string> = {
    website: 'Website',
    instagram: 'Instagram',
    twitter: 'X',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    spotify: 'Spotify',
    apple_music: 'Apple Music',
    apple: 'Apple Music',
    soundcloud: 'SoundCloud',
    bandcamp: 'Bandcamp',
    twitch: 'Twitch',
    linkedin: 'LinkedIn',
  }

  const seen = new Set<string>()
  const results: Array<{ platform: string; label: string; url: string; value: string }> = []

  for (const [rawPlatform, rawValue] of Object.entries(socialLinks)) {
    const platform = normalizeSocialPlatformKey(rawPlatform)
    if (seen.has(platform)) continue
    const url = resolvePublicSocialUrl(platform, rawValue)
    if (!url) continue
    seen.add(platform)
    results.push({
      platform,
      label: labels[platform] || platform,
      url,
      value: String(rawValue),
    })
  }

  return results
}
