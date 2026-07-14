"use client"

import { useState } from "react"
import { Clock, Copy, LayoutTemplate, Pencil, Plus, Users, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/scheduling/ui/card"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  departmentAccent,
  formatTime,
  shiftTypeMeta,
  type ShiftTemplate,
} from "@/components/admin/scheduling/scheduling-data"

export function TemplatesView() {
  const { data, openCreateTemplate, goToCreate } = useScheduling()
  const [query, setQuery] = useState("")

  const templates = data.templates.filter((t) =>
    query.trim() ? `${t.name} ${t.department} ${t.role}`.toLowerCase().includes(query.toLowerCase()) : true,
  )

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-border/60 bg-card/70 py-0 backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Shift templates</h2>
            <p className="text-xs text-muted-foreground">
              Reusable presets for recurring roles. Apply one to prefill a new shift.
            </p>
          </div>
          <Button
            onClick={() => openCreateTemplate()}
            className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85"
          >
            <Plus data-icon="inline-start" />
            New template
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onUse={() => goToCreate({ template: tpl })}
            onEdit={() => openCreateTemplate(tpl)}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  onUse,
  onEdit,
}: {
  template: ShiftTemplate
  onUse: () => void
  onEdit: () => void
}) {
  const accent = departmentAccent[template.department]

  return (
    <Card className="group flex flex-col border-border/60 bg-card/70 py-0 backdrop-blur transition-colors hover:border-neon-purple/40">
      <CardHeader className="flex-row items-start justify-between gap-2 p-4">
        <div className="flex items-start gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accent.bg, accent.text)}>
            <LayoutTemplate className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{template.name}</CardTitle>
            <p className="truncate text-[11px] text-muted-foreground">
              {template.role} · {shiftTypeMeta[template.shiftType]}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", accent.border, accent.text)}>
          {template.department}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {formatTime(template.startTime)}–{formatTime(template.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3" /> {template.neededStaffCount} crew
          </span>
          <span className="flex items-center gap-1">
            <Zap className="size-3 text-neon-amber" /> Used {template.useCount}×
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.requiredSkills.map((s) => (
            <span key={s} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {s}
            </span>
          ))}
        </div>

        <p className="line-clamp-2 text-[11px] text-muted-foreground">{template.defaultNotes}</p>

        <div className="mt-auto flex items-center gap-2 border-t border-border/50 pt-3">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onUse}>
            <Copy data-icon="inline-start" />
            Use template
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Edit template" onClick={onEdit}>
            <Pencil />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
