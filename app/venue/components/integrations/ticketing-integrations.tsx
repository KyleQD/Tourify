"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  AlertCircle,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Key,
  RefreshCw,
  Settings,
  Ticket,
  X,
} from "lucide-react"
import { formatSafeDate, formatSafeDateTime, formatSafeTime } from "@/lib/events/admin-event-normalization"

// Mock data for available integrations
const availableIntegrations = [
  {
    id: "eventbrite",
    name: "Eventbrite",
    logo: "/placeholder.svg?key=rxgpq",
    description: "Connect to your Eventbrite account to import events and attendees.",
    popular: true,
    connected: true,
    lastSync: "2023-05-01T14:30:00Z",
  },
  {
    id: "ticketmaster",
    name: "Ticketmaster",
    logo: "/placeholder.svg?key=gss0k",
    description: "Import events and ticket sales from Ticketmaster.",
    popular: true,
    connected: false,
  },
  {
    id: "showclix",
    name: "ShowClix",
    logo: "/placeholder.svg?key=893yr",
    description: "Sync your ShowClix events and attendee data.",
    popular: false,
    connected: false,
  },
  {
    id: "ticketfly",
    name: "Ticketfly",
    logo: "/placeholder.svg?key=taef6",
    description: "Import Ticketfly events and attendance information.",
    popular: false,
    connected: false,
  },
  {
    id: "universe",
    name: "Universe",
    logo: "/placeholder.svg?key=is8p4",
    description: "Connect to Universe for event and ticket data.",
    popular: false,
    connected: false,
  },
  {
    id: "dice",
    name: "DICE",
    logo: "/placeholder.svg?height=40&width=40&query=DICE logo",
    description: "Import events and attendees from DICE platform.",
    popular: true,
    connected: false,
  },
  {
    id: "seetickets",
    name: "See Tickets",
    logo: "/placeholder.svg?height=40&width=40&query=See Tickets logo",
    description: "Sync your See Tickets events and sales data.",
    popular: false,
    connected: false,
  },
  {
    id: "brownpapertickets",
    name: "Brown Paper Tickets",
    logo: "/placeholder.svg?height=40&width=40&query=Brown Paper Tickets logo",
    description: "Import events and attendees from Brown Paper Tickets.",
    popular: false,
    connected: false,
  },
]

// Mock data for connected integrations
const connectedIntegrations = availableIntegrations.filter((integration) => integration.connected)

// Mock data for recent imports
const recentImports = [
  {
    id: "imp-1",
    platform: "Eventbrite",
    eventName: "Summer Jazz Festival",
    importDate: "2023-05-01T14:30:00Z",
    recordsImported: 450,
    status: "success",
  },
  {
    id: "imp-2",
    platform: "Eventbrite",
    eventName: "Rock Night with The Amplifiers",
    importDate: "2023-04-22T10:15:00Z",
    recordsImported: 380,
    status: "success",
  },
  {
    id: "imp-3",
    platform: "Eventbrite",
    eventName: "Classical Symphony Orchestra",
    importDate: "2023-04-15T09:45:00Z",
    recordsImported: 320,
    status: "partial",
    errors: 12,
  },
]

