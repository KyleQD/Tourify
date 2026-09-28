// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const notificationMocks = vi.hoisted(() => ({
  fetchUnreadNotificationCount: vi.fn(),
  fetchUserNotifications: vi.fn(),
  markAccountNotificationsAsRead: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)

  return {
    channel,
    supabase: {
      auth: {
        getSession: vi.fn(),
      },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
      from: vi.fn(),
    },
  }
})

const multiAccountMock = vi.hoisted(() => ({
  isAccountsReady: true,
  userAccounts: [
    {
      account_type: 'general',
      profile_id: 'user-1',
      profile_data: { full_name: 'Kyle Tour' },
      permissions: {},
      is_active: true,
    },
    {
      account_type: 'artist',
      profile_id: 'artist-1',
      profile_data: { artist_name: 'Neon Harbor' },
      permissions: {},
      is_active: true,
    },
  ],
}))

vi.mock('@/lib/notifications/fetch-user-notifications', () => notificationMocks)
vi.mock('@/lib/supabase', () => ({ supabase: supabaseMocks.supabase }))
vi.mock('@/hooks/use-multi-account', () => ({
  useMultiAccount: () => multiAccountMock,
}))
vi.mock('@/components/profile/follow-requests-modal', () => ({
  FollowRequestsModal: () => null,
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => {
      const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...domProps } = props
      return <div {...domProps}>{children}</div>
    },
  },
}))

import { EnhancedNotificationCenter } from '@/components/notifications/enhanced-notification-center'

const unreadNotification = {
  id: 'notification-1',
  type: 'message',
  title: 'New message',
  content: 'Your tour manager sent an update.',
  metadata: {},
  related_user: null,
  is_read: false,
  priority: 'normal',
  created_at: new Date().toISOString(),
  target_profile_id: 'artist-1',
  target_account_type: 'artist',
}

describe('EnhancedNotificationCenter interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.channel.on.mockReturnValue(supabaseMocks.channel)
    supabaseMocks.channel.subscribe.mockReturnValue(supabaseMocks.channel)
    supabaseMocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })
    notificationMocks.fetchUnreadNotificationCount.mockResolvedValue(3)
    notificationMocks.fetchUserNotifications.mockResolvedValue({
      notifications: [unreadNotification],
      unreadCount: 3,
      error: null,
      inAppDisabled: false,
    })
    notificationMocks.markAccountNotificationsAsRead.mockResolvedValue({ error: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ requests: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens on all owned accounts, removes legacy controls, and clears the persisted badge', async () => {
    render(<EnhancedNotificationCenter />)

    const bell = await screen.findByRole('button', { name: 'Notifications, 3 unread' })
    fireEvent.click(bell)

    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeTruthy()
    expect(screen.getAllByText('All accounts').length).toBeGreaterThan(0)
    expect(await screen.findByText('New message')).toBeTruthy()
    expect(screen.getByText('Neon Harbor')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Search notifications...')).toBeNull()
    expect(screen.queryByText(/^All \(/)).toBeNull()
    expect(screen.queryByText(/^Unread \(/)).toBeNull()
    expect(screen.queryByText(/^Read \(/)).toBeNull()
    expect(screen.queryByText('Mark all read')).toBeNull()

    await waitFor(() => {
      expect(notificationMocks.markAccountNotificationsAsRead).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        accountScopes: expect.arrayContaining([
          expect.objectContaining({ accountType: 'general', targetProfileId: 'user-1' }),
          expect.objectContaining({ accountType: 'artist', targetProfileId: 'artist-1' }),
        ]),
      }))
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy()
    })
  })

  it('restores the real unread count when acknowledgement fails', async () => {
    notificationMocks.markAccountNotificationsAsRead.mockResolvedValueOnce({ error: 'write failed' })
    render(<EnhancedNotificationCenter />)

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))

    await waitFor(() => {
      expect(notificationMocks.fetchUnreadNotificationCount).toHaveBeenCalledTimes(2)
      expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeTruthy()
    })
  })

  it('closes when the user clicks outside the notification center', async () => {
    render(
      <div>
        <EnhancedNotificationCenter />
        <button type="button">Outside control</button>
      </div>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeTruthy()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside control' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull()
    })
  })
})
