// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const replace = vi.fn()
  const push = vi.fn()
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }

  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)

  return {
    replace,
    push,
    user: { id: 'user-1' },
    builder,
    supabase: { from: vi.fn(() => builder) },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <a {...props}>{children}</a>
  ),
}))

vi.mock('@/lib/supabase', () => ({ supabase: mocks.supabase }))
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mocks.user }),
}))
vi.mock('@/hooks/use-multi-account', () => ({
  useMultiAccount: () => ({ currentAccount: null }),
}))
vi.mock('@/hooks/use-appearance-settings', () => ({
  useAppearanceSettings: () => ({
    settings: {
      dashboardTheme: 'emerald',
      selectedTheme: 'emerald',
      profileColors: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
      profileImages: {},
      darkMode: true,
      animations: true,
      glowEffects: true,
    },
    updateSetting: vi.fn(),
    updateProfileColor: vi.fn(),
    updateProfileImage: vi.fn(),
    setDashboardTheme: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue({ success: true }),
    applyTheme: vi.fn(),
  }),
}))
vi.mock('@/lib/accounts/account-types', () => ({
  isOrganizationType: () => false,
}))

vi.mock('@/components/ui/tabs', () => {
  let activeValue = 'profile'
  let onValueChange: ((value: string) => void) | undefined

  const Tabs = ({
    value,
    onValueChange: onChange,
    children,
  }: {
    value: string
    onValueChange: (value: string) => void
    children: ReactNode
  }) => {
    activeValue = value
    onValueChange = onChange
    return <div data-testid="settings-tabs">{children}</div>
  }

  const TabsList = ({ children }: { children: ReactNode }) => <div>{children}</div>
  const TabsTrigger = ({
    value,
    children,
  }: {
    value: string
    children: ReactNode
  }) => (
    <button
      type="button"
      role="tab"
      data-state={activeValue === value ? 'active' : 'inactive'}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  )
  const TabsContent = ({
    value,
    children,
  }: {
    value: string
    children: ReactNode
  }) => (activeValue === value ? <div>{children}</div> : null)

  return { Tabs, TabsList, TabsTrigger, TabsContent }
})

const stub = vi.hoisted(() => (name: string) => ({ children }: { children?: ReactNode }) => (
  <div data-testid={name}>{children}</div>
))

vi.mock('@/components/settings/dashboard-theme-picker', () => ({ DashboardThemePicker: stub('dashboard-theme-picker') }))
vi.mock('@/components/settings/custom-profile-design-panel', () => ({ CustomProfileDesignPanel: stub('custom-profile-design-panel') }))
vi.mock('@/components/settings/settings-theme-shell', () => ({ SettingsThemeShell: stub('settings-theme-shell') }))
vi.mock('@/components/settings/enhanced-artist-settings', () => ({ EnhancedArtistSettings: stub('artist-settings') }))
vi.mock('@/components/settings/enhanced-venue-settings', () => ({ EnhancedVenueSettings: stub('venue-settings') }))
vi.mock('@/components/settings/enhanced-general-settings', () => ({ EnhancedGeneralSettings: stub('general-settings') }))
vi.mock('@/components/ui/color-picker', () => ({ ColorPicker: stub('color-picker') }))
vi.mock('@/components/ui/image-upload', () => ({ ImageUpload: stub('image-upload') }))
vi.mock('@/components/settings/skills-settings', () => ({ SkillsSettings: stub('skills-settings') }))
vi.mock('@/components/settings/portfolio-settings', () => ({ PortfolioSettings: stub('portfolio-settings') }))
vi.mock('@/components/settings/experience-settings', () => ({ ExperienceSettings: stub('experience-settings') }))
vi.mock('@/components/settings/certifications-settings', () => ({ CertificationsSettings: stub('certifications-settings') }))
vi.mock('@/components/settings/about-settings', () => ({ AboutSettings: stub('about-settings') }))
vi.mock('@/components/notifications/notification-settings', () => ({ NotificationSettings: stub('notification-settings') }))
vi.mock('@/components/settings/profile-colors-settings', () => ({ ProfileColorsSettings: stub('profile-colors-settings') }))
vi.mock('@/components/product-education/reset-education-button', () => ({ ResetEducationButton: stub('reset-education-button') }))

import { EnhancedSettingsRouter } from '@/components/settings/enhanced-settings-router'

describe('EnhancedSettingsRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.builder.single.mockResolvedValue({
      data: { id: 'user-1', account_type: 'general', username: 'kyle', full_name: 'Kyle' },
      error: null,
    })
    window.history.replaceState({}, '', '/settings')
  })

  afterEach(() => {
    cleanup()
  })

  it('opens the notifications tab from its unified settings deep link', async () => {
    window.history.replaceState({}, '', '/settings?tab=notifications')

    render(<EnhancedSettingsRouter />)

    expect(await screen.findByTestId('notification-settings')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Notifications/ }).getAttribute('data-state')).toBe('active')
  })

  it('falls back to profile for an unsupported tab query', async () => {
    window.history.replaceState({}, '', '/settings?tab=does-not-exist')

    render(<EnhancedSettingsRouter />)

    expect(await screen.findByTestId('general-settings')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Profile' }).getAttribute('data-state')).toBe('active')
    expect(screen.queryByTestId('notification-settings')).toBeNull()
  })

  it('opens Advanced Colors inside the unified router', async () => {
    window.history.replaceState({}, '', '/settings?tab=appearance')

    render(<EnhancedSettingsRouter />)

    fireEvent.click(await screen.findByRole('button', { name: 'Advanced Colors' }))

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/settings?tab=profile-colors', { scroll: false })
    })
    expect(mocks.push).not.toHaveBeenCalled()
    expect(screen.getByTestId('profile-colors-settings')).toBeTruthy()
  })

  it('keeps tab changes on the unified settings route', async () => {
    render(<EnhancedSettingsRouter />)
    await screen.findByTestId('general-settings')

    fireEvent.click(screen.getByRole('tab', { name: /Profile Colors/ }))

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/settings?tab=profile-colors', { scroll: false })
    })
    expect(screen.getByTestId('profile-colors-settings')).toBeTruthy()
  })
})
