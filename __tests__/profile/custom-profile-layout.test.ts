import { describe, expect, it } from 'vitest'
import {
  buildFixPrompt,
  MAX_CUSTOM_PROFILE_SECTIONS,
  MINIMAL_CUSTOM_PROFILE_LAYOUT,
  parseCustomProfileLayout,
} from '@/lib/profile/custom-profile-layout'
import {
  buildCustomProfileAiPrompt,
  buildCustomProfilePromptSnapshot,
} from '@/lib/profile/custom-profile-prompt'

describe('custom profile layout', () => {
  it('parses a valid minimal layout', () => {
    const result = parseCustomProfileLayout(MINIMAL_CUSTOM_PROFILE_LAYOUT)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.layout.version).toBe(1)
      expect(result.layout.sections.length).toBeGreaterThan(0)
    }
  })

  it('parses JSON strings', () => {
    const result = parseCustomProfileLayout(JSON.stringify(MINIMAL_CUSTOM_PROFILE_LAYOUT))
    expect(result.ok).toBe(true)
  })

  it('rejects HTML in text fields', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      sections: [
        { id: 'hero', type: 'hero', visible: true },
        {
          id: 'blurb',
          type: 'text',
          visible: true,
          body: '<script>alert(1)</script>',
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => /HTML|script/i.test(error.message))).toBe(true)
    }
  })

  it('rejects bad hex colors', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      theme: {
        ...MINIMAL_CUSTOM_PROFILE_LAYOUT.theme,
        accentHex: 'purple',
      },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.path.includes('accentHex'))).toBe(true)
    }
  })

  it('rejects unknown section types', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      sections: [{ id: 'x', type: 'gallery', visible: true }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects too many sections', () => {
    const sections = Array.from({ length: MAX_CUSTOM_PROFILE_SECTIONS + 1 }, (_, index) => ({
      id: `section-${index}`,
      type: index === 0 ? 'hero' : 'about',
      visible: true,
    }))
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      sections,
    })
    expect(result.ok).toBe(false)
  })

  it('requires a visible hero or about section', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      sections: [{ id: 'skills', type: 'skills', visible: true }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => /hero or about/i.test(error.message))).toBe(true)
    }
  })

  it('parses finished-product theme knobs and section variants', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      theme: {
        ...MINIMAL_CUSTOM_PROFILE_LAYOUT.theme,
        secondaryAccentHex: '#39FF14',
        mood: 'maximalist',
        backgroundStyle: 'sparkle',
        frame: 'sticker',
        headingStyle: 'marquee',
      },
      sections: [
        {
          id: 'hero',
          type: 'hero',
          visible: true,
          heading: 'welcome',
          style: { variant: 'banner', align: 'center', accentHex: '#FF00AA' },
        },
        {
          id: 'about',
          type: 'about',
          visible: true,
          style: { variant: 'sticker', surface: 'elevated' },
        },
        {
          id: 'blurb',
          type: 'text',
          visible: true,
          body: 'currently blasting neon feelings',
          style: { variant: 'quote' },
        },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.layout.theme.mood).toBe('maximalist')
      expect(result.layout.theme.backgroundStyle).toBe('sparkle')
      expect(result.layout.theme.frame).toBe('sticker')
      expect(result.layout.sections[0].style?.variant).toBe('banner')
    }
  })

  it('rejects more than three visible text sections', () => {
    const result = parseCustomProfileLayout({
      ...MINIMAL_CUSTOM_PROFILE_LAYOUT,
      sections: [
        { id: 'hero', type: 'hero', visible: true },
        { id: 't1', type: 'text', visible: true, body: 'one' },
        { id: 't2', type: 'text', visible: true, body: 'two' },
        { id: 't3', type: 'text', visible: true, body: 'three' },
        { id: 't4', type: 'text', visible: true, body: 'four' },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => /text sections/i.test(error.message))).toBe(true)
    }
  })

  it('builds a fix prompt that includes validation errors', () => {
    const errors = [{ path: 'theme.accentHex', message: 'Must be a 6-digit hex color like #8b5cf6' }]
    const prompt = buildFixPrompt(errors, '{"version":1}')
    expect(prompt).toContain('theme.accentHex')
    expect(prompt).toContain('Must be a 6-digit hex color')
    expect(prompt).toContain('{"version":1}')
    expect(prompt).toContain('return ONLY a corrected valid JSON object')
    expect(prompt).toContain('theme.mood')
  })
})

describe('custom profile prompt builder', () => {
  it('includes username and schema markers', () => {
    const snapshot = buildCustomProfilePromptSnapshot({
      profile: {
        username: 'kyle-demo',
        full_name: 'Kyle Demo',
        bio: 'Builder',
        skills: ['TypeScript'],
        show_email: false,
        show_phone: false,
      },
      portfolio: [{ title: 'Project A', is_public: true }],
      siteOrigin: 'https://tourify.live',
    })

    const prompt = buildCustomProfileAiPrompt(snapshot)
    expect(prompt).toContain('kyle-demo')
    expect(prompt).toContain('CustomProfileLayout v1')
    expect(prompt).toContain('Return **ONLY** a single valid JSON object')
    expect(prompt).toContain('https://tourify.live/profile/kyle-demo')
    expect(prompt).toContain('Project A')
    expect(prompt).toContain('Finished-product standard')
    expect(prompt).toContain('maximalist / early-2000s MySpace energy')
    expect(prompt).toContain('backgroundStyle')
    expect(prompt).toContain('skills data: YES')
  })

  it('omits private contact when not public', () => {
    const snapshot = buildCustomProfilePromptSnapshot({
      profile: {
        username: 'private-user',
        email: 'secret@example.com',
        phone: '555-0100',
        show_email: false,
        show_phone: false,
      },
    })
    expect(snapshot.email).toBeNull()
    expect(snapshot.phone).toBeNull()
  })
})
