// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/analytics/ux-event-client', () => ({
  trackDashboardUxEvent: vi.fn(),
}))

import { EnhancedAccountSearch } from '@/components/search/enhanced-account-search'

describe('EnhancedAccountSearch interactions', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('closes the search preview when the user clicks outside it', async () => {
    render(
      <div>
        <EnhancedAccountSearch />
        <button type="button">Outside control</button>
      </div>,
    )

    fireEvent.focus(screen.getByRole('combobox', { name: 'Search Tourify' }))
    expect(await screen.findByRole('listbox')).toBeTruthy()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside control' }))

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull()
    })
  })
})
