"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, ArrowRight, Calendar, Check, FileText, Info, RefreshCw, Upload, Users, X } from "lucide-react"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"

// Mock data for connected platforms
const connectedPlatforms = [
  {
    id: "eventbrite",
    name: "Eventbrite",
    logo: "/placeholder.svg?key=rxgpq",
    description: "Export attendance data back to Eventbrite",
    connected: true,
    lastSync: "2023-05-01T14:30:00Z",
    supportsExport: true,
    exportCapabilities: ["attendance", "check-in", "custom-fields"],
  },
  {
    id: "ticketmaster",
    name: "Ticketmaster",
    logo: "/placeholder.svg?key=gss0k",
    description: "Export attendance data to Ticketmaster",
    connected: false,
    supportsExport: true,
    exportCapabilities: ["attendance", "check-in"],
  },
  {
    id: "showclix",
    name: "ShowClix",
    logo: "/placeholder.svg?key=893yr",
    description: "Export attendance data to ShowClix",
    connected: false,
    supportsExport: true,
    exportCapabilities: ["attendance"],
  },
]

// Mock data for events
const events = [
  {
    id: "evt-001",
    title: "Summer Jazz Festival",
    date: "2023-05-15T19:00:00Z",
    platform: "eventbrite",
    platformEventId: "eb-123456",
    attendees: 450,
    checkedIn: 380,
  },
  {
    id: "evt-002",
    title: "Rock Night with The Amplifiers",
    date: "2023-06-22T20:00:00Z",
    platform: "eventbrite",
    platformEventId: "eb-789012",
    attendees: 380,
    checkedIn: 310,
  },
  {
    id: "evt-003",
    title: "Classical Symphony Orchestra",
    date: "2023-07-05T18:30:00Z",
    platform: "eventbrite",
    platformEventId: "eb-345678",
    attendees: 320,
    checkedIn: 290,
  },
]

// Mock data for export history
const exportHistory = [
  {
    id: "exp-001",
    eventId: "evt-001",
    eventTitle: "Summer Jazz Festival",
    platform: "Eventbrite",
    exportDate: "2023-05-16T10:30:00Z",
    recordsExported: 380,
    status: "success",
  },
  {
    id: "exp-002",
    eventId: "evt-002",
    eventTitle: "Rock Night with The Amplifiers",
    platform: "Eventbrite",
    exportDate: "2023-06-23T09:15:00Z",
    recordsExported: 310,
    status: "success",
  },
  {
    id: "exp-003",
    eventId: "evt-003",
    eventTitle: "Classical Symphony Orchestra",
    platform: "Eventbrite",
    exportDate: "2023-07-06T11:45:00Z",
    recordsExported: 290,
    status: "partial",
    errors: 12,
  },
]

// Mock data for field mapping
const fieldMappingOptions = [
  { id: "name", label: "Full Name" },
  { id: "email", label: "Email Address" },
  { id: "phone", label: "Phone Number" },
  { id: "ticketType", label: "Ticket Type" },
  { id: "ticketId", label: "Ticket ID" },
  { id: "checkedIn", label: "Check-in Status" },
  { id: "checkInTime", label: "Check-in Time" },
  { id: "notes", label: "Notes" },
  { id: "customField1", label: "Custom Field 1" },
  { id: "customField2", label: "Custom Field 2" },
]

// Platform field mapping
const platformFields = {
  eventbrite: [
    { id: "eb_name", label: "Attendee Name" },
    { id: "eb_email", label: "Email" },
    { id: "eb_phone", label: "Phone" },
    { id: "eb_ticket_class", label: "Ticket Class" },
    { id: "eb_barcode", label: "Barcode" },
    { id: "eb_checked_in", label: "Checked In" },
    { id: "eb_check_in_time", label: "Check-in Time" },
    { id: "eb_notes", label: "Internal Notes" },
    { id: "eb_custom_question_1", label: "Custom Question 1" },
    { id: "eb_custom_question_2", label: "Custom Question 2" },
  ],
  ticketmaster: [
    { id: "tm_name", label: "Attendee Name" },
    { id: "tm_email", label: "Email Address" },
    { id: "tm_phone", label: "Phone Number" },
    { id: "tm_ticket_type", label: "Ticket Type" },
    { id: "tm_ticket_id", label: "Ticket ID" },
    { id: "tm_checked_in", label: "Check-in Status" },
    { id: "tm_check_in_time", label: "Check-in Time" },
    { id: "tm_notes", label: "Notes" },
  ],
  showclix: [
    { id: "sc_name", label: "Name" },
    { id: "sc_email", label: "Email" },
    { id: "sc_ticket_type", label: "Ticket Type" },
    { id: "sc_ticket_id", label: "Ticket ID" },
    { id: "sc_checked_in", label: "Checked In" },
  ],
}

