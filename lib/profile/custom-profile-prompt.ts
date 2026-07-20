import {
  getSchemaContractMarkdown,
  MINIMAL_CUSTOM_PROFILE_LAYOUT,
} from '@/lib/profile/custom-profile-layout'

export interface CustomProfilePromptSnapshot {
  publicProfileUrl: string
  username: string
  fullName: string | null
  bio: string | null
  title: string | null
  company: string | null
  location: string | null
  avatarUrl: string | null
  coverUrl: string | null
  website: string | null
  skills: string[]
  topSkills: string[]
  socialLinks: Record<string, string | null>
  showEmail: boolean
  showPhone: boolean
  showLocation: boolean
  email: string | null
  phone: string | null
  portfolio: Array<{
    title: string
    type?: string | null
    description?: string | null
    tags?: string[]
    link?: string | null
  }>
  experiences: Array<{
    title: string
    company?: string | null
    location?: string | null
    startDate?: string | null
    endDate?: string | null
    description?: string | null
  }>
  certifications: Array<{
    name: string
    issuer?: string | null
    issueDate?: string | null
    credentialUrl?: string | null
  }>
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function pickSocial(links: Record<string, unknown>, key: string): string | null {
  return asString(links[key])
}

export function buildCustomProfilePromptSnapshot(input: {
  profile: Record<string, any>
  portfolio?: any[]
  experiences?: any[]
  certifications?: any[]
  siteOrigin?: string
}): CustomProfilePromptSnapshot {
  const profile = input.profile || {}
  const profileData =
    profile.profile_data && typeof profile.profile_data === 'object'
      ? profile.profile_data
      : {}
  const social =
    profile.social_links && typeof profile.social_links === 'object'
      ? (profile.social_links as Record<string, unknown>)
      : {}
  const metadata =
    profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {}

  const username = asString(profile.username) || 'username'
  const origin = (input.siteOrigin || 'https://tourify.live').replace(/\/$/, '')

  const showEmail = profile.show_email === true
  const showPhone = profile.show_phone === true
  const showLocation = profile.show_location !== false

  const portfolio = (input.portfolio || [])
    .filter((item) => item?.is_public !== false)
    .slice(0, 12)
    .map((item) => ({
      title: asString(item.title) || 'Untitled',
      type: asString(item.type),
      description: asString(item.description),
      tags: asStringArray(item.tags),
      link: asString(item.link || item.url || item.external_url),
    }))

  const experiences = (input.experiences || [])
    .filter((item) => item?.is_visible !== false)
    .slice(0, 12)
    .map((item) => ({
      title: asString(item.title || item.role) || 'Role',
      company: asString(item.company || item.organization),
      location: asString(item.location),
      startDate: asString(item.start_date),
      endDate: asString(item.end_date),
      description: asString(item.description),
    }))

  const certifications = (input.certifications || [])
    .filter((item) => item?.is_public !== false)
    .slice(0, 12)
    .map((item) => ({
      name: asString(item.name || item.title) || 'Certification',
      issuer: asString(item.issuer || item.organization),
      issueDate: asString(item.issue_date),
      credentialUrl: asString(item.credential_url || item.url),
    }))

  return {
    publicProfileUrl: `${origin}/profile/${encodeURIComponent(username)}`,
    username,
    fullName: asString(profile.full_name) || asString(profileData.name),
    bio: asString(profile.bio) || asString(profileData.bio),
    title: asString(profile.title) || asString(profileData.title),
    company: asString(profile.company) || asString(profileData.company),
    location: showLocation
      ? asString(profile.location) || asString(profileData.location)
      : null,
    avatarUrl: asString(profile.avatar_url),
    coverUrl:
      asString(profile.cover_image) ||
      asString(metadata.header_url) ||
      asString(profileData.cover_image),
    website:
      asString(profile.website) ||
      pickSocial(social, 'website') ||
      asString(profileData.website),
    skills: asStringArray(profile.skills).length
      ? asStringArray(profile.skills)
      : asStringArray(profileData.skills),
    topSkills: asStringArray(profile.top_skills),
    socialLinks: {
      website:
        asString(profile.website) || pickSocial(social, 'website'),
      instagram:
        asString(profile.instagram) || pickSocial(social, 'instagram'),
      twitter: asString(profile.twitter) || pickSocial(social, 'twitter'),
      linkedin: pickSocial(social, 'linkedin') || asString(profileData.linkedin),
      github: pickSocial(social, 'github') || asString(profileData.github),
      behance: pickSocial(social, 'behance') || asString(profileData.behance),
      dribbble: pickSocial(social, 'dribbble') || asString(profileData.dribbble),
    },
    showEmail,
    showPhone,
    showLocation,
    email: showEmail ? asString(profile.email) : null,
    phone: showPhone ? asString(profile.phone) : null,
    portfolio,
    experiences,
    certifications,
  }
}

function getFinishedProductGuidance(): string {
  return [
    '## Finished-product standard (critical)',
    'Design a layout that feels COMPLETE when previewed — not a sparse two-card stub.',
    'The renderer paints a full themed page from your JSON. Use every relevant theme knob.',
    '',
    'A finished layout MUST:',
    '1. Set ALL theme fields intentionally (mood, backgroundStyle, frame, headingStyle, secondaryAccentHex, surface, radius, density, fontStyle, all four colors)',
    '2. Include a visible `hero` with a strong variant (`banner`, `centered`, or `framed` for expressive themes)',
    '3. Include a visible `about` when bio exists',
    '4. Include a visible `cta` near the end so the page has a clear action',
    '5. Use 1–3 `text` sections for personality / framing when the vibe is expressive (status lines, welcome blurb, "currently…")',
    '6. Vary per-section `style.accentHex` and `style.variant` so the page is not one flat card repeated',
    '7. Hide empty data sections (`visible: false`) OR omit them — never leave a visible empty skills/portfolio/social block unless the vibe needs a playful placeholder heading with false',
    '',
    'Sparse profiles (few skills/links) still need a finished PAGE: lean on mood + background + frame + text + hero + about + cta.',
    '',
    '## What the renderer CAN paint',
    '- Page backdrop patterns: solid, gradient, dots, grid, stars, scanlines, sparkle',
    '- Mood chrome: clean, editorial, neon, brutalist, retro, maximalist (borders, glow, stickers, ornaments)',
    '- Page frames: none, thin, double, sticker, neon',
    '- Heading treatments: plain, underline, badge, marquee, outlined',
    '- Hero variants: banner / centered / framed / split (synthetic gradient banner if no cover image)',
    '- Skills as pills, alternating-color cloud, or list',
    '- Social/CTA chips that respect theme radius (not always pills)',
    '- Dual accents via secondaryAccentHex for gradients and ornaments',
    '',
    '## What the renderer CANNOT paint (do not invent)',
    '- Raw HTML, CSS, JavaScript, iframes, music players, cursors, or blink GIFs',
    '- Custom font files or Comic Sans uploads (use fontStyle enums only)',
    '- Freeform multi-column widget grids or absolute positioning',
    '- Background image URLs beyond the profile cover already in data',
    '',
    '## Mood recipes (pick one and commit fully)',
    '',
    '### maximalist / early-2000s MySpace energy',
    '- mood: maximalist',
    '- backgroundStyle: sparkle or stars',
    '- frame: sticker or neon',
    '- headingStyle: marquee or badge',
    '- fontStyle: bold',
    '- radius: sharp or rounded (avoid pill — pill makes every block a stadium and looks modern)',
    '- surface: elevated or solid',
    '- density: relaxed',
    '- accentHex + secondaryAccentHex: clashing neons (hot pink + lime, cyan + yellow)',
    '- hero style.variant: banner or framed, align center',
    '- text sections: playful status / "currently" / welcome blurb (plain text slang OK)',
    '- about style.variant: sticker or quote',
    '- cta heading like "add me" / "leave a comment" energy',
    '',
    '### neon club',
    '- mood: neon; backgroundStyle: scanlines or gradient; frame: neon; headingStyle: outlined; fontStyle: mono; radius: sharp',
    '',
    '### editorial magazine',
    '- mood: editorial; backgroundStyle: solid; frame: thin; headingStyle: underline; fontStyle: elegant; radius: sharp; surface: minimal',
    '',
    '### brutalist poster',
    '- mood: brutalist; backgroundStyle: grid; frame: double; headingStyle: outlined; fontStyle: bold; radius: sharp; surface: solid',
    '',
    '### retro sticker book',
    '- mood: retro; backgroundStyle: dots or sparkle; frame: sticker; headingStyle: badge; fontStyle: bold; secondaryAccentHex required',
    '',
    '### clean modern',
    '- mood: clean; backgroundStyle: solid or gradient; frame: none; headingStyle: plain; surface: glass; radius: rounded',
  ].join('\n')
}

export function buildCustomProfileAiPrompt(snapshot: CustomProfilePromptSnapshot): string {
  const hasSkills = snapshot.skills.length > 0 || snapshot.topSkills.length > 0
  const hasPortfolio = snapshot.portfolio.length > 0
  const hasExperience = snapshot.experiences.length > 0
  const hasCerts = snapshot.certifications.length > 0
  const hasSocial = Object.values(snapshot.socialLinks).some(Boolean)
  const hasContact =
    (snapshot.showEmail && !!snapshot.email) ||
    (snapshot.showPhone && !!snapshot.phone) ||
    (snapshot.showLocation && !!snapshot.location)

  return [
    '# Tourify custom public profile layout',
    '',
    'You are designing a **finished custom public profile** for a Tourify general/personal account.',
    'Return **ONLY** a single valid JSON object that matches the schema below.',
    'Do not wrap the JSON in markdown fences. Do not include commentary before or after the JSON.',
    '',
    '## Goal',
    'Produce a cohesive, publication-ready layout — a complete themed page, not a minimal sketch.',
    'Bind sections to the provided data. Use text sections for voice/framing when it strengthens the theme.',
    '',
    '## Schema contract',
    getSchemaContractMarkdown(),
    '',
    getFinishedProductGuidance(),
    '',
    '## Data availability hints for this profile',
    `- skills data: ${hasSkills ? 'YES — include a visible skills section' : 'NO — omit or set visible false'}`,
    `- portfolio data: ${hasPortfolio ? 'YES — include portfolio' : 'NO — omit or set visible false'}`,
    `- experience data: ${hasExperience ? 'YES — include experience' : 'NO — omit or set visible false'}`,
    `- certifications data: ${hasCerts ? 'YES — include certifications' : 'NO — omit or set visible false'}`,
    `- social links: ${hasSocial ? 'YES — include social' : 'NO — omit or set visible false'}`,
    `- public contact fields: ${hasContact ? 'YES — include contact for public fields only' : 'NO — omit contact'}`,
    '- Always include: hero, about (if bio exists), cta',
    '- For expressive themes with sparse data: add 1–3 text sections so the page still feels full',
    '',
    '## Minimal valid example (baseline structure only — your output should be richer)',
    '```json',
    JSON.stringify(MINIMAL_CUSTOM_PROFILE_LAYOUT, null, 2),
    '```',
    '',
    '## Live profile data (source of truth)',
    'Use only this data. Do not invent private email/phone if those fields are null.',
    '```json',
    JSON.stringify(snapshot, null, 2),
    '```',
    '',
    '## Design guidance',
    '- Choose a single mood recipe and push it all the way (colors + background + frame + headings + variants)',
    '- Keep contrast readable: light text on dark backgrounds or dark text on light backgrounds',
    '- Order for impact: hero → (text vibe) → about → content sections → cta',
    '- Headings can be playful when mood is maximalist/retro/neon; keep them short',
    '- Prefer sharp/rounded radius for expressive themes; pill radius flattens the page into modern capsules',
    '',
    '## Output',
    'Return only the JSON object.',
  ].join('\n')
}

export function buildCustomProfileAiPromptFromProfile(input: {
  profile: Record<string, any>
  portfolio?: any[]
  experiences?: any[]
  certifications?: any[]
  siteOrigin?: string
}): string {
  const snapshot = buildCustomProfilePromptSnapshot(input)
  return buildCustomProfileAiPrompt(snapshot)
}
