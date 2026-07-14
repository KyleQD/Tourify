'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCrossPlatformPosting } from '@/hooks/use-cross-platform-posting'
import { toast } from 'sonner'

interface HashtagGroupsPanelProps {
  onUseInComposer?: (tags: string[]) => void
}

export function HashtagGroupsPanel({ onUseInComposer }: HashtagGroupsPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { hashtagGroups, createHashtagGroup } = useCrossPlatformPosting()
  const [groupName, setGroupName] = useState('')
  const [category, setCategory] = useState('general')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const addTag = () => {
    const clean = tagInput.replace('#', '').trim()
    if (!clean || tags.includes(clean)) return
    setTags(prev => [...prev, clean])
    setTagInput('')
  }

  const onCreate = async () => {
    if (!groupName || tags.length === 0) return
    setSubmitting(true)
    try {
      await createHashtagGroup(groupName, tags, { category })
      setGroupName('')
      setTags([])
      setCategory('general')
      toast.success('Hashtag group created')
    } finally {
      setSubmitting(false)
    }
  }

  function useGroup(groupTags: string[]) {
    if (onUseInComposer) {
      onUseInComposer(groupTags)
      return
    }
    const params = new URLSearchParams()
    params.set('tab', 'compose')
    params.set('hashtags', groupTags.join(','))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    toast.success('Opening composer with hashtags')
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/5">
      <CardHeader>
        <CardTitle className="text-slate-200">Hashtag Groups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label>Group name</Label>
            <Input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g., tour-launch"
              className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
            />
            <Label>Category</Label>
            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['general', 'promotion', 'announcement', 'event', 'personal', 'business'].map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="#Add hashtag"
                onKeyDown={e => (e.key === 'Enter' ? addTag() : undefined)}
                className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
              />
              <Button variant="outline" className="border-slate-700/50 rounded-xl" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
            <Button onClick={onCreate} disabled={submitting || !groupName || tags.length === 0} className="rounded-xl">
              {submitting ? 'Saving...' : 'Create group'}
            </Button>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-slate-300 font-medium">Existing</h4>
            {hashtagGroups.length === 0 ? (
              <p className="text-sm text-slate-400">No groups yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hashtagGroups.map(g => (
                  <div key={g.id} className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-200">{g.group_name}</div>
                      <Badge variant="outline">{g.category}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.hashtags.map(h => (
                        <Badge key={h} variant="secondary" className="text-xs">
                          #{h}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 rounded-xl border-slate-700"
                      onClick={() => useGroup(g.hashtags)}
                    >
                      Use in composer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default HashtagGroupsPanel
