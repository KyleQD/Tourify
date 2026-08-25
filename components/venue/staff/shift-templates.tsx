'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, Clock, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ShiftTemplatesProps {
  venueId: string
}

interface TemplateRow {
  id: string
  template_name?: string | null
  department?: string | null
  start_time?: string | null
  end_time?: string | null
  staff_needed?: number | null
}

/**
 * VEN-116 — template UI reads the canonical venue_shift_templates table
 * (RLS-scoped). Recurrence service integration continues in VEN-116 phase 2;
 * this replaces the hardcoded sample grid with real persisted rows.
 */
export function ShiftTemplates({ venueId }: ShiftTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!venueId) return
    setIsRefreshing(true)
    setError(null)
    try {
      const { data, error: queryError } = await supabase
        .from('venue_shift_templates')
        .select('id, template_name, department, start_time, end_time, staff_needed')
        .eq('venue_id', venueId)
        .order('name', { ascending: true })
        .limit(50)

      if (queryError) throw queryError
      setTemplates((data ?? []) as unknown as TemplateRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shift Templates</h3>
          <p className="text-sm text-muted-foreground">
            Reusable shift blueprints used when publishing schedules
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isRefreshing}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No shift templates saved yet. Templates created through scheduling will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.template_name || 'Untitled template'}</CardTitle>
                  {template.department && <Badge variant="secondary">{template.department}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {(template.start_time || template.end_time) && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {template.start_time ?? '—'} – {template.end_time ?? '—'}
                    </span>
                  </div>
                )}
                {template.staff_needed != null && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>{template.staff_needed} staff needed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* VEN-116 phase 2 (recurrence service + create UI) is tracked separately. */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Settings className="h-3 w-3" />
        Template creation arrives with the recurrence service.
      </p>
    </div>
  )
}
