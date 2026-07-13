"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useActingContext } from '@/hooks/use-acting-context'

export default function BlogReaderPage() {
  const params = useParams()
  const router = useRouter()
  const { actingHeaders, isActingReady } = useActingContext()
  const id = params?.id as string
  const [message, setMessage] = useState('Opening article…')

  useEffect(() => {
    if (!id) {
      router.replace('/artist/features/blog')
      return
    }

    if (!isActingReady) return

    let aborted = false

    async function redirectToCanonical() {
      try {
        const response = await fetch(`/api/pulse/articles/${id}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...actingHeaders,
          },
        })
        const data = await response.json()
        if (aborted) return

        if (!response.ok || !data.success || !data.article) {
          setMessage('Article not found')
          router.replace('/artist/features/blog')
          return
        }

        if (data.article.status === 'published' && data.article.slug) {
          router.replace(`/blog/${data.article.slug}`)
          return
        }

        router.replace(`/artist/features/blog?edit=${encodeURIComponent(id)}`)
      } catch {
        if (!aborted) {
          setMessage('Unable to open article')
          router.replace('/artist/features/blog')
        }
      }
    }

    redirectToCanonical()
    return () => {
      aborted = true
    }
  }, [id, router, actingHeaders, isActingReady])

  return <div className="p-6 text-gray-400" role="status">{message}</div>
}
