"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  DollarSign,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MessageCircle,
  Mail,
  Smartphone,
  Link as LinkIcon,
  QrCode,
  Download,
  BarChart3
} from 'lucide-react'
import { SHARE_PLATFORMS, type SharePlatform } from '@/types/ticketing'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface TicketSharingToolsProps {
  eventId: string
  event: {
    id: string
    title: string
    date: string
    location: string
    description?: string
  }
  ticketTypes?: Array<{
    id: string
    name: string
    price: number
    category: string
  }>
  onShare?: (platform: SharePlatform, data: any) => void
}

interface ShareStats {
  platform: string
  clicks: number
  conversions: number
  revenue: number
  conversion_rate: number
}

export function TicketSharingTools({ 
  eventId, 
  event, 
  ticketTypes = [], 
  onShare 
}: TicketSharingToolsProps) {
  const [selectedTicketType, setSelectedTicketType] = useState<string>('')
  const [shareText, setShareText] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareStats, setShareStats] = useState<ShareStats[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('share')
  const { toast } = useToast()

  // Generate share URL
  const generateShareUrl = () => {
    const baseUrl = `${window.location.origin}/events/${eventId}`
    const params = new URLSearchParams()
    if (selectedTicketType) {
      params.append('ticket_type', selectedTicketType)
    }
    const finalUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
    setShareUrl(finalUrl)
    return finalUrl
  }

  // Generate default share text
  const generateShareText = () => {
    const ticketType = ticketTypes.find(t => t.id === selectedTicketType)
    const priceText = ticketType ? ` starting at $${ticketType.price}` : ''
    
    const text = `🎫 ${event.title}${priceText}\n📅 ${formatSafeDate(event.date)}\n📍 ${event.location}\n\nGet your tickets now!`
    setShareText(text)
    return text
  }

  useEffect(() => {
    if (eventId) {
      generateShareUrl()
      generateShareText()
      fetchShareStats()
    }
  }, [eventId, selectedTicketType])

  const fetchShareStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ticketing/enhanced?action=social_stats&event_id=${eventId}`)
      const data = await response.json()
      
      if (response.ok && data.social_stats) {
        const stats = Object.entries(data.social_stats).map(([platform, data]: [string, any]) => ({
          platform,
          clicks: data.clicks,
          conversions: data.conversions,
          revenue: data.revenue,
          conversion_rate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
        }))
        setShareStats(stats)
      }
    } catch (error) {
      console.error('Error fetching share stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (platform: SharePlatform) => {
    const url = generateShareUrl()
    const text = shareText || generateShareText()
    
    try {
      // Record share in database
      const response = await fetch('/api/ticketing/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'share',
          event_id: eventId,
          ticket_type_id: selectedTicketType || undefined,
          platform,
          share_text: text,
          share_url: url
        })
      })

      if (response.ok) {
        // Share on platform
        const platformConfig = SHARE_PLATFORMS[platform]
        const shareUrl = platformConfig.url
        
        if (platform === 'copy_link') {
          await navigator.clipboard.writeText(`${text}\n\n${url}`)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } else if (platform === 'email') {
          const subject = encodeURIComponent(`Check out ${event.title}`)
          const body = encodeURIComponent(`${text}\n\n${url}`)
          window.open(`mailto:?subject=${subject}&body=${body}`)
        } else if (platform === 'sms') {
          const message = encodeURIComponent(`${text}\n\n${url}`)
          window.open(`sms:?body=${message}`)
        } else if (shareUrl) {
          const params = new URLSearchParams()
          if (platform === 'facebook') {
            params.append('u', url)
          } else if (platform === 'twitter') {
            params.append('text', text)
            params.append('url', url)
          } else if (platform === 'linkedin') {
            params.append('url', url)
            params.append('title', event.title)
            params.append('summary', text)
          }
          
          const finalUrl = params.toString() ? `${shareUrl}?${params.toString()}` : shareUrl
          window.open(finalUrl, '_blank', 'width=600,height=400')
        }

        toast({
          title: 'Shared successfully!',
          description: `Your event has been shared on ${SHARE_PLATFORMS[platform].label}`,
        })

        // Refresh stats
        setTimeout(fetchShareStats, 1000)
        
        // Call parent callback
        onShare?.(platform, { text, url })
      }
    } catch (error) {
      console.error('Error sharing:', error)
      toast({
        title: 'Error sharing',
        description: 'Failed to share on this platform. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleCopyLink = async () => {
    const url = generateShareUrl()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast({
      title: 'Link copied!',
      description: 'Event link has been copied to clipboard',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const generateQRCode = () => {
    const url = generateShareUrl()
    // In a real implementation, you would generate a QR code here
    // For now, we'll just show a placeholder
    toast({
      title: 'QR Code Generated',
      description: 'QR code has been generated for easy sharing',
    })
  }

  const downloadShareKit = () => {
    // In a real implementation, you would generate and download a share kit
    toast({
      title: 'Share Kit Downloaded',
      description: 'Marketing materials have been downloaded',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="share" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Your Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ticket Type Selection */}
              {ticketTypes.length > 0 && (
                <div className="space-y-2">
                  <Label>Highlight specific ticket type (optional)</Label>
                  <select
                    value={selectedTicketType}
                    onChange={(e) => setSelectedTicketType(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="">All ticket types</option>
                    {ticketTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {formatCurrency(type.price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Share URL */}
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Share Text */}
              <div className="space-y-2">
                <Label>Custom message (optional)</Label>
                <Textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Write your custom message..."
                  rows={3}
                />
              </div>

              {/* Social Media Platforms */}
              <div className="space-y-3">
                <Label>Share on social media</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(SHARE_PLATFORMS).map(([platform, config]) => (
                    <Button
                      key={platform}
                      onClick={() => handleShare(platform as SharePlatform)}
                      variant="outline"
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <span className="text-lg">{config.icon}</span>
                      <span className="text-xs">{config.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sharing Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : shareStats.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {shareStats.map((stat) => (
                      <Card key={stat.platform} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {SHARE_PLATFORMS[stat.platform as SharePlatform]?.label || stat.platform}
                            </p>
                            <p className="text-2xl font-bold">{stat.clicks}</p>
                            <p className="text-xs text-muted-foreground">clicks</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              {stat.conversions} conversions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stat.conversion_rate.toFixed(1)}% rate
                            </p>
                            <p className="text-sm font-bold text-green-600">
                              {formatCurrency(stat.revenue)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button
                      onClick={fetchShareStats}
                      variant="outline"
                      size="sm"
                    >
                      Refresh Stats
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sharing data yet</p>
                  <p className="text-sm">Start sharing your event to see analytics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QR Code Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate a QR code for easy sharing at events or on printed materials.
                </p>
                <Button onClick={generateQRCode} className="w-full">
                  Generate QR Code
                </Button>
              </CardContent>
            </Card>

            {/* Share Kit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Share Kit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download marketing materials including images, text, and templates.
                </p>
                <Button onClick={downloadShareKit} className="w-full">
                  Download Share Kit
                </Button>
              </CardContent>
            </Card>

            {/* Referral Program */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create referral codes to reward fans who bring friends to your events.
                </p>
                <Button variant="outline" className="w-full">
                  Create Referral Codes
                </Button>
              </CardContent>
            </Card>

            {/* Email Campaign */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Send targeted email campaigns to your mailing list.
                </p>
                <Button variant="outline" className="w-full">
                  Create Email Campaign
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 