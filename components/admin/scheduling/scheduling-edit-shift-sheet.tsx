"use client"

import { useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/admin/scheduling/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  ShiftFormFields,
  emptyShiftForm,
  type ShiftFormState,
} from "@/components/admin/scheduling/scheduling-shift-form"

export function EditShiftSheet() {
  const { data, editShift, closeEdit, deleteShift, updateShift } = useScheduling()
  const [state, setState] = useState<ShiftFormState>(emptyShiftForm)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (editShift) {
      setMessage(null)
      setState({
        ...emptyShiftForm,
        title: editShift.title,
        event: editShift.eventName,
        venue: editShift.venueName,
        department: editShift.department,
        role: editShift.role,
        shiftType: editShift.shiftType,
        priority: editShift.priority,
        date: editShift.date,
        startTime: editShift.startTime,
        endTime: editShift.endTime,
        neededStaff: String(editShift.neededStaffCount),
        requiredSkills: editShift.requiredSkills.join(", "),
        internalNotes: editShift.notes ?? "",
      })
    }
  }, [editShift])

  async function save() {
    if (!editShift) return
    setMessage(null)
    const result = await updateShift(editShift.id, {
      title: state.title,
      eventName: state.event,
      venueName: state.venue,
      department: state.department,
      role: state.role,
      shiftType: state.shiftType,
      priority: state.priority,
      date: state.date,
      startTime: state.startTime,
      endTime: state.endTime,
      breakMinutes: Number.parseInt(state.breakMinutes, 10) || 0,
      neededStaffCount: Number.parseInt(state.neededStaff, 10) || 1,
      requiredSkills: state.requiredSkills.split(",").map((skill) => skill.trim()).filter(Boolean),
      notes: state.internalNotes,
      staffInstructions: state.staffInstructions,
    })
    if (!result.ok) {
      setMessage(result.error ?? "Unable to update shift")
      return
    }
    closeEdit()
  }

  async function remove() {
    if (!editShift) return
    setMessage(null)
    const result = await deleteShift(editShift.id)
    if (!result.ok) {
      setMessage(result.error ?? "Unable to delete shift")
      return
    }
    closeEdit()
  }

  return (
    <Sheet open={!!editShift} onOpenChange={(o) => !o && closeEdit()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {editShift ? (
          <>
            <SheetHeader className="border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-neon-cyan/15 text-neon-cyan">
                  <Pencil className="size-4" />
                </span>
                <div>
                  <SheetTitle>Edit Shift</SheetTitle>
                  <SheetDescription>Update details for {editShift.title}.</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ShiftFormFields state={state} setState={setState} compact />
              {message ? <p className="mt-3 text-xs text-neon-red">{message}</p> : null}
            </div>

            <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border/60">
              <Button
                variant="outline"
                className="border-neon-red/40 text-neon-red hover:bg-neon-red/10"
                onClick={() => void remove()}
                disabled={data.saving}
              >
                <Trash2 data-icon="inline-start" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void save()}
                  disabled={data.saving}
                  className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
                >
                  Save Changes
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle className="sr-only">Edit shift</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
