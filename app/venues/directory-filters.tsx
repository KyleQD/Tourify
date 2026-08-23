"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { VENUE_TYPE_TAXONOMY, amenityLabel } from "@/lib/venue/settings-shapes"

/**
 * VEN-285 — responsive directory filters.
 *
 * Every control writes URL search params (server-rendered results stay
 * shareable/indexable and work before hydration). Active chips + reset +
 * live result count; mobile gets an accessible dialog sheet.
 */

interface DirectoryFiltersProps {
  params: Record<string, string>
  total: number
}

const FILTER_AMENITIES = [
  "ada_accessible",
  "wifi",
  "parking",
  "green_room",
  "loading_dock",
  "sound_system",
  "lighting_system",
  "bar_service",
  "food_service",
  "security",
] as const

const FILTER_KEYS = ["type", "city", "min_capacity", "max_capacity", "amenities", "bookable"] as const

export function DirectoryFilters({ params, total }: DirectoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedTypes = params.type ? [params.type] : []
  const selectedAmenities = (params.amenities ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)

  const apply = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString())
    mutate(next)
    next.delete("page")
    startTransition(() => {
      router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
        scroll: false,
      })
    })
  }

  const setValue = (key: string, value: string | null) => {
    apply((next) => {
      if (value === null || value === "") next.delete(key)
      else next.set(key, value)
    })
  }

  const toggleListValue = (key: string, value: string) => {
    apply((next) => {
      const current = (next.get(key) ?? "").split(",").map((v) => v.trim()).filter(Boolean)
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      if (updated.length > 0) next.set(key, updated.join(","))
      else next.delete(key)
    })
  }

  const resetAll = () => {
    apply((next) => {
      for (const key of FILTER_KEYS) next.delete(key)
    })
  }

  const activeChips: { key: string; value: string; label: string }[] = []
  if (params.q) activeChips.push({ key: "q", value: params.q, label: `"${params.q}"` })
  if (params.type) activeChips.push({ key: "type", value: params.type, label: params.type })
  if (params.city) activeChips.push({ key: "city", value: params.city, label: `Near ${params.city}` })
  if (params.min_capacity)
    activeChips.push({ key: "min_capacity", value: params.min_capacity, label: `≥ ${params.min_capacity} cap.` })
  if (params.max_capacity)
    activeChips.push({ key: "max_capacity", value: params.max_capacity, label: `≤ ${params.max_capacity} cap.` })
  for (const a of selectedAmenities)
    activeChips.push({ key: "amenities", value: a, label: amenityLabel(a) })
  if (params.bookable === "true")
    activeChips.push({ key: "bookable", value: "true", label: "Accepting bookings" })

  const panel = (
    <FilterPanel
      params={params}
      selectedTypes={selectedTypes}
      selectedAmenities={selectedAmenities}
      setValue={setValue}
      toggleListValue={toggleListValue}
    />
  )

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-300" aria-live="polite">
          {isPending ? "Updating results…" : `${total} ${total === 1 ? "venue" : "venues"} match`}
        </p>

        {/* Mobile: accessible filter sheet */}
        <div className="md:hidden">
          <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" aria-expanded={sheetOpen}>
                <Filter className="mr-2 h-4 w-4" aria-hidden />
                Filters
                {activeChips.filter((c) => c.key !== "q").length > 0 && (
                  <Badge className="ml-2 bg-green-600 text-white">
                    {activeChips.filter((c) => c.key !== "q").length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent
              role="dialog"
              aria-label="Venue filters"
              className="max-h-[85vh] max-w-md overflow-y-auto border-gray-700 bg-gray-900 text-white"
            >
              <DialogHeader>
                <DialogTitle>Filter venues</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Results update the shareable page address.
                </DialogDescription>
              </DialogHeader>
              {panel}
              <div className="mt-4 flex justify-between gap-3">
                <Button variant="outline" size="sm" onClick={resetAll}>
                  Reset all
                </Button>
                <Button size="sm" onClick={() => setSheetOpen(false)}>
                  Show {total} result{total === 1 ? "" : "s"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Desktop inline panel */}
        <div className="hidden md:block">{panel}</div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeChips.map((chip) => (
            <Badge
              key={`${chip.key}-${chip.value}`}
              variant="secondary"
              className="cursor-pointer border-green-600/30 bg-green-600/20 py-1 pr-1 text-xs text-green-300"
            >
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "amenities") toggleListValue("amenities", chip.value)
                  else if (chip.key === "q") setValue("q", null)
                  else setValue(chip.key, null)
                }}
                aria-label={`Remove filter ${chip.label}`}
                className="flex items-center gap-1 rounded px-1 hover:bg-green-600/30"
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-400 hover:text-white"
            onClick={resetAll}
          >
            Reset all
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterPanel({
  params,
  selectedTypes,
  selectedAmenities,
  setValue,
  toggleListValue,
}: {
  params: Record<string, string>
  selectedTypes: string[]
  selectedAmenities: string[]
  setValue: (key: string, value: string | null) => void
  toggleListValue: (key: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="space-y-1.5">
        <Label htmlFor="filter-city" className="text-xs uppercase tracking-wide text-gray-400">
          Location
        </Label>
        <Input
          id="filter-city"
          type="text"
          defaultValue={params.city ?? ""}
          placeholder="City…"
          className="border-gray-600 bg-gray-800 text-white placeholder-gray-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") setValue("city", (e.target as HTMLInputElement).value.trim() || null)
          }}
          onBlur={(e) => setValue("city", e.target.value.trim() || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-gray-400">Venue type</Label>
        <Select value={selectedTypes[0] ?? "any"} onValueChange={(v) => setValue("type", v === "any" ? null : v)}>
          <SelectTrigger aria-label="Venue type" className="border-gray-600 bg-gray-800 text-white">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent className="max-h-72 border-gray-700 bg-gray-900 text-white">
            <SelectItem value="any">Any type</SelectItem>
            {VENUE_TYPE_TAXONOMY.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="filter-min-capacity" className="text-xs uppercase tracking-wide text-gray-400">
          Capacity range
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="filter-min-capacity"
            type="number"
            min={0}
            defaultValue={params.min_capacity ?? ""}
            placeholder="Min"
            aria-label="Minimum capacity"
            className="border-gray-600 bg-gray-800 text-white placeholder-gray-500"
            onBlur={(e) => setValue("min_capacity", e.target.value || null)}
          />
          <span className="text-gray-500">–</span>
          <Input
            id="filter-max-capacity"
            type="number"
            min={0}
            defaultValue={params.max_capacity ?? ""}
            placeholder="Max"
            aria-label="Maximum capacity"
            className="border-gray-600 bg-gray-800 text-white placeholder-gray-500"
            onBlur={(e) => setValue("max_capacity", e.target.value || null)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-gray-400">Event suitability</Label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
          <Switch
            checked={params.bookable === "true"}
            onCheckedChange={(checked) => setValue("bookable", checked ? "true" : null)}
            aria-label="Only venues accepting bookings"
          />
          <span className="text-sm text-gray-200">Accepting bookings</span>
        </label>
      </div>

      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1 text-xs uppercase tracking-wide text-gray-400">
          Amenities & accessibility
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {FILTER_AMENITIES.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-2.5 text-sm text-gray-200"
            >
              <Checkbox
                checked={selectedAmenities.includes(key)}
                onCheckedChange={() => toggleListValue("amenities", key)}
                aria-label={`Filter by ${amenityLabel(key)}`}
              />
              {amenityLabel(key)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
