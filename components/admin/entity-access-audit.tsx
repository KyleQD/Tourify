"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AuditLog {
  id: string
  actor_id?: string | null
  target_user_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  action: string
  permission_name?: string | null
  created_at: string
}

export function EntityAccessAudit({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/rbac/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/audit?limit=25`, { cache: 'no-store' })
        const data = await res.json()
        if (active) setLogs(Array.isArray(data?.logs) ? data.logs : [])
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [entityType, entityId])

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Access & Audit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <div className="text-sm text-slate-400">Loading...</div> : null}
        {logs.map(log => (
          <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                {log.action}
                {log.permission_name ? <Badge className="rounded-full">{log.permission_name}</Badge> : null}
              </div>
              <div className="text-sm text-slate-400">
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(log.created_at))} • actor: {log.actor_id || 'n/a'} • target: {log.target_user_id || 'n/a'}
              </div>
            </div>
            <div className="text-xs text-slate-500">{log.entity_type}:{log.entity_id}</div>
          </div>
        ))}
        {logs.length === 0 && !isLoading ? <div className="text-sm text-slate-400">No recent audit entries.</div> : null}
      </CardContent>
    </Card>
  )
}


