'use client'

import { useEffect } from 'react'

interface ArticleViewTrackerProps {
  articleId: string
}

export function ArticleViewTracker({ articleId }: ArticleViewTrackerProps) {
  useEffect(() => {
    if (!articleId || typeof window === 'undefined') return

    const storageKey = `tourify:article-view:${articleId}`
    try {
      if (sessionStorage.getItem(storageKey)) return
      sessionStorage.setItem(storageKey, '1')
    } catch {
      // sessionStorage may be unavailable; still count the view once per mount
    }

    void fetch(`/api/pulse/articles/${articleId}/engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
      keepalive: true,
    }).catch(() => {
      // Non-blocking analytics beacon
    })
  }, [articleId])

  return null
}
