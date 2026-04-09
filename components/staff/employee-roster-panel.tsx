"use client"

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, ShieldCheck, UserCheck, Users } from 'lucide-react'

interface EmployeeRow {
  id: string
  user_id?: string | null
  name: string
  email?: string | null
  role?: string | null
  department?: string | null
  status?: string | null
  onboarding?: {
    status?: string
    stage?: string
    progress?: number
  } | null
  compliance: {
    agreements_accepted: number
    pending_docs: number
    expiring_docs_30_days: number
  }
}

interface EmployeeRosterPanelProps {
  venueId: string
}

export function EmployeeRosterPanel({ venueId }: EmployeeRosterPanelProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_leave' | 'terminated'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!venueId) return
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const params = new URLSearchParams({
          venue_id: venueId,
          limit: String(limit),
          page: String(page),
        })
        if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim())
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (departmentFilter !== 'all') params.set('department', departmentFilter)
        const response = await fetch(
          `/api/staffing/employees?${params.toString()}`,
          { cache: 'no-store' }
        )
        const payload = await response.json()
        if (!response.ok || !payload?.success)
          throw new Error(payload?.error || 'Failed to load roster')
        if (!cancelled) {
          setRows(payload.data || [])
          setTotal(payload?.pagination?.total || 0)
        }
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || 'Failed to load roster')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [venueId, debouncedQuery, page, statusFilter, departmentFilter])

  const filteredRows = useMemo(() => {
    return rows
  }, [rows])

  const uniqueDepartments = useMemo(() => {
    const set = new Set(rows.map((row) => row.department).filter(Boolean))
    return Array.from(set) as string[]
  }, [rows])

  const selectedEmployee = useMemo(
    () =>
      filteredRows.find((row) => row.id === selectedEmployeeId) ||
      filteredRows[0] ||
      null,
    [filteredRows, selectedEmployeeId]
  )

  return (
    <Card className="border-slate-700 bg-slate-900/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-violet-400" />
            Employee roster
          </CardTitle>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => {
                  setPage(1)
                  setQuery(event.target.value)
                }}
                placeholder="Search staff..."
                className="border-slate-700 bg-slate-800/80 pl-9 text-white placeholder:text-slate-500"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: any) => {
                setPage(1)
                setStatusFilter(value)
              }}
            >
              <SelectTrigger className="border-slate-700 bg-slate-800/80 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={departmentFilter}
              onValueChange={(value) => {
                setPage(1)
                setDepartmentFilter(value)
              }}
            >
              <SelectTrigger className="border-slate-700 bg-slate-800/80 text-white">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {uniqueDepartments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading roster...
          </div>
        ) : error ? (
          <p className="text-sm text-amber-300">{error}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-400">No matching employees.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              {filteredRows.map((row) => {
                const isSelected = selectedEmployee?.id === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(row.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      isSelected
                        ? 'border-violet-500/60 bg-violet-900/20'
                        : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{row.name}</p>
                        <p className="text-xs text-slate-400">
                          {[row.role, row.department].filter(Boolean).join(' · ') || 'Unassigned role'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-slate-700 text-slate-100 capitalize">
                        {row.status || 'unknown'}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedEmployee ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-3">
                <p className="font-semibold text-white">{selectedEmployee.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedEmployee.email || 'No email'} · {selectedEmployee.role || 'No role'}
                </p>

                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Status timeline</p>
                  <div className="flex items-center justify-between rounded border border-slate-700 px-2 py-1 text-xs">
                    <span className="text-slate-300">Onboarding</span>
                    <span className="text-indigo-300">
                      {selectedEmployee.onboarding
                        ? `${selectedEmployee.onboarding.status || 'in_progress'} (${selectedEmployee.onboarding.progress || 0}%)`
                        : 'not linked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-slate-700 px-2 py-1 text-xs">
                    <span className="text-slate-300">Agreements</span>
                    <span className="text-emerald-300">
                      {selectedEmployee.compliance.agreements_accepted > 0
                        ? `${selectedEmployee.compliance.agreements_accepted} accepted`
                        : 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-slate-700 px-2 py-1 text-xs">
                    <span className="text-slate-300">Verification docs</span>
                    <span className="text-amber-300">
                      {selectedEmployee.compliance.pending_docs} pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-slate-700 px-2 py-1 text-xs">
                    <span className="text-slate-300">Expiring credentials</span>
                    <span className="text-cyan-300">
                      {selectedEmployee.compliance.expiring_docs_30_days} in 30 days
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="border-emerald-600/30 bg-emerald-900/30 text-emerald-200">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Compliance linked
                  </Badge>
                  <Badge className="border-cyan-600/30 bg-cyan-900/30 text-cyan-200">
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    Profile synced
                  </Badge>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!isLoading && total > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-400">
            <span>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-800 text-slate-200"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-800 text-slate-200"
                disabled={page * limit >= total}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
