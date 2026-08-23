"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/**
 * VEN-097 — booking policies & notification settings panel, extracted from
 * the monolithic page. Controlled component; persistence stays with the page.
 */

export interface BookingSettingsState {
  leadTime: string
  maxAdvance: string
  autoApprove: string
  notificationEmail: string
  responseTemplate: string
  rejectionTemplate: string
}

interface BookingSettingsPanelProps {
  values: BookingSettingsState
  isSaving: boolean
  onChange: (patch: Partial<BookingSettingsState>) => void
  onSave: () => void
}

export function BookingSettingsPanel({ values, isSaving, onChange, onSave }: BookingSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Settings</CardTitle>
        <CardDescription>Configure your venue&apos;s booking preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h4 className="font-medium">Booking Policies</h4>

            <div className="space-y-2">
              <Label htmlFor="lead-time">Minimum Lead Time</Label>
              <Select value={values.leadTime} onValueChange={(v) => onChange({ leadTime: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="3days">3 Days</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="2weeks">2 Weeks</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-advance">Maximum Advance Booking</Label>
              <Select value={values.maxAdvance} onValueChange={(v) => onChange({ maxAdvance: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select maximum advance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3months">3 Months</SelectItem>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="2years">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auto-approve">Auto-Approval Settings</Label>
              <Select value={values.autoApprove} onValueChange={(v) => onChange({ autoApprove: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select auto-approval policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Review (Recommended)</SelectItem>
                  <SelectItem value="trusted">Trusted Clients Only</SelectItem>
                  <SelectItem value="small">Small Events (&lt;50 people)</SelectItem>
                  <SelectItem value="all">All Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Notifications</h4>

            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                id="notification-email"
                type="email"
                placeholder="bookings@yourvenue.com"
                value={values.notificationEmail}
                onChange={(e) => onChange({ notificationEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="response-template">Default Response Template</Label>
              <Textarea
                id="response-template"
                value={values.responseTemplate}
                onChange={(e) => onChange({ responseTemplate: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-template">Rejection Template</Label>
              <Textarea
                id="rejection-template"
                value={values.rejectionTemplate}
                onChange={(e) => onChange({ rejectionTemplate: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
