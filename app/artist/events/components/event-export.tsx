"use client"

import { supabase } from "@/lib/supabase"
import { useState } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Download, FileText, Calendar } from "lucide-react"
import { format } from "date-fns"

interface Event {
  id: string
  title: string
  description?: string
  type: 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_country?: string
  event_date: string
  start_time?: string
  end_time?: string
  doors_open?: string
  ticket_url?: string
  ticket_price_min?: number
  ticket_price_max?: number
  capacity?: number
  expected_attendance?: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  is_public: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface ExportOptions {
  format: 'csv' | 'json' | 'ics'
  dateRange: 'all' | 'upcoming' | 'past' | 'current_year'
  includePrivate: boolean
  fields: {
    basic: boolean
    venue: boolean
    timing: boolean
    tickets: boolean
    notes: boolean
  }
}

export default function EventExport() {
  const { user } = useArtist()
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'all',
    includePrivate: true,
    fields: {
      basic: true,
      venue: true,
      timing: true,
      tickets: false,
      notes: false
    }
  })

  const handleExport = async () => {
    if (!user) return

    try {
      setIsExporting(true)
      
      // Build query based on date range
      let query = supabase
        .from('artist_events')
        .select('*')
        .eq('user_id', user.id)
      
      const now = new Date()
      switch (options.dateRange) {
        case 'upcoming':
          query = query.gte('event_date', now.toISOString().split('T')[0])
          break
        case 'past':
          query = query.lt('event_date', now.toISOString().split('T')[0])
          break
        case 'current_year':
          const yearStart = new Date(now.getFullYear(), 0, 1)
          const yearEnd = new Date(now.getFullYear(), 11, 31)
          query = query
            .gte('event_date', yearStart.toISOString().split('T')[0])
            .lte('event_date', yearEnd.toISOString().split('T')[0])
          break
      }

      if (!options.includePrivate) {
        query = query.eq('is_public', true)
      }

      const { data: events, error } = await query.order('event_date', { ascending: true })
      
      if (error) throw error
      
      if (!events || events.length === 0) {
        toast.error('No events found matching your criteria')
        return
      }

      // Process data based on selected fields
      const processedData = events.map(event => {
        const processed: any = {}
        
        if (options.fields.basic) {
          processed.title = event.title
          processed.description = event.description || ''
          processed.type = event.type
          processed.status = event.status
          processed.is_public = event.is_public
          processed.event_date = event.event_date
        }
        
        if (options.fields.venue) {
          processed.venue_name = event.venue_name || ''
          processed.venue_address = event.venue_address || ''
          processed.venue_city = event.venue_city || ''
          processed.venue_state = event.venue_state || ''
          processed.venue_country = event.venue_country || ''
        }
        
        if (options.fields.timing) {
          processed.start_time = event.start_time || ''
          processed.end_time = event.end_time || ''
          processed.doors_open = event.doors_open || ''
        }
        
        if (options.fields.tickets) {
          processed.ticket_url = event.ticket_url || ''
          processed.ticket_price_min = event.ticket_price_min || ''
          processed.ticket_price_max = event.ticket_price_max || ''
          processed.capacity = event.capacity || ''
          processed.expected_attendance = event.expected_attendance || ''
        }
        
        if (options.fields.notes) {
          processed.notes = event.notes || ''
        }
        
        return processed
      })

      // Export based on format
      switch (options.format) {
        case 'csv':
          exportToCSV(processedData)
          break
        case 'json':
          exportToJSON(processedData)
          break
        case 'ics':
          exportToICS(events)
          break
      }
      
      toast.success(`Events exported successfully as ${options.format.toUpperCase()}`)
      setIsOpen(false)
    } catch (error) {
      console.error('Error exporting events:', error)
      toast.error('Failed to export events')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = (data: any[]) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        }).join(',')
      )
    ].join('\n')

    downloadFile(csvContent, 'events.csv', 'text/csv')
  }

  const exportToJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2)
    downloadFile(jsonContent, 'events.json', 'application/json')
  }

  const exportToICS = (events: Event[]) => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Artist Events//EN',
      'CALSCALE:GREGORIAN',
      ...events.flatMap(event => [
        'BEGIN:VEVENT',
        `UID:${event.id}@artist-events`,
        `DTSTART:${format(new Date(event.event_date + (event.start_time ? `T${event.start_time}` : 'T00:00')), "yyyyMMdd'T'HHmmss")}`,
        `DTEND:${format(new Date(event.event_date + (event.end_time ? `T${event.end_time}` : 'T23:59')), "yyyyMMdd'T'HHmmss")}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
        event.venue_name ? `LOCATION:${[event.venue_name, event.venue_address, event.venue_city, event.venue_state].filter(Boolean).join(', ')}` : '',
        `STATUS:${event.status.toUpperCase()}`,
        `CREATED:${format(new Date(event.created_at), "yyyyMMdd'T'HHmmss'Z'")}`,
        `LAST-MODIFIED:${format(new Date(event.updated_at), "yyyyMMdd'T'HHmmss'Z'")}`,
        'END:VEVENT'
      ].filter(Boolean)),
      'END:VCALENDAR'
    ].join('\r\n')

    downloadFile(icsContent, 'events.ics', 'text/calendar')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-700 text-gray-300 hover:text-white">
          <Download className="h-4 w-4 mr-2" />
          Export Events
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Export Events</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300">Export Format</Label>
            <Select 
              value={options.format} 
              onValueChange={(value: 'csv' | 'json' | 'ics') => 
                setOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON (Data)
                  </div>
                </SelectItem>
                <SelectItem value="ics">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ICS (Calendar)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-gray-300">Date Range</Label>
            <Select 
              value={options.dateRange} 
              onValueChange={(value: ExportOptions['dateRange']) => 
                setOptions(prev => ({ ...prev, dateRange: value }))
              }
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="upcoming">Upcoming Events</SelectItem>
                <SelectItem value="past">Past Events</SelectItem>
                <SelectItem value="current_year">Current Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-private" className="text-gray-300">Include Private Events</Label>
              <Switch
                id="include-private"
                checked={options.includePrivate}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includePrivate: checked }))
                }
              />
            </div>
          </div>

          {/* Field Selection (only for CSV/JSON) */}
          {(options.format === 'csv' || options.format === 'json') && (
            <div className="space-y-4">
              <Label className="text-gray-300">Include Fields</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="basic-fields" className="text-sm text-gray-300">Basic Info</Label>
                  <Switch
                    id="basic-fields"
                    checked={options.fields.basic}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ 
                        ...prev, 
                        fields: { ...prev.fields, basic: checked }
                      }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="venue-fields" className="text-sm text-gray-300">Venue Details</Label>
                  <Switch
                    id="venue-fields"
                    checked={options.fields.venue}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ 
                        ...prev, 
                        fields: { ...prev.fields, venue: checked }
                      }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="timing-fields" className="text-sm text-gray-300">Timing Info</Label>
                  <Switch
                    id="timing-fields"
                    checked={options.fields.timing}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ 
                        ...prev, 
                        fields: { ...prev.fields, timing: checked }
                      }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="ticket-fields" className="text-sm text-gray-300">Ticket Info</Label>
                  <Switch
                    id="ticket-fields"
                    checked={options.fields.tickets}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ 
                        ...prev, 
                        fields: { ...prev.fields, tickets: checked }
                      }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes-fields" className="text-sm text-gray-300">Notes</Label>
                  <Switch
                    id="notes-fields"
                    checked={options.fields.notes}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ 
                        ...prev, 
                        fields: { ...prev.fields, notes: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isExporting ? 'Exporting...' : `Export ${options.format.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 