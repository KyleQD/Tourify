/**
 * General-account dashboard color theme presets.
 * Applied to the personal /dashboard shell via CSS variables.
 */

export const DEFAULT_DASHBOARD_THEME_ID = 'royal' as const

export const DASHBOARD_THEME_STORAGE_KEY = 'tourify-dashboard-theme'

export const DASHBOARD_THEME_IDS = [
  'royal',
  'emerald',
  'ocean',
  'sunset',
  'amber',
  'rose',
  'cyan',
  'indigo',
  'slate',
  'forest',
  'pearl',
  'obsidian',
] as const

export type DashboardThemeId = (typeof DASHBOARD_THEME_IDS)[number]

export interface DashboardThemePalette {
  id: DashboardThemeId
  name: string
  description: string
  primary: string
  secondary: string
  accent: string
  bgFrom: string
  bgVia: string
  bgTo: string
  glowA: string
  glowB: string
  glowC: string
  ctaFrom: string
  ctaTo: string
  textGradientFrom: string
  textGradientTo: string
  /** Main body text color for the dashboard shell */
  foreground: string
  /** Secondary / muted text color */
  muted: string
  /** True for light shells that need dark text */
  isLight: boolean
  /** HSL components without hsl(), e.g. "262.1 83.3% 57.8%" */
  primaryHsl: string
  ringHsl: string
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function isDashboardThemeId(value: unknown): value is DashboardThemeId {
  return typeof value === 'string' && (DASHBOARD_THEME_IDS as readonly string[]).includes(value)
}

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value)
}

const DARK_FOREGROUND = '#f8fafc'
const DARK_MUTED = '#94a3b8'

export const DASHBOARD_THEMES: Record<DashboardThemeId, DashboardThemePalette> = {
  royal: {
    id: 'royal',
    name: 'Royal',
    description: 'Deep violet with cool blue accents',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    accent: '#a78bfa',
    bgFrom: '#0f172a',
    bgVia: '#581c87',
    bgTo: '#0f172a',
    glowA: '#a855f7',
    glowB: '#3b82f6',
    glowC: '#6366f1',
    ctaFrom: '#9333ea',
    ctaTo: '#2563eb',
    textGradientFrom: '#e9d5ff',
    textGradientTo: '#bfdbfe',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '262.1 83.3% 57.8%',
    ringHsl: '262.1 83.3% 57.8%',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Rich greens over deep slate',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    bgFrom: '#0f172a',
    bgVia: '#064e3b',
    bgTo: '#0f172a',
    glowA: '#10b981',
    glowB: '#14b8a6',
    glowC: '#22c55e',
    ctaFrom: '#059669',
    ctaTo: '#0d9488',
    textGradientFrom: '#a7f3d0',
    textGradientTo: '#99f6e4',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '160 84.1% 39.4%',
    ringHsl: '160 84.1% 39.4%',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Clear blues with bright sky accents',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    accent: '#60a5fa',
    bgFrom: '#0f172a',
    bgVia: '#1e3a8a',
    bgTo: '#0f172a',
    glowA: '#3b82f6',
    glowB: '#0ea5e9',
    glowC: '#6366f1',
    ctaFrom: '#2563eb',
    ctaTo: '#0284c7',
    textGradientFrom: '#bfdbfe',
    textGradientTo: '#bae6fd',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '217.2 91.2% 59.8%',
    ringHsl: '217.2 91.2% 59.8%',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm rose and coral energy',
    primary: '#f43f5e',
    secondary: '#e11d48',
    accent: '#fb7185',
    bgFrom: '#0f172a',
    bgVia: '#9f1239',
    bgTo: '#0f172a',
    glowA: '#f43f5e',
    glowB: '#f97316',
    glowC: '#ec4899',
    ctaFrom: '#e11d48',
    ctaTo: '#ea580c',
    textGradientFrom: '#fecdd3',
    textGradientTo: '#fed7aa',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '346.8 77.2% 49.8%',
    ringHsl: '346.8 77.2% 49.8%',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    description: 'Golden warmth against dark stone',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fbbf24',
    bgFrom: '#0f172a',
    bgVia: '#78350f',
    bgTo: '#0f172a',
    glowA: '#f59e0b',
    glowB: '#eab308',
    glowC: '#f97316',
    ctaFrom: '#d97706',
    ctaTo: '#ca8a04',
    textGradientFrom: '#fde68a',
    textGradientTo: '#fcd34d',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '37.7 92.1% 50.2%',
    ringHsl: '37.7 92.1% 50.2%',
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    description: 'Soft pinks with plum undertones',
    primary: '#f43f5e',
    secondary: '#be123c',
    accent: '#fb7185',
    bgFrom: '#0f172a',
    bgVia: '#831843',
    bgTo: '#0f172a',
    glowA: '#fb7185',
    glowB: '#e879f9',
    glowC: '#f472b6',
    ctaFrom: '#e11d48',
    ctaTo: '#db2777',
    textGradientFrom: '#fecdd3',
    textGradientTo: '#fbcfe8',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '346.8 77.2% 49.8%',
    ringHsl: '330 81.2% 60.2%',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    description: 'Electric teal and ice blue',
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#22d3ee',
    bgFrom: '#0f172a',
    bgVia: '#164e63',
    bgTo: '#0f172a',
    glowA: '#06b6d4',
    glowB: '#22d3ee',
    glowC: '#2dd4bf',
    ctaFrom: '#0891b2',
    ctaTo: '#0d9488',
    textGradientFrom: '#a5f3fc',
    textGradientTo: '#99f6e4',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '188.7 94.5% 42.7%',
    ringHsl: '188.7 94.5% 42.7%',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    description: 'Cool indigo with periwinkle highlights',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#818cf8',
    bgFrom: '#0f172a',
    bgVia: '#312e81',
    bgTo: '#0f172a',
    glowA: '#6366f1',
    glowB: '#8b5cf6',
    glowC: '#3b82f6',
    ctaFrom: '#4f46e5',
    ctaTo: '#7c3aed',
    textGradientFrom: '#c7d2fe',
    textGradientTo: '#ddd6fe',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '238.7 83.5% 66.7%',
    ringHsl: '238.7 83.5% 66.7%',
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral steel with soft silver accents',
    primary: '#64748b',
    secondary: '#475569',
    accent: '#94a3b8',
    bgFrom: '#020617',
    bgVia: '#1e293b',
    bgTo: '#020617',
    glowA: '#64748b',
    glowB: '#94a3b8',
    glowC: '#475569',
    ctaFrom: '#475569',
    ctaTo: '#334155',
    textGradientFrom: '#e2e8f0',
    textGradientTo: '#cbd5e1',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '215.4 16.3% 46.9%',
    ringHsl: '215.4 16.3% 56.9%',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Deep moss greens with olive warmth',
    primary: '#16a34a',
    secondary: '#15803d',
    accent: '#4ade80',
    bgFrom: '#052e16',
    bgVia: '#14532d',
    bgTo: '#0f172a',
    glowA: '#22c55e',
    glowB: '#84cc16',
    glowC: '#16a34a',
    ctaFrom: '#15803d',
    ctaTo: '#4d7c0f',
    textGradientFrom: '#bbf7d0',
    textGradientTo: '#d9f99d',
    foreground: DARK_FOREGROUND,
    muted: DARK_MUTED,
    isLight: false,
    primaryHsl: '142.1 76.2% 36.3%',
    ringHsl: '142.1 76.2% 36.3%',
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl White',
    description: 'Soft ivory surfaces with charcoal accents',
    primary: '#44403c',
    secondary: '#292524',
    accent: '#78716c',
    bgFrom: '#f7f3ec',
    bgVia: '#efe8dc',
    bgTo: '#f4efe7',
    glowA: '#ddd6cb',
    glowB: '#d6d3d1',
    glowC: '#e7e5e4',
    ctaFrom: '#292524',
    ctaTo: '#57534e',
    textGradientFrom: '#1c1917',
    textGradientTo: '#57534e',
    foreground: '#1c1917',
    muted: '#57534e',
    isLight: true,
    primaryHsl: '24 5.7% 27.1%',
    ringHsl: '25 5.3% 33.9%',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Black',
    description: 'Pure black with cool silver edges',
    primary: '#e5e5e5',
    secondary: '#a3a3a3',
    accent: '#fafafa',
    bgFrom: '#000000',
    bgVia: '#0a0a0a',
    bgTo: '#000000',
    glowA: '#262626',
    glowB: '#404040',
    glowC: '#171717',
    ctaFrom: '#262626',
    ctaTo: '#525252',
    textGradientFrom: '#fafafa',
    textGradientTo: '#a3a3a3',
    foreground: '#fafafa',
    muted: '#a3a3a3',
    isLight: false,
    primaryHsl: '0 0% 90%',
    ringHsl: '0 0% 83%',
  },
}

