import {
  invalidEpkAppearanceHexFields,
  normalizeEpkAppearance,
  resolveEpkAppearanceForRender,
  type EpkAppearance,
} from './epk-appearance'
import { EPK_SKIN_TOKENS, type EpkSkinId } from './epk-skin-tokens'
import { readFileSync } from 'fs'

const appearance: EpkAppearance = {
  fontSizeScale: 'md',
  textColorPreset: 'inherit',
  textColorCustomHex: '#ffffff',
  cardRadius: 'rounded',
  cardSurface: 'default',
  accentHex: '#22c55e',
  secondaryAccentHex: '#06b6d4',
  pageBackgroundHex: '#111827',
  cardBackgroundHex: '#0f172a',
  borderColorHex: '#334155',
  headingScale: 'md',
  contentWidth: 'default',
  borderStrength: 'default',
  buttonStyle: 'neon',
  surfaceStyle: 'glass',
  effectStyle: 'glow',
  effectIntensity: 'high',
  backgroundStyle: 'mesh',
  heroImageTreatment: 'cinematic',
  sectionDividerStyle: 'glow',
  buttonRadius: 'pill',
  avatarShape: 'circle',
  avatarSize: 'lg',
  sectionSpacing: 'default',
  coverHeight: 'medium',
  coverOverlay: 'medium',
}

