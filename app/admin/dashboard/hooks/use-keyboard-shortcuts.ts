"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'search' | 'system'
  global?: boolean // Whether it works globally or only in specific contexts
  modifier?: 'ctrl' | 'cmd' | 'shift' | 'alt'
  disabled?: boolean
}

interface KeyboardShortcutContext {
  shortcuts: KeyboardShortcut[]
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
  showShortcuts: () => void
  isMac: boolean
}

function shortcutModifiersSatisfied(shortcut: KeyboardShortcut, e: KeyboardEvent): boolean {
  const hasCmdOrCtrl = e.metaKey || e.ctrlKey
  if (shortcut.key === 'cmd+shift+f')
    return hasCmdOrCtrl && e.shiftKey

  const m = shortcut.modifier
  if (m === 'cmd' || m === 'ctrl')
    return hasCmdOrCtrl
  if (m === 'shift')
    return e.shiftKey
  if (m === 'alt')
    return e.altKey

  if (/^[0-9]$/.test(shortcut.key))
    return hasCmdOrCtrl
  if (shortcut.key === ',')
    return hasCmdOrCtrl

  return !hasCmdOrCtrl
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map())
  const isMac = useRef(false)

  // Detect OS for modifier key display
  useEffect(() => {
    isMac.current = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }, [])

  // Navigation shortcuts
  const navigationShortcuts: KeyboardShortcut[] = [
    {
      key: '1',
      description: 'Go to Dashboard',
      action: () => router.push('/admin/dashboard'),
      category: 'navigation',
      global: true
    },
    {
      key: '2',
      description: 'Go to Tours',
      action: () => router.push('/admin/dashboard/tours'),
      category: 'navigation',
      global: true
    },
    {
      key: '3',
      description: 'Go to Events',
      action: () => router.push('/admin/dashboard/events'),
      category: 'navigation',
      global: true
    },
    {
      key: '4',
      description: 'Go to Artists',
      action: () => router.push('/admin/dashboard/artists'),
      category: 'navigation',
      global: true
    },
    {
      key: '5',
      description: 'Go to Venues',
      action: () => router.push('/admin/dashboard/venues'),
      category: 'navigation',
      global: true
    },
    {
      key: '6',
      description: 'Go to Ticketing',
      action: () => router.push('/admin/dashboard/ticketing'),
      category: 'navigation',
      global: true
    },
    {
      key: '7',
      description: 'Go to Staff & Crew',
      action: () => router.push('/admin/dashboard/staff'),
      category: 'navigation',
      global: true
    },
    {
      key: '8',
      description: 'Go to Logistics',
      action: () => router.push('/admin/dashboard/logistics'),
      category: 'navigation',
      global: true
    },
    {
      key: '9',
      description: 'Go to Finances',
      action: () => router.push('/admin/dashboard/finances'),
      category: 'navigation',
      global: true
    },
    {
      key: '0',
      description: 'Go to Analytics',
      action: () => router.push('/admin/dashboard/analytics'),
      category: 'navigation',
      global: true
    },
    {
      key: ',',
      description: 'Go to Settings',
      action: () => router.push('/admin/dashboard/settings'),
      category: 'navigation',
      global: true
    },
    {
      key: 'g',
      modifier: 'cmd',
      description: 'Go to...',
      action: () => {
        // Trigger global search/navigation
        const event = new CustomEvent('openGlobalSearch')
        window.dispatchEvent(event)
      },
      category: 'navigation',
      global: true
    },
    {
      key: 'b',
      modifier: 'cmd',
      description: 'Go back',
      action: () => router.back(),
      category: 'navigation',
      global: true
    },
    {
      key: 'f',
      modifier: 'cmd',
      description: 'Go forward',
      action: () => router.forward(),
      category: 'navigation',
      global: true
    }
  ]

  // Action shortcuts
  const actionShortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      modifier: 'cmd',
      description: 'New item',
      action: () => {
        // Context-aware new item creation
        if (pathname.includes('/tours')) {
          router.push('/admin/dashboard/tours/new')
        } else if (pathname.includes('/events')) {
          router.push('/admin/dashboard/events/new')
        } else if (pathname.includes('/artists')) {
          router.push('/admin/dashboard/artists/new')
        } else {
          router.push('/admin/dashboard/tours/new')
        }
      },
      category: 'actions',
      global: true
    },
    {
      key: 's',
      modifier: 'cmd',
      description: 'Save',
      action: () => {
        // Trigger save action in current context
        const event = new CustomEvent('saveCurrentItem')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'Enter',
      description: 'Confirm/Submit',
      action: () => {
        // Trigger form submission or confirmation
        const event = new CustomEvent('confirmAction')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'Escape',
      description: 'Cancel/Close',
      action: () => {
        // Close modals, cancel forms, etc.
        const event = new CustomEvent('cancelAction')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'Delete',
      description: 'Delete selected',
      action: () => {
        // Delete selected items
        const event = new CustomEvent('deleteSelected')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'a',
      modifier: 'cmd',
      description: 'Select all',
      action: () => {
        // Select all items in current view
        const event = new CustomEvent('selectAll')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'd',
      modifier: 'cmd',
      description: 'Deselect all',
      action: () => {
        // Deselect all items
        const event = new CustomEvent('deselectAll')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'r',
      modifier: 'cmd',
      description: 'Refresh',
      action: () => {
        // Refresh current data
        const event = new CustomEvent('refreshData')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    },
    {
      key: 'e',
      modifier: 'cmd',
      description: 'Export',
      action: () => {
        // Export current data
        const event = new CustomEvent('exportData')
        window.dispatchEvent(event)
      },
      category: 'actions',
      global: true
    }
  ]

  // Search shortcuts
  const searchShortcuts: KeyboardShortcut[] = [
    {
      key: 'f',
      modifier: 'cmd',
      description: 'Find in page',
      action: () => {
        // Trigger browser find
        const event = new KeyboardEvent('keydown', {
          key: 'f',
          metaKey: true,
          bubbles: true
        })
        document.dispatchEvent(event)
      },
      category: 'search',
      global: true
    },
    {
      key: 'k',
      modifier: 'cmd',
      description: 'Global search',
      action: () => {
        // Open global search
        const event = new CustomEvent('openGlobalSearch')
        window.dispatchEvent(event)
      },
      category: 'search',
      global: true
    },
    {
      key: 'cmd+shift+f',
      description: 'Find and replace',
      action: () => {
        // Trigger find and replace
        const event = new KeyboardEvent('keydown', {
          key: 'f',
          metaKey: true,
          shiftKey: true,
          bubbles: true
        })
        document.dispatchEvent(event)
      },
      category: 'search',
      global: true
    }
  ]

  // System shortcuts
  const systemShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      modifier: 'cmd',
      description: 'Show shortcuts',
      action: () => {
        // Show keyboard shortcuts help
        const event = new CustomEvent('showKeyboardShortcuts')
        window.dispatchEvent(event)
      },
      category: 'system',
      global: true
    },
    {
      key: 'h',
      modifier: 'cmd',
      description: 'Toggle help',
      action: () => {
        // Toggle help panel
        const event = new CustomEvent('toggleHelp')
        window.dispatchEvent(event)
      },
      category: 'system',
      global: true
    },
    {
      key: 'm',
      modifier: 'cmd',
      description: 'Toggle sidebar',
      action: () => {
        // Toggle sidebar visibility
        const event = new CustomEvent('toggleSidebar')
        window.dispatchEvent(event)
      },
      category: 'system',
      global: true
    },
    {
      key: 't',
      modifier: 'cmd',
      description: 'Toggle theme',
      action: () => {
        // Toggle dark/light theme
        const event = new CustomEvent('toggleTheme')
        window.dispatchEvent(event)
      },
      category: 'system',
      global: true
    },
    {
      key: 'cmd+shift+f',
      description: 'Toggle fullscreen',
      action: () => {
        // Toggle fullscreen mode
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      },
      category: 'system',
      global: true
    }
  ]

  // Register all default shortcuts
  useEffect(() => {
    const allShortcuts = [
      ...navigationShortcuts,
      ...actionShortcuts,
      ...searchShortcuts,
      ...systemShortcuts
    ]

    allShortcuts.forEach(shortcut => {
      shortcutsRef.current.set(shortcut.key, shortcut)
    })
  }, [router])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement).contentEditable === 'true'
    ) {
      return
    }

    const normalizedBase =
      event.key.length === 1 ? event.key.toLowerCase() : event.key

    const hasCmdOrCtrl = event.metaKey || event.ctrlKey
    const modifier = hasCmdOrCtrl ? (isMac.current ? 'cmd' : 'ctrl') : undefined
    const modifier2 = event.shiftKey ? 'shift' : undefined
    const modifier3 = event.altKey ? 'alt' : undefined

    let shortcutKey = normalizedBase
    if (modifier) shortcutKey = `${modifier}+${shortcutKey}`
    if (modifier2) shortcutKey = `${shortcutKey}+${modifier2}`
    if (modifier3) shortcutKey = `${shortcutKey}+${modifier3}`

    const keysToTry = [shortcutKey]
    if (hasCmdOrCtrl)
      keysToTry.push(normalizedBase)
    if (hasCmdOrCtrl && event.shiftKey && normalizedBase === 'f')
      keysToTry.unshift('cmd+shift+f')

    let shortcut: KeyboardShortcut | undefined
    for (const k of keysToTry) {
      const candidate = shortcutsRef.current.get(k)
      if (candidate && shortcutModifiersSatisfied(candidate, event)) {
        shortcut = candidate
        break
      }
    }

    if (shortcut && !shortcut.disabled) {
      event.preventDefault()
      shortcut.action()
    }
  }, [])

  // Register keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Register custom shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcutsRef.current.set(shortcut.key, shortcut)
  }, [])

  // Unregister shortcut
  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key)
  }, [])

  // Show shortcuts help
  const showShortcuts = useCallback(() => {
    const event = new CustomEvent('showKeyboardShortcuts')
    window.dispatchEvent(event)
  }, [])

  // Get all shortcuts for display
  const getAllShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values())
  }, [])

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback((category: string) => {
    return Array.from(shortcutsRef.current.values())
      .filter(shortcut => shortcut.category === category)
  }, [])

  return {
    shortcuts: getAllShortcuts(),
    registerShortcut,
    unregisterShortcut,
    showShortcuts,
    getShortcutsByCategory,
    isMac: isMac.current
  }
}

