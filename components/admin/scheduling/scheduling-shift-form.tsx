"use client"

import type { Dispatch, SetStateAction } from "react"

import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/admin/scheduling/ui/field"
import { Input } from "@/components/admin/scheduling/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/scheduling/ui/select"
import { Textarea } from "@/components/admin/scheduling/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/admin/scheduling/ui/tabs"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  DEPARTMENTS,
  ROLES,
  shiftTypeMeta,
  type Priority,
  type ShiftType,
} from "@/components/admin/scheduling/scheduling-data"

export interface ShiftFormState {
  title: string
  event: string
  venue: string
  department: string
  role: string
  shiftType: ShiftType
  priority: Priority
  date: string
  startTime: string
  endTime: string
  breakMinutes: string
  repeat: boolean
  repeatMode: string
  neededStaff: string
  requiredSkills: string
  internalNotes: string
  staffInstructions: string
  callTime: string
  loadIn: string
  uniform: string
  contact: string
}

export const emptyShiftForm: ShiftFormState = {
  title: "",
  event: "",
  venue: "",
  department: "",
  role: "",
  shiftType: "event",
  priority: "medium",
  date: "2026-07-08",
  startTime: "16:00",
  endTime: "23:00",
  breakMinutes: "30",
  repeat: false,
  repeatMode: "weekly",
  neededStaff: "1",
  requiredSkills: "",
  internalNotes: "",
  staffInstructions: "",
  callTime: "",
  loadIn: "",
  uniform: "",
  contact: "",
}

interface ShiftFormFieldsProps {
  state: ShiftFormState
  setState: Dispatch<SetStateAction<ShiftFormState>>
  compact?: boolean
}

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"]
const SHIFT_TYPES: ShiftType[] = ["event", "venue", "tour", "operations"]

export function ShiftFormFields({ state, setState, compact }: ShiftFormFieldsProps) {
  const { data } = useScheduling()
  const eventOptions = data.events.length > 0 ? data.events.map((event) => event.name) : []
  const venueOptions = data.venues.length > 0 ? data.venues.map((venue) => venue.name) : []

  function set<K extends keyof ShiftFormState>(key: K, value: ShiftFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Shift basics */}
      <FieldSet>
        <FieldLegend>Shift basics</FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="sf-title">Shift title</FieldLabel>
            <Input
              id="sf-title"
              value={state.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Main Stage Deck"
            />
          </Field>

          <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
            <Field>
              <FieldLabel>Event</FieldLabel>
              <FormSelect value={state.event} onChange={(v) => set("event", v)} placeholder="Select event" options={eventOptions} />
            </Field>
            <Field>
              <FieldLabel>Venue / location</FieldLabel>
              <FormSelect value={state.venue} onChange={(v) => set("venue", v)} placeholder="Select venue" options={venueOptions} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Department</FieldLabel>
              <FormSelect value={state.department} onChange={(v) => set("department", v)} placeholder="Dept" options={DEPARTMENTS} />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <FormSelect value={state.role} onChange={(v) => set("role", v)} placeholder="Role" options={[...ROLES]} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Shift type</FieldLabel>
              <FormSelect
                value={state.shiftType}
                onChange={(v) => set("shiftType", v as ShiftType)}
                placeholder="Type"
                options={SHIFT_TYPES}
                render={(o) => shiftTypeMeta[o as ShiftType]}
              />
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <FormSelect
                value={state.priority}
                onChange={(v) => set("priority", v as Priority)}
                placeholder="Priority"
                options={PRIORITIES}
                render={(o) => o.charAt(0).toUpperCase() + o.slice(1)}
              />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      {/* Date and time */}
      <FieldSet>
        <FieldLegend>Date &amp; time</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sf-date">Date</FieldLabel>
              <Input id="sf-date" type="date" value={state.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="sf-break">Break (min)</FieldLabel>
              <Input
                id="sf-break"
                type="number"
                min={0}
                value={state.breakMinutes}
                onChange={(e) => set("breakMinutes", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sf-start">Start time</FieldLabel>
              <Input id="sf-start" type="time" value={state.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="sf-end">End time</FieldLabel>
              <Input id="sf-end" type="time" value={state.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </Field>
          </div>
          <FieldDescription>Timezone: America/Los_Angeles (PT)</FieldDescription>
          <Field orientation="horizontal">
            <RepeatToggle checked={state.repeat} onChange={(v) => set("repeat", v)} />
          </Field>
          {state.repeat ? (
            <Field>
              <FieldLabel>Repeat</FieldLabel>
              <FormSelect
                value={state.repeatMode}
                onChange={(v) => set("repeatMode", v)}
                placeholder="Repeat"
                options={["daily", "weekly", "custom", "until-date"]}
                render={(o) => o.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              />
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      {/* Staffing needs */}
      <FieldSet>
        <FieldLegend>Staffing needs</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sf-needed">Needed staff count</FieldLabel>
              <Input
                id="sf-needed"
                type="number"
                min={1}
                value={state.neededStaff}
                onChange={(e) => set("neededStaff", e.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="sf-skills">Required skills / credentials</FieldLabel>
            <Input
              id="sf-skills"
              value={state.requiredSkills}
              onChange={(e) => set("requiredSkills", e.target.value)}
              placeholder="e.g. Rigging, First Aid, SIA License"
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      {/* Notes and instructions */}
      <FieldSet>
        <FieldLegend>Notes &amp; instructions</FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="sf-internal">Internal notes</FieldLabel>
            <Textarea
              id="sf-internal"
              rows={2}
              value={state.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              placeholder="Visible to admins only."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sf-instructions">Staff-facing instructions</FieldLabel>
            <Textarea
              id="sf-instructions"
              rows={2}
              value={state.staffInstructions}
              onChange={(e) => set("staffInstructions", e.target.value)}
              placeholder="Shared with assigned crew."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sf-call">Call time notes</FieldLabel>
              <Input id="sf-call" value={state.callTime} onChange={(e) => set("callTime", e.target.value)} placeholder="Arrive 30m early" />
            </Field>
            <Field>
              <FieldLabel htmlFor="sf-loadin">Parking / load-in</FieldLabel>
              <Input id="sf-loadin" value={state.loadIn} onChange={(e) => set("loadIn", e.target.value)} placeholder="Dock B, lot 3" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="sf-uniform">Uniform</FieldLabel>
              <Input id="sf-uniform" value={state.uniform} onChange={(e) => set("uniform", e.target.value)} placeholder="All black, crew laminate" />
            </Field>
            <Field>
              <FieldLabel htmlFor="sf-contact">Contact person</FieldLabel>
              <Input id="sf-contact" value={state.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Stage Manager" />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>
    </div>
  )
}

interface FormSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: string[]
  render?: (option: string) => string
}

function FormSelect({ value, onChange, placeholder, options, render }: FormSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {render ? render(option) : option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function FieldDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>
}

function RepeatToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Tabs value={checked ? "on" : "off"} onValueChange={(v) => onChange(v === "on")} className="w-full">
      <div className="flex items-center justify-between">
        <FieldLabel>Repeat shift</FieldLabel>
        <TabsList>
          <TabsTrigger value="off">Off</TabsTrigger>
          <TabsTrigger value="on">On</TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  )
}
