"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Calendar, Loader2, Send } from "lucide-react"

interface VenueSummary {
  id: string
  venue_name: string
  city?: string
  state?: string
  capacity?: number
  capacity_total?: number
}

export default function PublicVenueBookingRequestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = String(params.slug || "")
  const [venue, setVenue] = useState<VenueSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    eventName: "",
    eventType: "performance",
    eventDate: "",
    performanceTime: "",
    duration: "120",
    expectedAttendance: "",
    budgetRange: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    requirements: "",
  })
  const draftStorageKey = slug ? `tourify:venue-booking-draft:${slug}` : ""

  useEffect(() => {
    async function loadVenue() {
      try {
        const response = await fetch(`/api/venues/${slug}`, { cache: "no-store" })
        if (!response.ok) throw new Error("Venue not found")
        const payload = await response.json()
        setVenue(payload.venue)
      } catch (error) {
        toast({
          title: "Venue unavailable",
          description: error instanceof Error ? error.message : "Could not load venue.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) void loadVenue()
  }, [slug, toast])

  useEffect(() => {
    if (!draftStorageKey) return
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey)
      if (!rawDraft) return
      const draft = JSON.parse(rawDraft)
      if (draft && typeof draft === "object") {
        setForm((current) => ({ ...current, ...draft }))
      }
    } catch {
      // Ignore invalid local drafts.
    }
  }, [draftStorageKey])

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!venue?.id) return

    setIsSubmitting(true)
    try {
      if (draftStorageKey) {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(form))
      }
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          venueId: venue.id,
          eventName: form.eventName,
          eventType: form.eventType,
          eventDate: form.eventDate,
          eventDuration: Number(form.duration) || 120,
          expectedAttendance: Number(form.expectedAttendance) || undefined,
          budgetRange: form.budgetRange || undefined,
          phone: form.contactPhone || undefined,
          email: form.contactEmail || undefined,
          requestType: form.eventType === "collaboration" ? "collaboration" : "performance",
          bookingDetails: {
            performanceType: form.eventType,
            description: form.description,
            performanceDate: form.eventDate,
            performanceTime: form.performanceTime,
            duration: form.duration,
            venue: venue.venue_name,
            location: [venue.city, venue.state].filter(Boolean).join(", ") || venue.venue_name,
            compensation: form.budgetRange || "To be discussed",
            requirements: form.requirements,
            additionalNotes: form.requirements,
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok || payload.success === false) {
        if (response.status === 401) {
          toast({
            title: "Sign in to send this request",
            description: "Your draft has been saved. Sign in and submit it when you return.",
          })
          router.push(`/login?redirectTo=${encodeURIComponent(`/venues/${slug}/booking-request`)}`)
          return
        }
        throw new Error(payload.error || "Booking request could not be submitted.")
      }

      if (draftStorageKey) window.localStorage.removeItem(draftStorageKey)
      toast({
        title: "Request sent",
        description: `${venue.venue_name} received your booking request.`,
      })
      router.push(`/venues/${slug}`)
    } catch (error) {
      toast({
        title: "Could not send request",
        description:
          error instanceof Error
            ? error.message
            : "Please sign in and confirm the booking details before trying again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <Card className="max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-zinc-300">This venue is not available for booking requests.</p>
            <Button onClick={() => router.push("/venues")} variant="outline" className="border-zinc-700">
              Browse Venues
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <Button variant="ghost" onClick={() => router.push(`/venues/${slug}`)} className="text-zinc-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to venue
        </Button>

        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="h-6 w-6 text-emerald-300" />
              Book {venue.venue_name}
            </CardTitle>
            <p className="text-sm text-zinc-400">
              Share the event basics, expected attendance, budget, and technical needs. The Venue team can review and
              respond from their booking pipeline.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eventName">Event name</Label>
                  <Input
                    id="eventName"
                    value={form.eventName}
                    onChange={(event) => updateField("eventName", event.target.value)}
                    required
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Request type</Label>
                  <Select value={form.eventType} onValueChange={(value) => updateField("eventType", value)}>
                    <SelectTrigger className="border-zinc-700 bg-zinc-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="private_event">Private event</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="collaboration">Collaboration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Date</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={form.eventDate}
                    onChange={(event) => updateField("eventDate", event.target.value)}
                    required
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="performanceTime">Start time</Label>
                  <Input
                    id="performanceTime"
                    type="time"
                    value={form.performanceTime}
                    onChange={(event) => updateField("performanceTime", event.target.value)}
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration minutes</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={30}
                    value={form.duration}
                    onChange={(event) => updateField("duration", event.target.value)}
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expectedAttendance">Expected attendance</Label>
                  <Input
                    id="expectedAttendance"
                    type="number"
                    min={0}
                    value={form.expectedAttendance}
                    onChange={(event) => updateField("expectedAttendance", event.target.value)}
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Budget or compensation</Label>
                  <Input
                    id="budgetRange"
                    value={form.budgetRange}
                    onChange={(event) => updateField("budgetRange", event.target.value)}
                    placeholder="$2,000 - $5,000"
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => updateField("contactEmail", event.target.value)}
                    required
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input
                    id="contactPhone"
                    value={form.contactPhone}
                    onChange={(event) => updateField("contactPhone", event.target.value)}
                    className="border-zinc-700 bg-zinc-950"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Event description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  required
                  rows={4}
                  className="border-zinc-700 bg-zinc-950"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Technical, hospitality, or access needs</Label>
                <Textarea
                  id="requirements"
                  value={form.requirements}
                  onChange={(event) => updateField("requirements", event.target.value)}
                  rows={3}
                  className="border-zinc-700 bg-zinc-950"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Booking Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
