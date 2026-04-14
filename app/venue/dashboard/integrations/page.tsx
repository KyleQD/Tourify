"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, ExternalLink, Plus, Search } from "lucide-react"
export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Mock data for integrations
  const integrations = [
    {
      id: "spotify",
      name: "Spotify",
      description: "Connect your Spotify artist account to sync music and analytics",
      category: "music",
      icon: "/placeholder.svg?height=40&width=40&text=Spotify",
      connected: true,
      popular: true,
    },
    {
      id: "apple-music",
      name: "Apple Music",
      description: "Connect your Apple Music artist account to sync music and analytics",
      category: "music",
      icon: "/placeholder.svg?height=40&width=40&text=Apple",
      connected: false,
      popular: true,
    },
    {
      id: "youtube",
      name: "YouTube",
      description: "Connect your YouTube channel to sync videos and analytics",
      category: "video",
      icon: "/placeholder.svg?height=40&width=40&text=YT",
      connected: true,
      popular: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      description: "Connect your Instagram account to share content and grow your audience",
      category: "social",
      icon: "/placeholder.svg?height=40&width=40&text=IG",
      connected: false,
      popular: true,
    },
    {
      id: "tiktok",
      name: "TikTok",
      description: "Connect your TikTok account to share content and grow your audience",
      category: "social",
      icon: "/placeholder.svg?height=40&width=40&text=TT",
      connected: false,
      popular: true,
    },
    {
      id: "soundcloud",
      name: "SoundCloud",
      description: "Connect your SoundCloud account to sync music and analytics",
      category: "music",
      icon: "/placeholder.svg?height=40&width=40&text=SC",
      connected: false,
      popular: false,
    },
    {
      id: "bandcamp",
      name: "Bandcamp",
      description: "Connect your Bandcamp account to sync music and merchandise",
      category: "music",
      icon: "/placeholder.svg?height=40&width=40&text=BC",
      connected: false,
      popular: false,
    },
    {
      id: "twitch",
      name: "Twitch",
      description: "Connect your Twitch account to stream live performances",
      category: "video",
      icon: "/placeholder.svg?height=40&width=40&text=TW",
      connected: false,
      popular: false,
    },
    {
      id: "mailchimp",
      name: "Mailchimp",
      description: "Connect your Mailchimp account to manage your email subscribers",
      category: "marketing",
      icon: "/placeholder.svg?height=40&width=40&text=MC",
      connected: true,
      popular: false,
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Connect your Stripe account to process payments for tickets and merchandise",
      category: "payment",
      icon: "/placeholder.svg?height=40&width=40&text=Stripe",
      connected: true,
      popular: true,
    },
  ]

  // Filter integrations based on search query
  const filteredIntegrations = integrations.filter(
    (integration) =>
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Group integrations by category
  const groupedIntegrations = filteredIntegrations.reduce(
    (acc, integration) => {
      const category = integration.category.charAt(0).toUpperCase() + integration.category.slice(1)
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(integration)
      return acc
    },
    {} as Record<string, typeof integrations>,
  )

  // Toggle integration connection
  const toggleConnection = (id: string) => {
    // In a real app, this would make an API call to connect/disconnect
    console.log(`Toggling connection for ${id}`)
  }

  return (
    <div className="space-y-6 pb-20">
      <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
        <AlertTitle>Demo preview</AlertTitle>
        <AlertDescription>
          Connections and status on this page are static sample data for UI exploration. They are not live
          integrations. Use Settings → Integrations for real social connections where available.
        </AlertDescription>
      </Alert>

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold break-words">Integrations</h1>
          <p className="break-words text-gray-400">Connect your accounts to enhance your Tourify experience</p>
        </div>

        <Button className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Integration
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search integrations..."
          className="pl-10 bg-gray-800 border-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800 col-span-full">
          <CardHeader>
            <CardTitle>Popular Integrations</CardTitle>
            <CardDescription>Connect with these popular services</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations
              .filter((integration) => integration.popular)
              .map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-start p-4 bg-gray-800/50 rounded-lg border border-gray-800"
                >
                  <img
                    src={integration.icon || "/placeholder.svg"}
                    alt={integration.name}
                    className="w-10 h-10 rounded mr-3"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-medium">{integration.name}</h3>
                      <Switch
                        checked={integration.connected}
                        onCheckedChange={() => toggleConnection(integration.id)}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{integration.description}</p>
                    {integration.connected && (
                      <Badge className="mt-2 bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {Object.entries(groupedIntegrations).map(([category, integrations]) => (
          <Card key={category} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>{category} Integrations</CardTitle>
              <CardDescription>Connect your {category.toLowerCase()} accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center p-3 bg-gray-800/50 rounded-lg border border-gray-800"
                >
                  <img
                    src={integration.icon || "/placeholder.svg"}
                    alt={integration.name}
                    className="w-8 h-8 rounded mr-3"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{integration.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{integration.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700"
                        onClick={() => toggleConnection(integration.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => toggleConnection(integration.id)}>
                        Connect
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