describe('EPK appearance rendering', () => {
  it('applies custom color variables across every skin', () => {
    const skinIds = Object.keys(EPK_SKIN_TOKENS) as EpkSkinId[]

    skinIds.forEach((skin) => {
      const resolved = resolveEpkAppearanceForRender({ skin, appearance })

      expect(resolved.rootStyle).toMatchObject({
        '--epk-accent': '#22c55e',
        '--epk-secondary-accent': '#06b6d4',
        '--epk-custom-text': '#ffffff',
        '--epk-page-bg': '#111827',
        '--epk-card-custom-bg': '#0f172a',
        '--epk-border-custom': '#334155',
      })
      expect(resolved.mergedTokens.page).toContain('var(--epk-page-bg)')
      expect(resolved.mergedTokens.heading).toContain('var(--epk-custom-text)')
      expect(resolved.mergedTokens.subheading).toContain('var(--epk-custom-text)')
      expect(resolved.mergedTokens.btnPrimary).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.btnPrimary).toContain('rounded-full')
      expect(resolved.mergedTokens.btnGhost).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.badge).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.badge).toContain('var(--epk-secondary-accent)')
      expect(resolved.mergedTokens.card).toContain('var(--epk-accent-muted)')
      expect(resolved.mergedTokens.card).toContain('var(--epk-card-bg)')
      expect(resolved.mergedTokens.card).toContain('var(--epk-border-custom)')
      expect(resolved.mergedTokens.cardMuted).toContain('var(--epk-accent-muted)')
      expect(resolved.mergedTokens.link).toContain('var(--epk-secondary-accent)')
      expect(resolved.mergedTokens.statValue).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.statCell).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.oneLinerWrap).toContain('var(--epk-accent)')
      expect(resolved.mergedTokens.bodyStrong).toContain('var(--epk-custom-text)')
      expect(resolved.mergedTokens.muted).toContain('var(--epk-custom-text)')
      expect(resolved.mergedTokens.label).toContain('var(--epk-custom-text)')
      expect(resolved.color.accentBg).toContain('var(--epk-accent)')
      expect(resolved.color.secondaryText).toContain('var(--epk-secondary-accent)')
      expect(resolved.color.accentBorder).toContain('var(--epk-accent)')
      expect(resolved.color.text).toContain('var(--epk-custom-text)')
      expect(resolved.color.cardBg).toContain('var(--epk-card-bg)')
      expect(resolved.color.customBorder).toContain('var(--epk-border-custom)')
      expect(resolved.color.effectClass).toContain('var(--epk-accent')
      expect(resolved.color.pageEffectClass).toContain('radial-gradient')
      expect(resolved.color.sectionDivider).toContain('var(--epk-accent-muted)')
      expect(resolved.color.heroImage).toContain('contrast-110')
      expect(resolved.color.mediaFrame).toContain('var(--epk-accent-muted)')
      expect(resolved.styles.page).toMatchObject({
        backgroundColor: '#111827',
        color: '#ffffff',
      })
      expect(resolved.styles.card).toMatchObject({
        backgroundColor: 'var(--epk-card-custom-bg)',
        borderColor: '#334155',
        color: '#ffffff',
      })
      expect(resolved.styles.heroShell).toMatchObject({
        backgroundColor: 'var(--epk-card-custom-bg)',
        borderColor: '#334155',
      })
      expect(resolved.styles.statCell).toMatchObject({
        backgroundColor: 'var(--epk-muted-card-bg)',
        borderColor: '#334155',
      })
      expect(resolved.styles.badge).toMatchObject({
        borderColor: '#334155',
        color: '#06b6d4',
      })
      expect(resolved.styles.buttonPrimary).toMatchObject({
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
      })
      expect(resolved.styles.avatarRing).toMatchObject({
        borderColor: '#334155',
      })
      expect(resolved.styles.accentText).toMatchObject({
        color: '#22c55e',
      })
    })
  })

  it('keeps editable color styles wired through template render surfaces', () => {
    const templateSource = readFileSync(
      'components/epk/epk-template-variants.tsx',
      'utf8'
    )
    const builderSource = readFileSync('components/epk/epk-builder-view.tsx', 'utf8')

    expect(templateSource.match(/style=\{s\.heroShell\}/g)?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(templateSource.match(/style=\{s\.card\}/g)?.length ?? 0).toBeGreaterThanOrEqual(8)
    expect(templateSource).toContain('style={ctx.s.statCell}')
    expect(templateSource).toContain('style={s.mediaFrame}')
    expect(templateSource).toContain('style={s.badge}')
    expect(templateSource).toContain('style={s.buttonPrimary}')
    expect(templateSource).toContain('style={s.buttonGhost}')
    expect(templateSource).toContain('style={{ ...resolved.rootStyle, ...resolved.styles.page }}')
    expect(templateSource).toContain('styles={resolved.styles}')
    expect(builderSource).toContain('style={{ ...resolved.rootStyle, ...resolved.styles.page }}')
    expect(builderSource).toContain('styles={resolved.styles}')
  })

  it('normalizes valid colors and preserves cleared custom colors', () => {
    expect(
      normalizeEpkAppearance({
        accentHex: '#ABCDEF',
        secondaryAccentHex: '#00AAEE',
        pageBackgroundHex: '#010203',
        cardBackgroundHex: null,
        borderColorHex: '#AABBCC',
        buttonStyle: 'glass',
        surfaceStyle: 'editorial',
        effectStyle: 'poster',
        effectIntensity: 'medium',
        backgroundStyle: 'spotlight',
        heroImageTreatment: 'duotone',
        sectionDividerStyle: 'ticker',
        buttonRadius: 'sharp',
        textColorCustomHex: null,
      })
    ).toMatchObject({
      accentHex: '#abcdef',
      secondaryAccentHex: '#00aaee',
      pageBackgroundHex: '#010203',
      cardBackgroundHex: null,
      borderColorHex: '#aabbcc',
      buttonStyle: 'glass',
      surfaceStyle: 'editorial',
      effectStyle: 'poster',
      effectIntensity: 'medium',
      backgroundStyle: 'spotlight',
      heroImageTreatment: 'duotone',
      sectionDividerStyle: 'ticker',
      buttonRadius: 'sharp',
      textColorCustomHex: null,
    })
  })

  it('falls back safely for invalid customization enums and old saved data', () => {
    expect(
      normalizeEpkAppearance({
        buttonStyle: 'chrome',
        effectStyle: 'sparkle',
        backgroundStyle: 'cloud',
        accentHex: '#123456',
      })
    ).toMatchObject({
      buttonStyle: 'solid',
      effectStyle: 'none',
      backgroundStyle: 'template',
      accentHex: '#123456',
      secondaryAccentHex: null,
      borderColorHex: null,
    })
  })

  it('reports invalid non-null color payloads', () => {
    expect(
      invalidEpkAppearanceHexFields({
        accentHex: 'red',
        secondaryAccentHex: 'cyan',
        pageBackgroundHex: '#12345',
        cardBackgroundHex: '#abcdex',
        borderColorHex: 42,
        textColorCustomHex: null,
      })
    ).toEqual(['accentHex', 'secondaryAccentHex', 'pageBackgroundHex', 'cardBackgroundHex', 'borderColorHex'])
    expect(invalidEpkAppearanceHexFields(null)).toEqual([])
    expect(invalidEpkAppearanceHexFields('not-an-object')).toEqual(['epkAppearance'])
  })
})
