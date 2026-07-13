'use client'

import { Briefcase, X, Check, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkMode } from '@/hooks/use-work-mode'

/**
 * Work Mode Widget — shows the user's pending/confirmed employment assignments
 * and lets them activate Work Mode for an active shift.
 */
export function WorkModeWidget() {
  const router = useRouter()
  const {
    assignments,
    activeAssignment,
    isInWorkMode,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
  } = useWorkMode()

  if (assignments.length === 0 && !isInWorkMode) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative h-8 px-3 rounded-full border transition-colors ${
            isInWorkMode
              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-100 hover:bg-indigo-600/40'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
          }`}
        >
          <Briefcase className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs font-medium">
            {isInWorkMode ? activeAssignment?.role_title ?? 'Work Mode' : 'Shifts'}
          </span>
          {assignments.some((a) => a.status === 'invited') && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 bg-slate-900 border-slate-700 p-2" align="end">
        {isInWorkMode && activeAssignment && (
          <>
            <div className="mb-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{activeAssignment.role_title}</div>
                  {activeAssignment.department && (
                    <div className="text-xs text-indigo-300">{activeAssignment.department}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-indigo-300 hover:bg-indigo-700/50 hover:text-white"
                  onClick={deactivateWorkMode}
                  title="Exit Work Mode"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-1 text-xs text-indigo-400">Work Mode active</div>
              {activeAssignment.href && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 w-full justify-start px-0 text-xs text-indigo-200 hover:text-white"
                  onClick={() => router.push(activeAssignment.href!)}
                >
                  <ExternalLink className="mr-1.5 h-3 w-3" />
                  Open worker map
                </Button>
              )}
            </div>
            <DropdownMenuSeparator className="my-1 bg-slate-700" />
          </>
        )}

        <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wide text-slate-400">
          Your Assignments
        </DropdownMenuLabel>

        {assignments.map((assignment) => {
          const isActive = assignment.id === activeAssignment?.id
          return (
            <DropdownMenuItem
              key={assignment.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800"
              onSelect={(e) => {
                e.preventDefault()
                if (isActive) {
                  deactivateWorkMode()
                  return
                }
                activateWorkMode(assignment.id)
                if (assignment.publication_type === 'site_map' && assignment.href)
                  router.push(assignment.href)
              }}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{assignment.role_title}</div>
                {assignment.department && (
                  <div className="text-xs text-slate-400">{assignment.department}</div>
                )}
                {assignment.source === 'publication' && (
                  <div className="mt-0.5 text-xs text-indigo-300">Published work package</div>
                )}
              </div>

              <Badge
                variant="secondary"
                className={`px-1.5 py-0.5 text-xs ${
                  assignment.status === 'active'
                    ? 'bg-green-500/20 text-green-300'
                    : assignment.status === 'confirmed'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {assignment.status}
              </Badge>

              {assignment.status === 'invited' && assignment.source !== 'publication' && (
                <div className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-green-400 hover:bg-green-500/20"
                    title="Accept assignment"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await confirmAssignment(assignment.id)
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/20"
                    title="Decline assignment"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await declineAssignment(assignment.id)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
