import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_THEME_IDS,
  DASHBOARD_THEME_LIST,
  DASHBOARD_THEMES,
  DEFAULT_DASHBOARD_THEME_ID,
  getDashboardTheme,
  getDashboardThemeCssVars,
  isDashboardThemeId,
  isHexColor,
} from '@/lib/dashboard/dashboard-themes'

describe('dashboard themes', () => {
  it('exposes exactly 12 base color schemes', () => {
    expect(DASHBOARD_THEME_IDS).toHaveLength(12)
    expect(DASHBOARD_THEME_LIST).toHaveLength(12)
    expect(Object.keys(DASHBOARD_THEMES)).toHaveLength(12)
  })

  it('uses royal as the default theme', () => {
    expect(DEFAULT_DASHBOARD_THEME_ID).toBe('royal')
    expect(getDashboardTheme(undefined).id).toBe('royal')
    expect(getDashboardTheme('not-a-theme').id).toBe('royal')
  })

  it('includes pearl white and obsidian black themes', () => {
    expect(getDashboardTheme('pearl').name).toBe('Pearl White')
    expect(getDashboardTheme('pearl').isLight).toBe(true)
    expect(getDashboardTheme('obsidian').name).toBe('Obsidian Black')
    expect(getDashboardTheme('obsidian').isLight).toBe(false)
  })

  it('resolves every registered theme id uniquely', () => {
    const ids = DASHBOARD_THEME_LIST.map((theme) => theme.id)
    expect(new Set(ids).size).toBe(12)

    for (const id of DASHBOARD_THEME_IDS) {
      expect(isDashboardThemeId(id)).toBe(true)
      expect(getDashboardTheme(id).id).toBe(id)
      expect(DASHBOARD_THEMES[id].id).toBe(id)
    }
  })

  it('requires coordinated palette fields with valid hex colors', () => {
    for (const theme of DASHBOARD_THEME_LIST) {
      expect(theme.name.length).toBeGreaterThan(0)
      expect(theme.description.length).toBeGreaterThan(0)
      expect(isHexColor(theme.foreground)).toBe(true)
      expect(isHexColor(theme.muted)).toBe(true)
      expect(theme.primaryHsl.length).toBeGreaterThan(0)
      expect(theme.ringHsl.length).toBeGreaterThan(0)

      const hexFields = [
        theme.primary,
        theme.secondary,
        theme.accent,
        theme.bgFrom,
        theme.bgVia,
        theme.bgTo,
        theme.glowA,
        theme.glowB,
        theme.glowC,
        theme.ctaFrom,
        theme.ctaTo,
        theme.textGradientFrom,
        theme.textGradientTo,
      ]

      for (const color of hexFields) {
        expect(isHexColor(color)).toBe(true)
      }
    }
  })

  it('builds CSS variables for shell application', () => {
    const theme = getDashboardTheme('ocean')
    const vars = getDashboardThemeCssVars(theme)

    expect(vars['--dashboard-primary']).toBe(theme.primary)
    expect(vars['--dashboard-bg-via']).toBe(theme.bgVia)
    expect(vars['--dashboard-cta-from']).toBe(theme.ctaFrom)
    expect(vars['--primary']).toBe(theme.primaryHsl)
    expect(vars['--ring']).toBe(theme.ringHsl)
  })
})
