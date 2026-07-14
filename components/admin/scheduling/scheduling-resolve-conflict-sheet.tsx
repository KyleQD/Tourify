"use client"

import { useEffect, useState } from "react"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  Repeat,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Separator } from "@/components/admin/scheduling/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import { initials, priorityMeta } from "@/components/admin/scheduling/scheduling-data"

const FIXES = [
  { id: "reassign", label: "Reassign staff", icon: Repeat },
  { id: "adjust", label: "Adjust shift time", icon: Clock },
  { id: "add", label: "Add another worker", icon: Plus },
  { id: "exception", label: "Approve as exception", icon: ShieldCheck },
  { id: "cancel", label: "Cancel shift", icon: XCircle },
] as const

export function ResolveConflictSheet() {
  const { resolveTarget, closeResolve } = useScheduling()
  const [fix, setFix] = useState<string | null>(null)
  const [replacement, setReplacement] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    if (resolveTarget) {
      setFix(null)
      setReplacement(null)
      setResolved(false)
    }
  }, [resolveTarget])

  const priority = resolveTarget ? priorityMeta[resolveTarget.severity] : null

  return (
    <Sheet open={!!resolveTarget} onOpenChange={(o) => !o && closeResolve()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {resolveTarget ? (
          <>
            <SheetHeader className="border-b border-border/60">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px]", priority?.className)}>
                  {priority?.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {resolveTarget.type.replace(/-/g, " ")}
                </Badge>
              </div>
              <SheetTitle className="text-lg">{resolveTarget.title}</SheetTitle>
              <SheetDescription>{resolveTarget.detail}</SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarClock className="size-3.5" /> Affected shift
                </span>
                <p className="text-sm font-medium text-foreground">{resolveTarget.shiftTitle}</p>
                {resolveTarget.staffName ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-secondary text-[9px] font-semibold text-foreground">
                        {initials(resolveTarget.staffName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{resolveTarget.staffName}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 p-3">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-neon-cyan" />
                <p className="text-[11px] leading-relaxed text-foreground/90">
                  <span className="font-medium text-neon-cyan">Suggested: </span>
                  {resolveTarget.suggestedResolution}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Choose a fix</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {FIXES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFix(option.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        fix === option.id
                          ? "border-neon-purple/60 bg-neon-purple/10 text-foreground"
                          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      <option.icon className="size-3.5" />
                      {option.label}
                      {fix === option.id ? <CheckCircle2 className="ml-auto size-3.5 text-neon-purple" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              {fix === "reassign" && resolveTarget.suggestedReplacements.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Suggested replacement</span>
                    {resolveTarget.suggestedReplacements.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setReplacement(name)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                          replacement === name
                            ? "border-neon-green/50 bg-neon-green/10"
                            : "border-border/60 hover:border-border",
                        )}
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-secondary text-[10px] font-semibold text-foreground">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground">{name}</span>
                        {replacement === name ? (
                          <CheckCircle2 className="ml-auto size-4 text-neon-green" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {resolved ? (
                <div className="flex items-center gap-2 rounded-lg border border-neon-green/40 bg-neon-green/10 p-3 text-xs text-neon-green">
                  <CheckCircle2 className="size-4" /> Conflict marked resolved. This is a prototype — no backend changes were made.
                </div>
              ) : null}
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-border/60">
              <Button variant="ghost" onClick={closeResolve}>
                Ignore
              </Button>
              <Button
                disabled={!fix || resolved}
                onClick={() => setResolved(true)}
                className="bg-neon-green/90 text-primary-foreground hover:bg-neon-green"
              >
                <CheckCircle2 data-icon="inline-start" /> Resolve
              </Button>
            </SheetFooter>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle className="sr-only">Resolve conflict</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
