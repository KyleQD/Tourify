"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { paBtnRound } from "@/components/public-artist/public-artist-ui"

export function BookThisArtistModal({
  isOpen,
  onOpenChange,
  artistUserId,
  artistName,
  creatorType,
  serviceOfferings
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  artistUserId: string
  artistName: string
  creatorType?: string | null
  serviceOfferings?: string[]
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [performanceType, setPerformanceType] = useState("project")
  const [venue, setVenue] = useState("")
  const [location, setLocation] = useState("")
  const [performanceDate, setPerformanceDate] = useState("")
  const [compensation, setCompensation] = useState("")
  const [description, setDescription] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [requestType, setRequestType] = useState<"performance" | "collaboration">("performance")

  const submit = async () => {
    if (!venue || !location || !performanceDate || !compensation || !description) {
      toast.error("Please fill out all required fields.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artistUserId,
          email: email || undefined,
          phone: phone || undefined,
          requestType,
          bookingDetails: {
            performanceType,
            description,
            performanceDate,
            venue,
            location,
            compensation,
            additionalNotes: additionalNotes || undefined
          }
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        console.error("Booking request failed:", payload)
        toast.error("Failed to send booking request.")
        return
      }

      toast.success("Booking request sent.")
      onOpenChange(false)
      setEmail("")
      setPhone("")
      setPerformanceType("project")
      setVenue("")
      setLocation("")
      setPerformanceDate("")
      setCompensation("")
      setDescription("")
      setAdditionalNotes("")
      setRequestType("performance")
    } catch (err) {
      console.error("Booking request error:", err)
      toast.error("Failed to send booking request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-white/10 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-white">Hire or Book {artistName}</DialogTitle>
          {creatorType ? <p className="text-sm text-white/60">{creatorType} request form</p> : null}
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-white/80">Your email</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Phone (optional)</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Request category</Label>
            <Select value={requestType} onValueChange={(value: "performance" | "collaboration") => setRequestType(value)}>
              <SelectTrigger className="rounded-xl border-white/10 bg-white/5">
                <SelectValue placeholder="Select request category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Paid booking / project</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Project type</Label>
            {serviceOfferings?.length ? (
              <Select value={performanceType} onValueChange={setPerformanceType}>
                <SelectTrigger className="rounded-xl border-white/10 bg-white/5">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceOfferings.map(service => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom-project">Custom project</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="rounded-xl border-white/10 bg-white/5"
                value={performanceType}
                onChange={(e) => setPerformanceType(e.target.value)}
                placeholder="Video shoot / Photo package / Live set / Design project"
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Business / venue *</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Company, brand, or venue name"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Location *</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Target date *</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={performanceDate}
              onChange={(e) => setPerformanceDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Compensation *</Label>
            <Input
              className="rounded-xl border-white/10 bg-white/5"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              placeholder="$ / % / Guarantee"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Project scope *</Label>
            <Textarea
              className="min-h-[100px] rounded-xl border-white/10 bg-white/5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your goals, deliverables, timeline, and expectations..."
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-white/80">Additional notes</Label>
            <Textarea
              className="min-h-[80px] rounded-xl border-white/10 bg-white/5"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Soundcheck, set length, links, etc."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" className={paBtnRound} onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className={paBtnRound} onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

