"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import type {
  OpenShift,
  SchedulingConflict,
  Shift,
  ShiftTemplate,
  StaffMember,
} from "@/components/admin/scheduling/scheduling-data"
import {
  useSchedulingData,
  type PersistShiftInput,
  type SchedulingDataState,
  type SchedulingMode,
  type SchedulingMutationResult,
} from "@/components/admin/scheduling/use-scheduling-data"

export type SchedulingView =
  | "board"
  | "create"
  | "management"
  | "staff"
  | "availability"
  | "open"
  | "conflicts"
  | "publish"
  | "templates"

export interface CreatePrefill {
  date?: string
  template?: ShiftTemplate
}

export interface AssignTarget {
  id: string
  title: string
  role: string
  department: string
  eventName: string
  venueName: string
  date: string
  startTime: string
  endTime: string
  requiredSkills: string[]
}

interface SchedulingContextValue {
  data: SchedulingDataState

  view: SchedulingView
  setView: (view: SchedulingView) => void

  createPrefill: CreatePrefill | null
  goToCreate: (prefill?: CreatePrefill) => void

  detailsShift: Shift | null
  openDetails: (shift: Shift) => void
  closeDetails: () => void

  editShift: Shift | null
  openEdit: (shift: Shift) => void
  closeEdit: () => void

  assignTarget: AssignTarget | null
  openAssign: (target: AssignTarget) => void
  closeAssign: () => void

  profileStaff: StaffMember | null
  openProfile: (staff: StaffMember) => void
  closeProfile: () => void

  resolveTarget: SchedulingConflict | null
  openResolve: (conflict: SchedulingConflict) => void
  closeResolve: () => void

  templateDraft: ShiftTemplate | null
  createTemplateOpen: boolean
  openCreateTemplate: (template?: ShiftTemplate) => void
  closeCreateTemplate: () => void

  publishOpen: boolean
  openPublish: () => void
  closePublish: () => void

  createShift: (input: PersistShiftInput) => Promise<SchedulingMutationResult>
  updateShift: (shiftId: string, input: PersistShiftInput) => Promise<SchedulingMutationResult>
  updateShiftStatus: (
    shiftId: string,
    status: "scheduled" | "confirmed" | "completed" | "cancelled",
    options?: { notify?: boolean }
  ) => Promise<SchedulingMutationResult>
  deleteShift: (shiftId: string) => Promise<SchedulingMutationResult>
  assignStaff: (shiftId: string, staffIds: string[]) => Promise<SchedulingMutationResult>
  publishShifts: (shiftIds: string[], options?: { notify?: boolean }) => Promise<SchedulingMutationResult>
}

const SchedulingContext = createContext<SchedulingContextValue | null>(null)

export function toAssignTarget(shift: Shift | OpenShift): AssignTarget {
  return {
    id: shift.id,
    title: "title" in shift ? shift.title : `${shift.role} — ${shift.eventName}`,
    role: shift.role,
    department: shift.department,
    eventName: shift.eventName,
    venueName: shift.venueName,
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    requiredSkills: "requiredSkills" in shift ? shift.requiredSkills : [],
  }
}

export function SchedulingProvider({
  children,
  employer,
  initialEventId,
  initialVenueId,
  initialMode,
}: {
  children: ReactNode
  employer?: unknown
  initialEventId?: string | null
  initialVenueId?: string | null
  initialMode?: SchedulingMode | null
}) {
  const data = useSchedulingData(employer, initialEventId, initialVenueId, initialMode)
  const [view, setView] = useState<SchedulingView>("board")
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null)

  const [detailsShift, setDetailsShift] = useState<Shift | null>(null)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null)
  const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null)
  const [resolveTarget, setResolveTarget] = useState<SchedulingConflict | null>(null)
  const [templateDraft, setTemplateDraft] = useState<ShiftTemplate | null>(null)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const value = useMemo<SchedulingContextValue>(
    () => ({
      data,
      view,
      setView,
      createPrefill,
      goToCreate: (prefill) => {
        setCreatePrefill(prefill ?? null)
        setView("create")
      },
      detailsShift,
      openDetails: setDetailsShift,
      closeDetails: () => setDetailsShift(null),
      editShift,
      openEdit: setEditShift,
      closeEdit: () => setEditShift(null),
      assignTarget,
      openAssign: setAssignTarget,
      closeAssign: () => setAssignTarget(null),
      profileStaff,
      openProfile: setProfileStaff,
      closeProfile: () => setProfileStaff(null),
      resolveTarget,
      openResolve: setResolveTarget,
      closeResolve: () => setResolveTarget(null),
      templateDraft,
      createTemplateOpen,
      openCreateTemplate: (template) => {
        setTemplateDraft(template ?? null)
        setCreateTemplateOpen(true)
      },
      closeCreateTemplate: () => setCreateTemplateOpen(false),
      publishOpen,
      openPublish: () => setPublishOpen(true),
      closePublish: () => setPublishOpen(false),
      createShift: data.createShift,
      updateShift: data.updateShift,
      updateShiftStatus: data.updateShiftStatus,
      deleteShift: data.deleteShift,
      assignStaff: data.assignStaff,
      publishShifts: data.publishShifts,
    }),
    [
      data,
      view,
      createPrefill,
      detailsShift,
      editShift,
      assignTarget,
      profileStaff,
      resolveTarget,
      templateDraft,
      createTemplateOpen,
      publishOpen,
    ],
  )

  return <SchedulingContext.Provider value={value}>{children}</SchedulingContext.Provider>
}

export function useScheduling() {
  const ctx = useContext(SchedulingContext)
  if (!ctx) throw new Error("useScheduling must be used within a SchedulingProvider")
  return ctx
}
