"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Loader2, Target, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

interface EndorsementCountMap { [skill: string]: number }

export function SkillsSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [topSkills, setTopSkills] = useState<string[]>([])
  const [endorseCounts, setEndorseCounts] = useState<EndorsementCountMap>({})

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    try {
      setLoading(true)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('skills, top_skills')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      setSkills(profile?.skills || [])
      setTopSkills(profile?.top_skills || [])

      const res = await fetch(`/api/skills/endorse?endorsed_id=${user!.id}`)
      const json = await res.json().catch(() => ({}))
      if (json.endorsements) {
        const map: EndorsementCountMap = {}
        for (const e of json.endorsements as Array<{ skill: string }>) {
          map[e.skill] = (map[e.skill] || 0) + 1
        }
        setEndorseCounts(map)
      }
    } catch (err: any) {
      console.error('Failed to load skills', err)
      toast.error('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  function toggleTop(skill: string) {
    setTopSkills(prev => {
      const exists = prev.includes(skill)
      if (exists) return prev.filter(s => s !== skill)
      if (prev.length >= 6) {
        toast.error('You can select up to 6 top skills')
        return prev
      }
      return [...prev, skill]
    })
  }

  async function save() {
    try {
      setSaving(true)
      const res = await fetch('/api/settings/skills/top', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ top_skills: topSkills })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to save top skills')
      }
      toast.success('Top skills updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save top skills')
    } finally {
      setSaving(false)
    }
  }

  const sortedSkills = useMemo(() => {
    const inTop = new Set(topSkills)
    return [...skills].sort((a, b) => {
      if (inTop.has(a) && !inTop.has(b)) return -1
      if (!inTop.has(a) && inTop.has(b)) return 1
      const ca = -(endorseCounts[a] || 0)
      const cb = -(endorseCounts[b] || 0)
      if (ca !== cb) return ca - cb
      return a.localeCompare(b)
    })
  }, [skills, topSkills, endorseCounts])

  if (loading) return (
    <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
  )

  return (
    <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5" />
          Skills & Top Skills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="text-white/70 text-sm">
            Select up to 6 top skills to show on your profile. Other users can endorse them. We display endorsement counts only.
          </div>
          <Separator className="bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSkills.map(skill => (
              <div key={skill} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <Checkbox checked={topSkills.includes(skill)} onCheckedChange={() => toggleTop(skill)} className="data-[state=checked]:bg-purple-600" />
                  <div className="text-white font-medium">{skill}</div>
                </div>
                <Badge className="text-white bg-white/10 border-white/20">
                  <Users className="h-3 w-3 mr-1" />
                  {endorseCounts[skill] || 0}
                </Badge>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Top Skills
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


