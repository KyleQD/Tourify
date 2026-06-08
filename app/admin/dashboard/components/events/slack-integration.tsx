"use client"

import { useState, useEffect } from "react"
import { Slack, Plus, X, Check, AlertCircle } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { SlackService, type SlackWorkspace, type SlackChannel, type SlackNotificationConfig } from "../../lib/slack-service"

interface SlackIntegrationProps {
  eventId: string
  eventName: string
}

export function SlackIntegration({ eventId, eventName }: SlackIntegrationProps) {
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("")
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>("")
  const [config, setConfig] = useState<SlackNotificationConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [connectCode, setConnectCode] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [testMessage, setTestMessage] = useState("")
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testSent, setTestSent] = useState(false)

  // Load workspaces and configuration
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const workspacesData = await SlackService.getWorkspaces()
        setWorkspaces(workspacesData)

        const configData = await SlackService.getNotificationConfig(eventId)
        if (configData) {
          setConfig(configData)
          setSelectedChannel(configData.channelId)

          // Find the workspace that contains this channel
          for (const workspace of workspacesData) {
            if (workspace.channels.some((channel: SlackChannel) => channel.id === configData.channelId)) {
              setSelectedWorkspace(workspace.id)
              setChannels(workspace.channels)
              break
            }
          }
        }
      } catch (error) {
        console.error("Error loading Slack data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [eventId])

  // Load channels when workspace changes
  useEffect(() => {
    if (selectedWorkspace) {
      const loadChannels = async () => {
        try {
          const channelsData = await SlackService.getChannels(selectedWorkspace)
          setChannels(channelsData)
          if (channelsData.length > 0 && !selectedChannel) {
            setSelectedChannel(channelsData[0].id)
          }
        } catch (error) {
          console.error("Error loading channels:", error)
        }
      }

      loadChannels()
    } else {
      setChannels([])
      setSelectedChannel("")
    }
  }, [selectedWorkspace, selectedChannel])

  const handleWorkspaceChange = (value: string) => {
    setSelectedWorkspace(value)
  }

  const handleChannelChange = (value: string) => {
    setSelectedChannel(value)
  }

  const handleSaveConfig = async () => {
    if (!selectedChannel) return

    setIsSaving(true)
    try {
      const newConfig: SlackNotificationConfig = {
        eventId,
        channelId: selectedChannel,
        notifications: config?.notifications || {
          taskCreated: true,
          taskCompleted: true,
          taskAssigned: false,
          eventUpdates: true,
          budgetAlerts: false,
        },
      }

      await SlackService.saveNotificationConfig(newConfig)
      setConfig(newConfig)
    } catch (error) {
      console.error("Error saving configuration:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectWorkspace = async () => {
    if (!connectCode) return

    setIsConnecting(true)
    try {
      const workspace = await SlackService.connectWorkspace(connectCode)
      if (!workspace) return
      setWorkspaces([...workspaces, workspace])
      setSelectedWorkspace(workspace.id)
      setConnectDialogOpen(false)
      setConnectCode("")
    } catch (error) {
      console.error("Error connecting workspace:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectWorkspace = async (workspaceId: string) => {
    if (confirm("Are you sure you want to disconnect this workspace?")) {
      try {
        await SlackService.disconnectWorkspace(workspaceId)
        setWorkspaces(workspaces.filter((w) => w.id !== workspaceId))
        if (selectedWorkspace === workspaceId) {
          setSelectedWorkspace("")
          setSelectedChannel("")
        }
      } catch (error) {
        console.error("Error disconnecting workspace:", error)
      }
    }
  }

  const handleToggleNotification = (key: keyof SlackNotificationConfig["notifications"]) => {
    if (!config) return

    setConfig({
      ...config,
      notifications: {
        ...config.notifications,
        [key]: !config.notifications[key],
      },
    })
  }

  const handleSendTestMessage = async () => {
    if (!selectedChannel || !testMessage) return

    setIsSendingTest(true)
    try {
      await SlackService.sendMessage(selectedChannel, `*Test from Tourify (${eventName})*: ${testMessage}`)
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
      setTestMessage("")
    } catch (error) {
      console.error("Error sending test message:", error)
    } finally {
      setIsSendingTest(false)
    }
  }

  const connectedWorkspace = workspaces.find((w) => w.isConnected)

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Slack className="h-5 w-5 mr-2 text-purple-500" />
            <CardTitle className="text-slate-100">Slack Integration</CardTitle>
          </div>
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Connect Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
              <DialogHeader>
                <DialogTitle>Connect Slack Workspace</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter the authorization code from Slack to connect your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="code" className="text-slate-300">
                  Authorization Code
                </Label>
                <Input
                  id="code"
                  value={connectCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConnectCode(e.target.value)}
                  placeholder="xoxp-..."
                  className="mt-2 bg-slate-800 border-slate-700 text-slate-100"
                />
                <p className="text-xs text-slate-400 mt-2">
                  You can get this code by authorizing Tourify in your Slack workspace settings.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConnectDialogOpen(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnectWorkspace}
                  disabled={!connectCode || isConnecting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription className="text-slate-400">Configure Slack notifications for this event</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {workspaces.length === 0 ? (
              <div className="text-center py-8">
                <Slack className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No Slack Workspaces Connected</h3>
                <p className="text-slate-400 mb-4">
                  Connect your Slack workspace to receive notifications about this event.
                </p>
                <Button onClick={() => setConnectDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Workspace
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="workspace" className="text-slate-300">
                    Workspace
                  </Label>
                  <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                    <SelectTrigger id="workspace" className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                      {workspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedWorkspace && (
                  <div className="grid gap-2">
                    <Label htmlFor="channel" className="text-slate-300">
                      Channel
                    </Label>
                    <Select value={selectedChannel} onValueChange={handleChannelChange}>
                      <SelectTrigger id="channel" className="bg-slate-800 border-slate-700 text-slate-100">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                        {channels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            #{channel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedChannel && config && (
                  <>
                    <div className="pt-4">
                      <h3 className="text-sm font-medium text-slate-300 mb-3">Notification Settings</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="task-created" className="text-slate-400 cursor-pointer">
                            Task Created
                          </Label>
                          <Switch
                            id="task-created"
                            checked={config.notifications.taskCreated}
                            onCheckedChange={() => handleToggleNotification("taskCreated")}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="task-completed" className="text-slate-400 cursor-pointer">
                            Task Completed
                          </Label>
                          <Switch
                            id="task-completed"
                            checked={config.notifications.taskCompleted}
                            onCheckedChange={() => handleToggleNotification("taskCompleted")}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="task-assigned" className="text-slate-400 cursor-pointer">
                            Task Assigned
                          </Label>
                          <Switch
                            id="task-assigned"
                            checked={config.notifications.taskAssigned}
                            onCheckedChange={() => handleToggleNotification("taskAssigned")}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="event-updates" className="text-slate-400 cursor-pointer">
                            Event Updates
                          </Label>
                          <Switch
                            id="event-updates"
                            checked={config.notifications.eventUpdates}
                            onCheckedChange={() => handleToggleNotification("eventUpdates")}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="budget-alerts" className="text-slate-400 cursor-pointer">
                            Budget Alerts
                          </Label>
                          <Switch
                            id="budget-alerts"
                            checked={config.notifications.budgetAlerts}
                            onCheckedChange={() => handleToggleNotification("budgetAlerts")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <h3 className="text-sm font-medium text-slate-300 mb-3">Test Notification</h3>
                      <div className="flex gap-2">
                        <Input
                          value={testMessage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestMessage(e.target.value)}
                          placeholder="Enter a test message"
                          className="bg-slate-800 border-slate-700 text-slate-100"
                        />
                        <Button
                          onClick={handleSendTestMessage}
                          disabled={!testMessage || isSendingTest}
                          className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
                        >
                          {isSendingTest ? "Sending..." : "Send Test"}
                        </Button>
                      </div>
                      {testSent && (
                        <Alert className="mt-3 bg-green-500/10 border-green-500/20 text-green-400">
                          <Check className="h-4 w-4" />
                          <AlertTitle>Success</AlertTitle>
                          <AlertDescription>Test message sent successfully!</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </>
                )}

                {selectedWorkspace && (
                  <div className="pt-4 flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={() => handleDisconnectWorkspace(selectedWorkspace)}
                      className="border-red-700/30 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>

                    <Button
                      onClick={handleSaveConfig}
                      disabled={!selectedChannel || isSaving}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSaving ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      {connectedWorkspace && (
        <CardFooter className="border-t border-slate-800 pt-4">
          <Alert className="bg-slate-800/50 border-slate-700/50">
            <AlertCircle className="h-4 w-4 text-purple-400" />
            <AlertTitle className="text-slate-200">Connected to {connectedWorkspace.name}</AlertTitle>
            <AlertDescription className="text-slate-400">
              Notifications will be sent based on your configuration.
            </AlertDescription>
          </Alert>
        </CardFooter>
      )}
    </Card>
  )
}