export default function TicketingIntegrations() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("available")
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncFrequency: "daily",
    notifyOnSync: true,
    importAttendeeDetails: true,
    importTicketTypes: true,
    overwriteExisting: false,
  })

  // Handle connect button click
  const handleConnect = (integrationId: string) => {
    setConnectingPlatform(integrationId)
  }

  // Handle disconnect button click
  const handleDisconnect = (integrationId: string) => {
    toast({
      title: "Integration Disconnected",
      description: `Successfully disconnected from ${availableIntegrations.find((i) => i.id === integrationId)?.name}.`,
    })

    // In a real app, you would make an API call to disconnect the integration
    // For this demo, we'll just update the UI
    setTimeout(() => {
      // Refresh the page or update state
    }, 1000)
  }

  // Handle API key submission
  const handleSubmitApiKey = () => {
    if (!apiKey || !apiSecret) {
      toast({
        title: "Missing Information",
        description: "Please provide both API key and secret.",
        variant: "destructive",
      })
      return
    }

    // In a real app, you would make an API call to validate and store the credentials
    toast({
      title: "Connection Successful",
      description: `Successfully connected to ${availableIntegrations.find((i) => i.id === connectingPlatform)?.name}.`,
    })

    setConnectingPlatform(null)
    setApiKey("")
    setApiSecret("")

    // Refresh the page or update state
    setTimeout(() => {
      setActiveTab("connected")
    }, 1000)
  }

  // Handle manual sync
  const handleManualSync = (integrationId: string) => {
    toast({
      title: "Sync Started",
      description: `Syncing data from ${
        availableIntegrations.find((i) => i.id === integrationId)?.name
      }. This may take a few minutes.`,
    })

    // In a real app, you would make an API call to trigger the sync
  }

  // Handle import from specific event
  const handleImportEvent = () => {
    toast({
      title: "Import Started",
      description: "Importing attendees from selected event. This may take a few minutes.",
    })

    // In a real app, you would make an API call to import the event
  }

  // Handle save settings
  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your integration settings have been updated.",
    })

    // In a real app, you would make an API call to save the settings
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ticketing Integrations</h2>
        <p className="text-muted-foreground">Connect with popular ticketing platforms to import attendee data</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="imports">Recent Imports</TabsTrigger>
        </TabsList>

        {/* Available Integrations Tab */}
        <TabsContent value="available" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations.map((integration) => (
              <Card key={integration.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img
                        src={integration.logo || "/placeholder.svg"}
                        alt={`${integration.name} logo`}
                        className="h-8 w-8 rounded"
                        width={32}
                        height={32}
                      />
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    {integration.popular && <Badge variant="secondary">Popular</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <CardDescription>{integration.description}</CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  {integration.connected ? (
                    <>
                      <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualSync(integration.id)}
                          className="h-8"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Sync
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                          className="h-8 text-red-500 hover:text-red-600 hover:bg-red-100/10"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700">
                        Not Connected
                      </Badge>
                      <Button size="sm" onClick={() => handleConnect(integration.id)} className="h-8">
                        Connect
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Connected Integrations Tab */}
        <TabsContent value="connected" className="mt-6">
          {connectedIntegrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-gray-800 p-3 mb-4">
                  <Ticket className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Connected Platforms</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  You haven't connected any ticketing platforms yet. Connect a platform to start importing attendee
                  data.
                </p>
                <Button onClick={() => setActiveTab("available")}>View Available Platforms</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {connectedIntegrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={integration.logo || "/placeholder.svg"}
                          alt={`${integration.name} logo`}
                          className="h-10 w-10 rounded"
                          width={40}
                          height={40}
                        />
                        <div>
                          <CardTitle>{integration.name}</CardTitle>
                          <CardDescription>
                            Last synced: {formatSafeDateTime(integration.lastSync!)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleManualSync(integration.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-100/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="events">
                      <TabsList>
                        <TabsTrigger value="events">Available Events</TabsTrigger>
                        <TabsTrigger value="settings">Sync Settings</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                      </TabsList>
                      <TabsContent value="events" className="mt-4">
                        <div className="rounded-md border">
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium">Recent Events</h3>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Events
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Select an event to import attendees</p>
                          </div>
                          <Separator />
                          <div className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                                <div>
                                  <h4 className="font-medium">Summer Jazz Festival</h4>
                                  <p className="text-sm text-muted-foreground">May 15, 2023 • 450 attendees</p>
                                </div>
                                <Button size="sm" onClick={handleImportEvent}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Import
                                </Button>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                                <div>
                                  <h4 className="font-medium">Rock Night with The Amplifiers</h4>
                                  <p className="text-sm text-muted-foreground">June 22, 2023 • 380 attendees</p>
                                </div>
                                <Button size="sm" onClick={handleImportEvent}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Import
                                </Button>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                                <div>
                                  <h4 className="font-medium">Classical Symphony Orchestra</h4>
                                  <p className="text-sm text-muted-foreground">August 5, 2023 • 320 attendees</p>
                                </div>
                                <Button size="sm" onClick={handleImportEvent}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Import
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="settings" className="mt-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="autoSync">Automatic Sync</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Automatically sync data from this platform
                                  </p>
                                </div>
                                <Switch
                                  id="autoSync"
                                  checked={syncSettings.autoSync}
                                  onCheckedChange={(checked) => setSyncSettings({ ...syncSettings, autoSync: checked })}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="notifyOnSync">Sync Notifications</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Receive notifications when sync completes
                                  </p>
                                </div>
                                <Switch
                                  id="notifyOnSync"
                                  checked={syncSettings.notifyOnSync}
                                  onCheckedChange={(checked) =>
                                    setSyncSettings({ ...syncSettings, notifyOnSync: checked })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="importAttendeeDetails">Import Attendee Details</Label>
                                  <p className="text-sm text-muted-foreground">Import detailed attendee information</p>
                                </div>
                                <Switch
                                  id="importAttendeeDetails"
                                  checked={syncSettings.importAttendeeDetails}
                                  onCheckedChange={(checked) =>
                                    setSyncSettings({ ...syncSettings, importAttendeeDetails: checked })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="importTicketTypes">Import Ticket Types</Label>
                                  <p className="text-sm text-muted-foreground">Import ticket type information</p>
                                </div>
                                <Switch
                                  id="importTicketTypes"
                                  checked={syncSettings.importTicketTypes}
                                  onCheckedChange={(checked) =>
                                    setSyncSettings({ ...syncSettings, importTicketTypes: checked })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="overwriteExisting">Overwrite Existing Data</Label>
                                  <p className="text-sm text-muted-foreground">Overwrite existing data during import</p>
                                </div>
                                <Switch
                                  id="overwriteExisting"
                                  checked={syncSettings.overwriteExisting}
                                  onCheckedChange={(checked) =>
                                    setSyncSettings({ ...syncSettings, overwriteExisting: checked })
                                  }
                                />
                              </div>

                              <Button className="w-full mt-4" onClick={handleSaveSettings}>
                                Save Settings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="advanced" className="mt-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="apiKey">API Key</Label>
                                <div className="flex mt-1">
                                  <Input
                                    id="apiKey"
                                    type="password"
                                    value="••••••••••••••••••••••••"
                                    disabled
                                    className="rounded-r-none"
                                  />
                                  <Button variant="outline" className="rounded-l-none">
                                    <Key className="h-4 w-4 mr-2" />
                                    Update
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="webhookUrl">Webhook URL</Label>
                                <div className="flex mt-1">
                                  <Input
                                    id="webhookUrl"
                                    value="https://tourify.com/api/webhooks/eventbrite"
                                    disabled
                                    className="rounded-r-none"
                                  />
                                  <Button variant="outline" className="rounded-l-none">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Use this URL in your ticketing platform to set up webhooks
                                </p>
                              </div>

                              <Alert variant="destructive" className="mt-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Danger Zone</AlertTitle>
                                <AlertDescription>
                                  <p className="mb-4">
                                    Disconnecting this integration will remove all access and stop automatic syncing.
                                    This won't delete any imported data.
                                  </p>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDisconnect(integration.id)}
                                  >
                                    Disconnect Integration
                                  </Button>
                                </AlertDescription>
                              </Alert>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recent Imports Tab */}
        <TabsContent value="imports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Imports</CardTitle>
              <CardDescription>History of attendee data imports from ticketing platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {recentImports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No import history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentImports.map((importItem) => (
                    <div key={importItem.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-md">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`rounded-full p-2 ${
                            importItem.status === "success"
                              ? "bg-green-900/20 text-green-400"
                              : importItem.status === "partial"
                                ? "bg-amber-900/20 text-amber-400"
                                : "bg-red-900/20 text-red-400"
                          }`}
                        >
                          {importItem.status === "success" ? (
                            <Check className="h-4 w-4" />
                          ) : importItem.status === "partial" ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{importItem.eventName}</h4>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span className="mr-2">{importItem.platform}</span>
                            <span>•</span>
                            <span className="ml-2">
                              {formatSafeDate(importItem.importDate)}{" "}
                              {formatSafeTime(importItem.importDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{importItem.recordsImported} records</div>
                        <div className="text-sm text-muted-foreground">
                          {importItem.status === "success"
                            ? "Completed successfully"
                            : importItem.status === "partial"
                              ? `Completed with ${importItem.errors} errors`
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

      {/* Connection Modal */}
      {connectingPlatform && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={availableIntegrations.find((i) => i.id === connectingPlatform)?.logo || "/placeholder.svg"}
                alt={`${availableIntegrations.find((i) => i.id === connectingPlatform)?.name} logo`}
                className="h-10 w-10 rounded"
                width={40}
                height={40}
              />
              <h3 className="text-xl font-semibold">
                Connect to {availableIntegrations.find((i) => i.id === connectingPlatform)?.name}
              </h3>
            </div>

            <p className="text-muted-foreground mb-6">
              Enter your API credentials to connect to{" "}
              {availableIntegrations.find((i) => i.id === connectingPlatform)?.name}. You can find these in your account
              settings.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your API secret"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setConnectingPlatform(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitApiKey}>Connect</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