export const DASHBOARD_THEME_LIST: DashboardThemePalette[] = DASHBOARD_THEME_IDS.map(
  (id) => DASHBOARD_THEMES[id]
)

export function getDashboardTheme(id: unknown): DashboardThemePalette {
  if (isDashboardThemeId(id)) return DASHBOARD_THEMES[id]
  return DASHBOARD_THEMES[DEFAULT_DASHBOARD_THEME_ID]
}

export function getDashboardThemeCssVars(
  theme: DashboardThemePalette
): Record<string, string> {
  return {
    '--dashboard-primary': theme.primary,
    '--dashboard-secondary': theme.secondary,
    '--dashboard-accent': theme.accent,
    '--dashboard-bg-from': theme.bgFrom,
    '--dashboard-bg-via': theme.bgVia,
    '--dashboard-bg-to': theme.bgTo,
    '--dashboard-glow-a': theme.glowA,
    '--dashboard-glow-b': theme.glowB,
    '--dashboard-glow-c': theme.glowC,
    '--dashboard-cta-from': theme.ctaFrom,
    '--dashboard-cta-to': theme.ctaTo,
    '--dashboard-text-from': theme.textGradientFrom,
    '--dashboard-text-to': theme.textGradientTo,
    '--dashboard-foreground': theme.foreground,
    '--dashboard-muted': theme.muted,
    '--primary': theme.primaryHsl,
    '--ring': theme.ringHsl,
  }
}

export function readCachedDashboardThemeId(): DashboardThemeId {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_THEME_ID
  try {
    const cached = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY)
    return isDashboardThemeId(cached) ? cached : DEFAULT_DASHBOARD_THEME_ID
  } catch {
    return DEFAULT_DASHBOARD_THEME_ID
  }
}

export function writeCachedDashboardThemeId(id: DashboardThemeId) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, id)
  } catch {
    // ignore quota / private mode
  }
}
