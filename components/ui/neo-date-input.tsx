"use client"

import * as React from "react"
import { format, isValid, parseISO, addDays, startOfDay } from "date-fns"
import { Calendar as CalendarIcon, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const isoFromDate = (date: Date) => format(startOfDay(date), "yyyy-MM-dd")
const dateFromIso = (iso: string) => {
  const parsed = parseISO(iso)
  if (!isValid(parsed)) return undefined
  return parsed
}

type NeoDatePresets = Array<{ label: string; value: () => string }>

export interface NeoDateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value?: string
  defaultValue?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  presets?: NeoDatePresets
  align?: "start" | "center" | "end"
  className?: string
}

function defaultPresets(): NeoDatePresets {
  return [
    {
      label: "Today",
      value: () => isoFromDate(new Date()),
    },
    {
      label: "Tomorrow",
      value: () => isoFromDate(addDays(new Date(), 1)),
    },
    {
      label: "+7 days",
      value: () => isoFromDate(addDays(new Date(), 7)),
    },
  ]
}

export const NeoDateInput = React.forwardRef<HTMLInputElement, NeoDateInputProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      onBlur,
      placeholder = "Select date",
      disabled,
      required,
      presets,
      align = "start",
      className,
      id,
      name,
      min,
      max,
      ...rest
    },
    forwardedRef
  ) => {
    const [internalIso, setInternalIso] = React.useState<string>(() => {
      if (typeof value === "string") return value
      if (typeof defaultValue === "string") return defaultValue
      return ""
    })

    React.useEffect(() => {
      if (typeof value === "string") setInternalIso(value)
    }, [value])

    const selectedIso = internalIso
    const selectedDate = selectedIso ? dateFromIso(selectedIso) : undefined

    const hiddenRef = React.useRef<HTMLInputElement | null>(null)
    const setHiddenRef = (el: HTMLInputElement | null) => {
      hiddenRef.current = el
      if (typeof forwardedRef === "function") forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    }

    const triggerChange = (iso: string | undefined) => {
      const nextIso = iso ?? ""
      setInternalIso(nextIso)
      const nextValue = nextIso

      if (hiddenRef.current) {
        hiddenRef.current.value = nextValue
      }

      if (onChange) {
        onChange({
          target: {
            name,
            value: nextIso,
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>)
      }

      if (onBlur) {
        onBlur({
          target: {
            name,
            value: nextIso,
          },
        } as unknown as React.FocusEvent<HTMLInputElement>)
      }
    }

    const quickPresets = presets ?? defaultPresets()

    const [directEntry, setDirectEntry] = React.useState("")
    React.useEffect(() => {
      if (!directEntry) return
      setDirectEntry((prev) => prev.trim())
    }, [directEntry])

    const handleDirectEntryUse = () => {
      const iso = directEntry.trim()
      if (!iso) return
      if (!dateFromIso(iso)) return
      triggerChange(iso)
      setDirectEntry("")
    }

    const triggerLabel = selectedDate ? format(selectedDate, "PPP") : placeholder

    const onSelectDate = (next?: Date) => {
      if (!next) return triggerChange(undefined)
      triggerChange(isoFromDate(next))
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            id={id}
            className={cn(
              "w-full justify-start gap-2 rounded-xl border-slate-700/70 bg-slate-900/70 text-white hover:bg-slate-900/90",
              "focus-visible:ring-2 focus-visible:ring-purple-500/50",
              className
            )}
          >
            <CalendarIcon className="h-4 w-4 text-purple-300" />
            <span className={cn(!selectedDate && "text-slate-400")}>{triggerLabel}</span>
          </Button>
        </PopoverTrigger>

        {/* Hidden native input keeps form integrations (RHF register, plain form submit). */}
        <input
          ref={setHiddenRef}
          type="date"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          className="sr-only"
          value={typeof value === "string" ? value : internalIso}
          onChange={onChange}
          {...rest}
        />

        <PopoverContent
          align={align}
          className="w-auto p-0 rounded-2xl border border-slate-700/60 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl"
        >
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 p-2 text-purple-200">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">Pick a date</span>
              </div>
              {selectedDate ? (
                <span className="text-xs text-slate-400">{format(selectedDate, "yyyy-MM-dd")}</span>
              ) : (
                <span className="text-xs text-slate-400">ISO format supported</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20",
                    selectedIso === preset.value() && "bg-purple-500/20"
                  )}
                  disabled={disabled}
                  onClick={() => {
                    const iso = preset.value()
                    triggerChange(iso)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white"
                value={directEntry}
                onChange={(e) => setDirectEntry(e.target.value)}
                placeholder="YYYY-MM-DD"
                inputMode="numeric"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDirectEntryUse()
                }}
              />
              <Button
                type="button"
                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
                disabled={disabled}
                onClick={handleDirectEntryUse}
              >
                Use
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                initialFocus
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

NeoDateInput.displayName = "NeoDateInput"

