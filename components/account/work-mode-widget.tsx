'use client'

import { Briefcase, X, Check } from 'lucide-react'
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
 *
 * This replaces the old "staff" switcher type. Hiring is done through the
 * jobs / onboarding system; Work Mode is a transient overlay on the general
 * account, not a separate entity in the switcher.
 */
export function WorkModeWidget() {
  const {
    assignments,
    activeAssignment,
    isInWorkMode,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
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
          {assignments.some(a => a.status === 'invited') && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72 bg-slate-900 border-slate-700 p-2" align="end">
        {isInWorkMode && activeAssignment && (
          <>
            <div className="px-3 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 mb-2">
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
                  className="h-6 w-6 p-0 text-indigo-300 hover:text-white hover:bg-indigo-700/50"
                  onClick={deactivateWorkMode}
                  title="Exit Work Mode"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="text-xs text-indigo-400 mt-1">Work Mode active</div>
            </div>
            <DropdownMenuSeparator className="bg-slate-700 my-1" />
          </>
        )}

        <DropdownMenuLabel className="text-slate-400 text-xs uppercase tracking-wide px-2 py-1">
          Your Assignments
        </DropdownMenuLabel>

        {assignments.map(assignment => {
          const isActive = assignment.id === activeAssignment?.id
          return (
            <DropdownMenuItem
              key={assignment.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              onSelect={e => {
                e.preventDefault()
                if (isActive) {
                  deactivateWorkMode()
                } else {
                  activateWorkMode(assignment.id)
                }
              }}
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{assignment.role_title}</div>
                {assignment.department && (
                  <div className="text-xs text-slate-400">{assignment.department}</div>
                )}
              </div>

              <Badge
                variant="secondary"
                className={`text-xs px-1.5 py-0.5 ${
                  assignment.status === 'active'
                    ? 'bg-green-500/20 text-green-300'
                    : assignment.status === 'confirmed'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {assignment.status}
              </Badge>

              {assignment.status === 'invited' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-green-400 hover:bg-green-500/20"
                  title="Accept assignment"
                  onClick={async e => {
                    e.stopPropagation()
                    await confirmAssignment(assignment.id)
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}

              {isActive && <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
            </DropdownMenuItem>
          )
        })}

        {assignments.length === 0 && (
          <p className="text-xs text-slate-500 px-3 py-2 text-center">No assignments found.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
