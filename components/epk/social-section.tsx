"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, X, ExternalLink, Globe, Users, TrendingUp, 
  CheckCircle, AlertCircle, Copy, Share2
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface SocialLink {
  id: string
  platform: string
  url: string
  username: string
  verified?: boolean
  followers?: number
}

interface SocialSectionProps {
  socialLinks: SocialLink[]
  onSocialLinksChange: (links: SocialLink[]) => void
}

const SOCIAL_PLATFORMS = [
  { 
    id: 'instagram', 
    name: 'Instagram', 
    baseUrl: 'https://instagram.com/',
    placeholder: '@username',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    baseUrl: 'https://tiktok.com/@',
    placeholder: '@username',
    color: 'text-black',
    bgColor: 'bg-gray-500/10'
  },
  { 
    id: 'youtube', 
    name: 'YouTube', 
    baseUrl: 'https://youtube.com/@',
    placeholder: '@channel',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  { 
    id: 'twitter', 
    name: 'X (Twitter)', 
    baseUrl: 'https://x.com/',
    placeholder: '@username',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  { 
    id: 'facebook', 
    name: 'Facebook', 
    baseUrl: 'https://facebook.com/',
    placeholder: 'page-name',
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10'
  },
  { 
    id: 'spotify', 
    name: 'Spotify', 
    baseUrl: 'https://open.spotify.com/artist/',
    placeholder: 'Artist ID',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  { 
    id: 'apple_music', 
    name: 'Apple Music', 
    baseUrl: 'https://music.apple.com/artist/',
    placeholder: 'Artist ID or URL',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10'
  },
  { 
    id: 'apple', 
    name: 'Apple Music (legacy)', 
    baseUrl: 'https://music.apple.com/artist/',
    placeholder: 'Artist ID',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10'
  },
  { 
    id: 'soundcloud', 
    name: 'SoundCloud', 
    baseUrl: 'https://soundcloud.com/',
    placeholder: 'username',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  { 
    id: 'bandcamp', 
    name: 'Bandcamp', 
    baseUrl: 'https://bandcamp.com/',
    placeholder: 'artistname',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  { 
    id: 'twitch', 
    name: 'Twitch', 
    baseUrl: 'https://twitch.tv/',
    placeholder: 'username',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
]

function SocialLinkCard({ link, onEdit, onRemove, onVerify }: {
  link: SocialLink
  onEdit: (link: SocialLink) => void
  onRemove: (id: string) => void
  onVerify: (id: string) => void
}) {
  const { toast } = useToast()
  const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link.url)
    toast({
      title: "Link copied!",
      description: "Social media link copied to clipboard.",
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${link.platform} - ${link.username}`,
        url: link.url
      })
    } else {
      handleCopyLink()
    }
  }

  return (
    <Card className="group rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a] hover:shadow-2xl transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${platform?.bgColor || 'bg-gray-500/10'} flex items-center justify-center`}>
              <Globe className={`h-5 w-5 ${platform?.color || 'text-gray-500'}`} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{platform?.name || link.platform}</h3>
                {link.verified && (
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{link.username}</span>
                {typeof link.followers === 'number' && link.followers > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{link.followers.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="text-gray-400 hover:text-white"
            >
              <Share2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(link.url, '_blank')}
              className="text-gray-400 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onVerify(link.id)}
              className="text-gray-400 hover:text-white"
            >
              Verify
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(link)}
              className="text-gray-400 hover:text-white"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(link.id)}
              className="text-gray-400 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AddSocialModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean
  onClose: () => void
  onAdd: (link: Omit<SocialLink, 'id'>) => void
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [username, setUsername] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [useCustomUrl, setUseCustomUrl] = useState(false)

  const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedPlatform)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPlatform || !username) return

    const url = useCustomUrl ? customUrl : `${platform?.baseUrl}${username.replace('@', '')}`

    onAdd({
      platform: selectedPlatform,
      username: username.startsWith('@') ? username : `@${username}`,
      url: url
    })

    // Reset form
    setSelectedPlatform('')
    setUsername('')
    setCustomUrl('')
    setUseCustomUrl(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 rounded-xl shadow-2xl border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardHeader>
          <CardTitle className="text-white">Add Social Media Link</CardTitle>
          <CardDescription className="text-gray-400">
            Connect your social media profiles to your EPK
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white">Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="bg-[#23263a] border-0 text-white">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-[#23263a] border-gray-700">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${platform.bgColor}`}>
                          <Globe className={`h-4 w-4 ${platform.color}`} />
                        </div>
                        {platform.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPlatform && (
              <>
                <div>
                  <Label className="text-white">Username/Handle</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={platform?.placeholder || '@username'}
                    className="bg-[#23263a] border-0 text-white"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customUrl"
                    checked={useCustomUrl}
                    onChange={(e) => setUseCustomUrl(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="customUrl" className="text-white text-sm">
                    Use custom URL
                  </Label>
                </div>

                {useCustomUrl ? (
                  <div>
                    <Label className="text-white">Custom URL</Label>
                    <Input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#23263a] border-0 text-white"
                      required
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-[#23263a] rounded-lg">
                    <Label className="text-white text-sm">Preview URL:</Label>
                    <p className="text-gray-400 text-sm break-all">
                      {platform?.baseUrl}{username.replace('@', '')}
                    </p>
                  </div>
                )}
              </>
            )}
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-700 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
                disabled={!selectedPlatform || !username}
              >
                Add Link
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SocialSection({ socialLinks, onSocialLinksChange }: SocialSectionProps) {
  const { toast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)

  const handleAddLink = (linkData: Omit<SocialLink, 'id'>) => {
    const newLink: SocialLink = {
      ...linkData,
      id: Date.now().toString(),
    }
    onSocialLinksChange([...socialLinks, newLink])
    toast({
      title: "Social link added",
      description: "Your social media link has been added to your EPK.",
    })
  }

  const handleRemoveLink = (id: string) => {
    onSocialLinksChange(socialLinks.filter(link => link.id !== id))
    toast({
      title: "Social link removed",
      description: "The social media link has been removed from your EPK.",
    })
  }

  const handleEditLink = (link: SocialLink) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit functionality",
      description: "Social link editing will be available soon.",
    })
  }

  const handleVerifyLink = async (id: string) => {
    // TODO: Implement link verification
    const updatedLinks = socialLinks.map(link => 
      link.id === id ? { ...link, verified: true } : link
    )
    onSocialLinksChange(updatedLinks)
    toast({
      title: "Link verified",
      description: "Your social media link has been verified.",
    })
  }

  const handleQuickImport = () => {
    // TODO: Implement quick import from artist profile
    toast({
      title: "Quick Import",
      description: "Import from artist profile will be available soon.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Social Media</h2>
          <p className="text-gray-400">Connect your social media profiles and streaming platforms</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleQuickImport}
            variant="outline"
            className="border-gray-700 text-white"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Import from Profile
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Social Media Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{socialLinks.length}</div>
              <div className="text-xs text-gray-400">Connected Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {socialLinks.filter(link => link.verified).length}
              </div>
              <div className="text-xs text-gray-400">Verified Links</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {socialLinks.reduce((total, link) => total + (link.followers || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Total Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {socialLinks.filter(link => ['spotify', 'apple', 'soundcloud'].includes(link.platform)).length}
              </div>
              <div className="text-xs text-gray-400">Streaming Platforms</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <div className="space-y-4">
        {socialLinks.length === 0 ? (
          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-[#191c24] to-[#23263a]">
            <CardContent className="py-20 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">No social media links added yet</h3>
              <p className="text-gray-400 mb-6">Connect your social media profiles to increase your reach</p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Link
              </Button>
            </CardContent>
          </Card>
        ) : (
          socialLinks.map((link) => (
            <SocialLinkCard
              key={link.id}
              link={link}
              onEdit={handleEditLink}
              onRemove={handleRemoveLink}
              onVerify={handleVerifyLink}
            />
          ))
        )}
      </div>

      <AddSocialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddLink}
      />
    </div>
  )
} 