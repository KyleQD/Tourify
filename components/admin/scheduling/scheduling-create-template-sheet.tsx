"use client"

import { useEffect, useState } from "react"
import { LayoutTemplate } from "lucide-react"

import { Button } from "@/components/admin/scheduling/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/admin/scheduling/ui/field"
import { Input } from "@/components/admin/scheduling/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin/scheduling/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { Textarea } from "@/components/admin/scheduling/ui/textarea"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { DEPARTMENTS, ROLES } from "@/components/admin/scheduling/scheduling-data"

interface TemplateFormState {
  name: string
  department: string
  role: string
  startTime: string
  endTime: string
  neededStaff: string
  requiredSkills: string
  defaultNotes: string
  instructions: string
}

const empty: TemplateFormState = {
  name: "",
  department: "",
  role: "",
  startTime: "17:00",
  endTime: "23:00",
  neededStaff: "2",
  requiredSkills: "",
  defaultNotes: "",
  instructions: "",
}

export function CreateTemplateSheet() {
  const { createTemplateOpen, closeCreateTemplate, templateDraft } = useScheduling()
  const [state, setState] = useState<TemplateFormState>(empty)

  useEffect(() => {
    if (createTemplateOpen) {
      setState(
        templateDraft
          ? {
              name: `${templateDraft.name} (copy)`,
              department: templateDraft.department,
              role: templateDraft.role,
              startTime: templateDraft.startTime,
              endTime: templateDraft.endTime,
              neededStaff: String(templateDraft.neededStaffCount),
              requiredSkills: templateDraft.requiredSkills.join(", "),
              defaultNotes: templateDraft.defaultNotes,
              instructions: templateDraft.instructions,
            }
          : empty,
      )
    }
  }, [createTemplateOpen, templateDraft])

  function set<K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Sheet open={createTemplateOpen} onOpenChange={(o) => !o && closeCreateTemplate()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-neon-green/15 text-neon-green">
              <LayoutTemplate className="size-4" />
            </span>
            <div>
              <SheetTitle>{templateDraft ? "Edit Template" : "Create Template"}</SheetTitle>
              <SheetDescription>Reusable shift preset for fast scheduling.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="tpl-name">Template name</FieldLabel>
              <Input
                id="tpl-name"
                value={state.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Standard Concert Load-In"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Department</FieldLabel>
                <TplSelect value={state.department} onChange={(v) => set("department", v)} placeholder="Dept" options={DEPARTMENTS} />
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <TplSelect value={state.role} onChange={(v) => set("role", v)} placeholder="Role" options={[...ROLES]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="tpl-start">Default start</FieldLabel>
                <Input id="tpl-start" type="time" value={state.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-end">Default end</FieldLabel>
                <Input id="tpl-end" type="time" value={state.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tpl-needed">Needed staff count</FieldLabel>
              <Input
                id="tpl-needed"
                type="number"
                min={1}
                value={state.neededStaff}
                onChange={(e) => set("neededStaff", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-skills">Required skills</FieldLabel>
              <Input
                id="tpl-skills"
                value={state.requiredSkills}
                onChange={(e) => set("requiredSkills", e.target.value)}
                placeholder="Comma separated"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-notes">Default notes</FieldLabel>
              <Textarea id="tpl-notes" rows={2} value={state.defaultNotes} onChange={(e) => set("defaultNotes", e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-instructions">Staff-facing instructions</FieldLabel>
              <Textarea
                id="tpl-instructions"
                rows={2}
                value={state.instructions}
                onChange={(e) => set("instructions", e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-border/60">
          <Button variant="ghost" onClick={closeCreateTemplate}>
            Cancel
          </Button>
          <Button onClick={closeCreateTemplate} className="bg-neon-green/90 text-primary-foreground hover:bg-neon-green">
            {templateDraft ? "Save Template" : "Create Template"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface TplSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: string[]
}

function TplSelect({ value, onChange, placeholder, options }: TplSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
