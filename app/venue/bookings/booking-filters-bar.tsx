"use client"

import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Search } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

/**
 * VEN-097 — booking pipeline filter bar, extracted from the monolithic page.
 * Purely controlled: every value + change handler comes from the page state
 * so URL/state semantics stay in one place.
 */

export interface BookingFiltersState {
  searchTerm: string
  statusFilter: string
  eventTypeFilter: string
  genreFilter: string
  dateFilter?: Date
}

interface BookingFiltersBarProps {
  values: BookingFiltersState
  isLifecycleAvailable: boolean
  onChange: (patch: Partial<BookingFiltersState>) => void
  onClear: () => void
}

export function BookingFiltersBar({ values, isLifecycleAvailable, onChange, onClear }: BookingFiltersBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                placeholder="Search by event name or contact..."
                value={values.searchTerm}
                onChange={(e) => onChange({ searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="min-w-[120px]">
            <Label>Status</Label>
            <Select value={values.statusFilter} onValueChange={(v) => onChange({ statusFilter: v })}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {isLifecycleAvailable ? (
                  <>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </>
                )}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Label>Event Type</Label>
            <Select value={values.eventTypeFilter} onValueChange={(v) => onChange({ eventTypeFilter: v })}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Label>Genre</Label>
            <Select value={values.genreFilter} onValueChange={(v) => onChange({ genreFilter: v })}>
              <SelectTrigger>
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                <SelectItem value="edm">EDM</SelectItem>
                <SelectItem value="hiphop">Hip-Hop</SelectItem>
                <SelectItem value="rock">Rock</SelectItem>
                <SelectItem value="jazz">Jazz</SelectItem>
                <SelectItem value="pop">Pop</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Label>Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {values.dateFilter ? format(values.dateFilter, "PPP") : "Any date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={values.dateFilter}
                  onSelect={(d) => onChange({ dateFilter: d })}
                  initialFocus
                />
                {values.dateFilter && (
                  <div className="p-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => onChange({ dateFilter: undefined })} className="w-full">
                      Clear Date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={onClear}>
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
