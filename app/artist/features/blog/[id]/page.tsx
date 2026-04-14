"use client"

import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TrackEmbed } from '@/components/blog/renderers/track-embed'

export default function BlogReaderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let aborted = false
    async function load() {
      try {
        const { data, error } = await supabase
          .from('artist_blog_posts')
          .select('*')
          .eq('id', id)
          .single()
        if (!aborted) setPost(data)
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [id, supabase])

  const blocks = useMemo(() => {
    if (!post?.content) return [] as Array<{ type: 'text' | 'track'; value: string }>
    const parts: Array<{ type: 'text' | 'track'; value: string }> = []
    const regex = /\[track:([^\]]+)\]/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(post.content)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'text', value: post.content.slice(lastIndex, match.index) })
      parts.push({ type: 'track', value: match[1] })
      lastIndex = regex.lastIndex
    }
    if (lastIndex < post.content.length) parts.push({ type: 'text', value: post.content.slice(lastIndex) })
    return parts
  }, [post])

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>
  if (!post) return <div className="p-6 text-gray-400">Post not found</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.back()} className="border-slate-700 text-gray-300">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-white">{post.title}</h1>
      </div>
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">{post.excerpt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-white/90">
          {blocks.map((b, i) => (
            b.type === 'track' ? (
              <TrackEmbed key={i} id={b.value} />
            ) : (
              <p key={i} className="whitespace-pre-wrap">{b.value}</p>
            )
          ))}
        </CardContent>
      </Card>
    </div>
  )
}


