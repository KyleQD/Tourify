"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, Check, Download, FileText, Upload } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export default function ImportWizard() {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [importMethod, setImportMethod] = useState<"file" | "platform" | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [selectedEvent, setSelectedEvent] = useState("")
  const [importOptions, setImportOptions] = useState({
    includeContactInfo: true,
    includeTicketDetails: true,
    overwriteExisting: false,
    sendConfirmation: false,
  })
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle")
  const [importStats, setImportStats] = useState({
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  })

  // Mock platforms and events
  const platforms = [
    { id: "eventbrite", name: "Eventbrite" },
    { id: "ticketmaster", name: "Ticketmaster" },
    { id: "showclix", name: "ShowClix" },
  ]

  const events = [
    { id: "evt1", name: "Summer Jazz Festival", date: "2023-07-15", attendees: 450 },
    { id: "evt2", name: "Rock Night with The Amplifiers", date: "2023-06-22", attendees: 380 },
    { id: "evt3", name: "Classical Symphony Orchestra", date: "2023-08-05", attendees: 320 },
  ]

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      toast({
        title: "File Selected",
        description: `Selected file: ${file.name}`,
      })
    }
  }

  // Handle next step
  const handleNext = () => {
    if (step === 3) {
      startImport()
    } else {
      setStep(step + 1)
    }
  }

  // Handle back step
  const handleBack = () => {
    setStep(step - 1)
  }

  // Start the import process
  const startImport = () => {
    setImportStatus("importing")
    setImportProgress(0)

    // Simulate import process
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        const newProgress = prev + 10
        if (newProgress >= 100) {
          clearInterval(interval)
          setImportStatus("success")
          setImportStats({
            total: 450,
            imported: 432,
            updated: 0,
            skipped: 12,
            errors: 6,
          })
          return 100
        }
        return newProgress
      })
    }, 500)
  }

  // Handle option change
  const handleOptionChange = (option: keyof typeof importOptions, value: boolean) => {
    setImportOptions((prev) => ({
      ...prev,
      [option]: value,
    }))
  }

  // Handle download template
  const handleDownloadTemplate = () => {
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded.",
    })
  }

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Select Import Method</h3>
            <Tabs defaultValue="platform" onValueChange={(value) => setImportMethod(value as "file" | "platform")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="platform">From Ticketing Platform</TabsTrigger>
                <TabsTrigger value="file">From File Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="platform" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="platform">Select Platform</Label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger id="platform" className="mt-1">
                        <SelectValue placeholder="Choose a ticketing platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            {platform.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPlatform && (
                    <div>
                      <Label htmlFor="event">Select Event</Label>
                      <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                        <SelectTrigger id="event" className="mt-1">
                          <SelectValue placeholder="Choose an event" />
                        </SelectTrigger>
                        <SelectContent>
                          {events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              {event.name} ({formatSafeDate(event.date)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedEvent && (
                        <p className="text-sm text-muted-foreground mt-2">
                          This event has {events.find((e) => e.id === selectedEvent)?.attendees} attendees that will be
                          imported.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="file" className="pt-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-10 w-10 text-gray-400 mb-2" />
                      <h4 className="text-sm font-medium mb-1">Drag and drop your file here</h4>
                      <p className="text-xs text-muted-foreground mb-4">Supports CSV, Excel, or JSON files</p>
                      <Input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={handleFileUpload}
                      />
                      <Button size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Need a template?</p>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Configure Import Options</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeContactInfo"
                  checked={importOptions.includeContactInfo}
                  onCheckedChange={(checked) => handleOptionChange("includeContactInfo", checked as boolean)}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="includeContactInfo">Include Contact Information</Label>
                  <p className="text-sm text-muted-foreground">Import email, phone, and address details</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTicketDetails"
                  checked={importOptions.includeTicketDetails}
                  onCheckedChange={(checked) => handleOptionChange("includeTicketDetails", checked as boolean)}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="includeTicketDetails">Include Ticket Details</Label>
                  <p className="text-sm text-muted-foreground">Import ticket type, price, and purchase date</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwriteExisting"
                  checked={importOptions.overwriteExisting}
                  onCheckedChange={(checked) => handleOptionChange("overwriteExisting", checked as boolean)}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="overwriteExisting">Overwrite Existing Records</Label>
                  <p className="text-sm text-muted-foreground">
                    Update existing attendee records if they already exist
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendConfirmation"
                  checked={importOptions.sendConfirmation}
                  onCheckedChange={(checked) => handleOptionChange("sendConfirmation", checked as boolean)}
                />
                <div className="grid gap-1.5">
                  <Label htmlFor="sendConfirmation">Send Confirmation Emails</Label>
                  <p className="text-sm text-muted-foreground">Send confirmation emails to newly imported attendees</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review and Confirm</h3>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2">Import Source</h4>
                {importMethod === "platform" ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Platform:</span>{" "}
                      {platforms.find((p) => p.id === selectedPlatform)?.name}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Event:</span>{" "}
                      {events.find((e) => e.id === selectedEvent)?.name}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Attendees:</span>{" "}
                      {events.find((e) => e.id === selectedEvent)?.attendees}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">File Upload (CSV, Excel, or JSON)</p>
                )}
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2">Import Options</h4>
                <ul className="space-y-1">
                  <li className="text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {importOptions.includeContactInfo ? "Including" : "Excluding"} contact information
                  </li>
                  <li className="text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {importOptions.includeTicketDetails ? "Including" : "Excluding"} ticket details
                  </li>
                  <li className="text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {importOptions.overwriteExisting ? "Overwriting" : "Not overwriting"} existing records
                  </li>
                  <li className="text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {importOptions.sendConfirmation ? "Sending" : "Not sending"} confirmation emails
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">
              {importStatus === "importing"
                ? "Importing Attendees..."
                : importStatus === "success"
                  ? "Import Complete"
                  : "Import Failed"}
            </h3>

            {importStatus === "importing" && (
              <div className="space-y-4">
                <Progress value={importProgress} className="h-2" />
                <p className="text-sm text-center">{importProgress}% complete</p>
              </div>
            )}

            {importStatus === "success" && (
              <div className="space-y-4">
                <div className="bg-green-900/20 text-green-400 border border-green-800 rounded-lg p-4 flex items-center">
                  <Check className="h-5 w-5 mr-3" />
                  <div>
                    <p className="font-medium">Import completed successfully</p>
                    <p className="text-sm">
                      {importStats.imported} of {importStats.total} records were imported
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Import Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-lg font-medium">{importStats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Successfully Imported</p>
                      <p className="text-lg font-medium text-green-400">{importStats.imported}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Updated</p>
                      <p className="text-lg font-medium">{importStats.updated}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                      <p className="text-lg font-medium">{importStats.skipped}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Errors</p>
                      <p className="text-lg font-medium text-red-400">{importStats.errors}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Attendees</CardTitle>
        <CardDescription>Import attendees from ticketing platforms or files</CardDescription>
      </CardHeader>
      <CardContent>{renderStepContent()}</CardContent>
      <CardFooter className="flex justify-between">
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={importMethod === null || (importMethod === "platform" && (!selectedPlatform || !selectedEvent))}
          >
            {step === 3 ? "Start Import" : "Next"}
            {step < 3 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        ) : (
          <Button onClick={() => window.location.reload()}>Done</Button>
        )}
      </CardFooter>
    </Card>
  )
}
