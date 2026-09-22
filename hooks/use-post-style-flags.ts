'use client'

import { useEffect, useState } from 'react'
import { type PostStyleFlags, DISABLED_POST_STYLE_FLAGS } from '@/lib/post-style-flags'
import { useAuth } from '@/hooks/use-auth'
import { useActingContext } from '@/hooks/use-acting-context'

/**
 * Client hook that resolves post-style feature flags.
 * Returns the stable disabled state on first render (no flash) and
 * updates async once the flags are fetched from the database.
 *
 * Uses the app's shared supabase singleton — no factory function needed.
 *
 * Usage:
 *   const { flags } = usePostStyleFlags()
 *   <PostCard enablePostStyles={flags.post_styles_read} ... />
 */
export function usePostStyleFlags(): { flags: PostStyleFlags; loading: boolean } {
  const { user } = useAuth()
  const { actingContextKey, actingHeaders } = useActingContext()
  const [flags, setFlags] = useState<PostStyleFlags>(DISABLED_POST_STYLE_FLAGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setFlags(DISABLED_POST_STYLE_FLAGS)
      try {
        const response = await fetch('/api/post-styles/bootstrap', {
          credentials: 'include',
          headers: actingHeaders,
        })
        if (!response.ok) throw new Error('Post style bootstrap failed')
        const payload = await response.json() as { flags?: PostStyleFlags }
        if (!cancelled) setFlags(payload.flags ?? DISABLED_POST_STYLE_FLAGS)
      } catch {
        // Network/DB failure → stay disabled (safe default)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, actingContextKey, actingHeaders])

  return { flags, loading }
}