export default function ExportAttendanceData() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("export")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [exportSettings, setExportSettings] = useState({
    includeAllAttendees: true,
    onlyCheckedIn: false,
    includeCustomFields: true,
    overwriteExistingData: false,
    sendNotifications: false,
  })
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    name: "eb_name",
    email: "eb_email",
    phone: "eb_phone",
    ticketType: "eb_ticket_class",
    ticketId: "eb_barcode",
    checkedIn: "eb_checked_in",
    checkInTime: "eb_check_in_time",
    notes: "eb_notes",
    customField1: "eb_custom_question_1",
    customField2: "eb_custom_question_2",
  })
  const [exportInProgress, setExportInProgress] = useState(false)
  const [exportPreview, setExportPreview] = useState(false)

  // Get the selected platform object
  const platform = connectedPlatforms.find((p) => p.id === selectedPlatform)

  // Get the selected event object
  const event = events.find((e) => e.id === selectedEvent)

  // Handle platform selection
  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatform(platformId)

    // Reset field mapping based on selected platform
    if (platformId && platformFields[platformId as keyof typeof platformFields]) {
      const defaultMapping: Record<string, string> = {}
      fieldMappingOptions.forEach((field) => {
        const platformField = platformFields[platformId as keyof typeof platformFields][0]
        if (platformField) {
          defaultMapping[field.id] = platformField.id
        }
      })
      setFieldMapping(defaultMapping)
    }

    // Filter events for this platform
    const platformEvents = events.filter((e) => e.platform === platformId)
    if (platformEvents.length > 0) {
      setSelectedEvent(platformEvents[0].id)
    } else {
      setSelectedEvent(null)
    }
  }

  // Handle export button click
  const handleExport = () => {
    if (!selectedPlatform || !selectedEvent) {
      toast({
        title: "Export Failed",
        description: "Please select a platform and event to export data.",
        variant: "destructive",
      })
      return
    }

    setExportInProgress(true)

    // Simulate export process
    toast({
      title: "Export Started",
      description: `Exporting attendance data to ${platform?.name}. This may take a few moments.`,
    })

    // Simulate API call with timeout
    setTimeout(() => {
      setExportInProgress(false)

      toast({
        title: "Export Successful",
        description: `Successfully exported attendance data to ${platform?.name}.`,
      })

      // Update the export history (in a real app, this would come from the API)
      // For this demo, we'll just simulate it
      setActiveTab("history")
    }, 2000)
  }

  // Handle field mapping change
  const handleFieldMappingChange = (ourField: string, platformField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [ourField]: platformField,
    }))
  }

  // Toggle export preview
  const handleTogglePreview = () => {
    setExportPreview(!exportPreview)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Export Attendance Data</h2>
        <p className="text-muted-foreground">Send attendance and check-in data back to your ticketing platforms</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        {/* Export Data Tab */}
        <TabsContent value="export" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Platform & Event</CardTitle>
                <CardDescription>Choose where to export your attendance data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="platform">Ticketing Platform</Label>
                  <Select value={selectedPlatform || ""} onValueChange={handleSelectPlatform}>
                    <SelectTrigger id="platform" className="mt-1">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedPlatforms
                        .filter((p) => p.connected)
                        .map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex items-center">
                              <img
                                src={platform.logo || "/placeholder.svg"}
                                alt={`${platform.name} logo`}
                                className="h-5 w-5 mr-2 rounded"
                              />
                              {platform.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!connectedPlatforms.some((p) => p.connected) && (
                    <p className="text-sm text-amber-500 mt-2 flex items-center">
                      <Info className="h-4 w-4 mr-1" />
                      No connected platforms. Please connect a platform first.
                    </p>
                  )}
                </div>

                {selectedPlatform && (
                  <div>
                    <Label htmlFor="event">Event</Label>
                    <Select value={selectedEvent || ""} onValueChange={setSelectedEvent}>
                      <SelectTrigger id="event" className="mt-1">
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events
                          .filter((event) => event.platform === selectedPlatform)
                          .map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              <div className="flex flex-col">
                                <span>{event.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatSafeDate(event.date)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {events.filter((event) => event.platform === selectedPlatform).length === 0 && (
                      <p className="text-sm text-amber-500 mt-2 flex items-center">
                        <Info className="h-4 w-4 mr-1" />
                        No events found for this platform.
                      </p>
                    )}
                  </div>
                )}

                {selectedEvent && (
                  <div className="bg-gray-800 p-4 rounded-md mt-4">
                    <h3 className="font-medium mb-2">Event Summary</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{event ? formatSafeDate(event.date) : ""}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{event ? event.attendees : 0} attendees</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{event ? event.checkedIn : 0} checked in</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>ID: {event ? event.platformEventId : ""}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Settings</CardTitle>
                <CardDescription>Configure what data to export</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="includeAllAttendees">Include All Attendees</Label>
                    <p className="text-sm text-muted-foreground">Export data for all registered attendees</p>
                  </div>
                  <Switch
                    id="includeAllAttendees"
                    checked={exportSettings.includeAllAttendees}
                    onCheckedChange={(checked) =>
                      setExportSettings({
                        ...exportSettings,
                        includeAllAttendees: checked,
                        onlyCheckedIn: checked ? false : exportSettings.onlyCheckedIn,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="onlyCheckedIn">Only Checked-In Attendees</Label>
                    <p className="text-sm text-muted-foreground">Export data only for attendees who checked in</p>
                  </div>
                  <Switch
                    id="onlyCheckedIn"
                    checked={exportSettings.onlyCheckedIn}
                    disabled={exportSettings.includeAllAttendees}
                    onCheckedChange={(checked) => setExportSettings({ ...exportSettings, onlyCheckedIn: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="includeCustomFields">Include Custom Fields</Label>
                    <p className="text-sm text-muted-foreground">Export custom field data collected during check-in</p>
                  </div>
                  <Switch
                    id="includeCustomFields"
                    checked={exportSettings.includeCustomFields}
                    onCheckedChange={(checked) =>
                      setExportSettings({ ...exportSettings, includeCustomFields: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="overwriteExistingData">Overwrite Existing Data</Label>
                    <p className="text-sm text-muted-foreground">Replace existing data in the ticketing platform</p>
                  </div>
                  <Switch
                    id="overwriteExistingData"
                    checked={exportSettings.overwriteExistingData}
                    onCheckedChange={(checked) =>
                      setExportSettings({ ...exportSettings, overwriteExistingData: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sendNotifications">Send Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify attendees about check-in status updates</p>
                  </div>
                  <Switch
                    id="sendNotifications"
                    checked={exportSettings.sendNotifications}
                    onCheckedChange={(checked) => setExportSettings({ ...exportSettings, sendNotifications: checked })}
                  />
                </div>

                {exportSettings.sendNotifications && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Notification Preview</AlertTitle>
                    <AlertDescription>
                      Attendees will receive an email notification with their check-in status and event details.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleTogglePreview}>
                  {exportPreview ? "Hide Preview" : "Preview Export"}
                </Button>
                <Button onClick={handleExport} disabled={!selectedPlatform || !selectedEvent || exportInProgress}>
                  {exportInProgress ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Export to {platform?.name}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Export Preview */}
          {exportPreview && selectedEvent && selectedPlatform && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Export Preview</CardTitle>
                <CardDescription>Preview of data that will be exported to {platform?.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        {Object.entries(fieldMapping)
                          .filter(([ourField]) => {
                            if (
                              !exportSettings.includeCustomFields &&
                              (ourField === "customField1" || ourField === "customField2")
                            ) {
                              return false
                            }
                            return true
                          })
                          .map(([ourField, platformField]) => {
                            const ourFieldLabel = fieldMappingOptions.find((f) => f.id === ourField)?.label
                            const platformFieldObj = platformFields[
                              selectedPlatform as keyof typeof platformFields
                            ].find((f) => f.id === platformField)

                            return (
                              <th
                                key={ourField}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                              >
                                {platformFieldObj?.label || "Unmapped"}
                                {ourFieldLabel && (
                                  <span className="block text-gray-400 normal-case font-normal">{ourFieldLabel}</span>
                                )}
                              </th>
                            )
                          })}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                      {/* Sample data rows */}
                      <tr>
                        <td className="px-4 py-3 text-sm">John Smith</td>
                        <td className="px-4 py-3 text-sm">john@example.com</td>
                        <td className="px-4 py-3 text-sm">555-123-4567</td>
                        <td className="px-4 py-3 text-sm">VIP</td>
                        <td className="px-4 py-3 text-sm">VIP-001</td>
                        <td className="px-4 py-3 text-sm">Yes</td>
                        <td className="px-4 py-3 text-sm">2023-05-15 18:30</td>
                        <td className="px-4 py-3 text-sm">Arrived early</td>
                        {exportSettings.includeCustomFields && (
                          <>
                            <td className="px-4 py-3 text-sm">T-shirt size: L</td>
                            <td className="px-4 py-3 text-sm">Dietary: Vegetarian</td>
                          </>
                        )}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-sm">Jane Doe</td>
                        <td className="px-4 py-3 text-sm">jane@example.com</td>
                        <td className="px-4 py-3 text-sm">555-987-6543</td>
                        <td className="px-4 py-3 text-sm">General</td>
                        <td className="px-4 py-3 text-sm">GEN-042</td>
                        <td className="px-4 py-3 text-sm">Yes</td>
                        <td className="px-4 py-3 text-sm">2023-05-15 19:15</td>
                        <td className="px-4 py-3 text-sm"></td>
                        {exportSettings.includeCustomFields && (
                          <>
                            <td className="px-4 py-3 text-sm">T-shirt size: M</td>
                            <td className="px-4 py-3 text-sm">Dietary: None</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  This is a preview of the first few records. The actual export will include
                  {exportSettings.includeAllAttendees
                    ? ` all ${event?.attendees || 0} attendees`
                    : exportSettings.onlyCheckedIn
                      ? ` only the ${event?.checkedIn || 0} checked-in attendees`
                      : ` selected attendees`}
                  .
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="mapping" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping Configuration</CardTitle>
              <CardDescription>
                Map your attendance data fields to the corresponding fields in your ticketing platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform || ""} onValueChange={handleSelectPlatform}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedPlatforms
                        .filter((p) => p.connected && p.supportsExport)
                        .map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex items-center">
                              <img
                                src={platform.logo || "/placeholder.svg"}
                                alt={`${platform.name} logo`}
                                className="h-5 w-5 mr-2 rounded"
                              />
                              {platform.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlatform ? (
                  <>
                    <Separator />

                    <div className="rounded-md border">
                      <div className="p-4 bg-gray-800">
                        <h3 className="font-medium">Field Mapping for {platform?.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Map your data fields to the corresponding fields in {platform?.name}
                        </p>
                      </div>

                      <div className="p-4 space-y-4">
                        {fieldMappingOptions.map((field) => (
                          <div key={field.id} className="grid grid-cols-3 gap-4 items-center">
                            <div>
                              <Label>{field.label}</Label>
                              <p className="text-xs text-muted-foreground">Your field</p>
                            </div>

                            <div className="text-center">
                              <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                            </div>

                            <div>
                              <Select
                                value={fieldMapping[field.id] || ""}
                                onValueChange={(value) => handleFieldMappingChange(field.id, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select platform field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Do not export</SelectItem>
                                  {platformFields[selectedPlatform as keyof typeof platformFields].map(
                                    (platformField) => (
                                      <SelectItem key={platformField.id} value={platformField.id}>
                                        {platformField.label}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button>Save Mapping Configuration</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Select a platform to configure field mapping</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>History of attendance data exports to ticketing platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No export history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exportHistory.map((exportItem) => (
                    <div key={exportItem.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-md">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`rounded-full p-2 ${
                            exportItem.status === "success"
                              ? "bg-green-900/20 text-green-400"
                              : exportItem.status === "partial"
                                ? "bg-amber-900/20 text-amber-400"
                                : "bg-red-900/20 text-red-400"
                          }`}
                        >
                          {exportItem.status === "success" ? (
                            <Check className="h-4 w-4" />
                          ) : exportItem.status === "partial" ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{exportItem.eventTitle}</h4>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="mr-2">{exportItem.platform}</span>
                            <span>•</span>
                            <span className="ml-2">
                              {formatSafeDate(exportItem.exportDate)}{" "}
                              {formatSafeTime(exportItem.exportDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{exportItem.recordsExported} records</div>
                        <div className="text-sm text-muted-foreground">
                          {exportItem.status === "success"
                            ? "Completed successfully"
                            : exportItem.status === "partial"
                              ? `Completed with ${exportItem.errors} errors`
                              : "Failed"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