// Hook for context-specific shortcuts
export function useContextShortcuts(context: string, shortcuts: KeyboardShortcut[]) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()

  useEffect(() => {
    // Register context-specific shortcuts
    shortcuts.forEach(shortcut => {
      const contextKey = `${context}:${shortcut.key}`
      registerShortcut({
        ...shortcut,
        key: contextKey,
        global: false
      })
    })

    // Cleanup on unmount
    return () => {
      shortcuts.forEach(shortcut => {
        const contextKey = `${context}:${shortcut.key}`
        unregisterShortcut(contextKey)
      })
    }
  }, [context, shortcuts, registerShortcut, unregisterShortcut])
}

// Hook for form shortcuts
export function useFormShortcuts(onSave?: () => void, onCancel?: () => void) {
  const formShortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      modifier: 'cmd',
      description: 'Save form',
      action: onSave || (() => {}),
      category: 'actions',
      global: false
    },
    {
      key: 'Escape',
      description: 'Cancel form',
      action: onCancel || (() => {}),
      category: 'actions',
      global: false
    }
  ]

  useContextShortcuts('form', formShortcuts)
}

// Hook for table shortcuts
export function useTableShortcuts(
  onSelectAll?: () => void,
  onDeselectAll?: () => void,
  onDelete?: () => void,
  onRefresh?: () => void
) {
  const tableShortcuts: KeyboardShortcut[] = [
    {
      key: 'a',
      modifier: 'cmd',
      description: 'Select all rows',
      action: onSelectAll || (() => {}),
      category: 'actions',
      global: false
    },
    {
      key: 'd',
      modifier: 'cmd',
      description: 'Deselect all rows',
      action: onDeselectAll || (() => {}),
      category: 'actions',
      global: false
    },
    {
      key: 'Delete',
      description: 'Delete selected',
      action: onDelete || (() => {}),
      category: 'actions',
      global: false
    },
    {
      key: 'r',
      modifier: 'cmd',
      description: 'Refresh table',
      action: onRefresh || (() => {}),
      category: 'actions',
      global: false
    }
  ]

  useContextShortcuts('table', tableShortcuts)
} 