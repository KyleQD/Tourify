"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Users, 
  MessageCircle, 
  Bell, 
  Share, 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Camera,
  Paperclip,
  Send,
  MoreVertical,
  Phone,
  Video,
  Settings,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Download,
  Upload,
  Link,
  Star,
  Flag,
  Archive,
  Trash2
} from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useToast } from "@/hooks/use-toast"

interface VendorCollaborationHubProps {
  vendorId: string
  siteMapId?: string
}

interface Vendor {
  id: string
  name: string
  company: string
  avatar?: string
  status: 'online' | 'offline' | 'busy'
  role: 'admin' | 'manager' | 'technician' | 'coordinator'
  location?: string
  lastSeen: string
  isVerified: boolean
}

interface CollaborationMessage {
  id: string
  senderId: string
  sender: Vendor
  content: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'system'
  attachments?: string[]
  isRead: boolean
  threadId?: string
  reactions?: { emoji: string; users: string[] }[]
}

interface CollaborationThread {
  id: string
  title: string
  participants: string[]
  lastMessage?: CollaborationMessage
  unreadCount: number
  isArchived: boolean
  isPinned: boolean
  createdAt: string
}

interface SiteMapShare {
  id: string
  siteMapId: string
  siteMapName: string
  sharedWith: Vendor[]
  permissions: 'view' | 'edit' | 'admin'
  expiresAt?: string
  createdAt: string
  createdBy: string
}

export function VendorCollaborationHub({ vendorId, siteMapId }: VendorCollaborationHubProps) {
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [messages, setMessages] = useState<CollaborationMessage[]>([])
  const [threads, setThreads] = useState<CollaborationThread[]>([])
  const [siteMapShares, setSiteMapShares] = useState<SiteMapShare[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Share form state
  const [shareForm, setShareForm] = useState({
    siteMapId: '',
    selectedVendors: [] as string[],
    permissions: 'view' as 'view' | 'edit' | 'admin',
    expiresAt: '',
    message: ''
  })

  useEffect(() => {
    loadCollaborationData()
  }, [vendorId, siteMapId])

  const loadCollaborationData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockVendors: Vendor[] = [
        {
          id: 'vendor-1',
          name: 'Sarah Johnson',
          company: 'Elite Sound Systems',
          avatar: '/avatars/sarah.jpg',
          status: 'online',
          role: 'admin',
          location: 'Los Angeles, CA',
          lastSeen: new Date().toISOString(),
          isVerified: true
        },
        {
          id: 'vendor-2',
          name: 'Mike Chen',
          company: 'Bright Lights Inc',
          avatar: '/avatars/mike.jpg',
          status: 'busy',
          role: 'manager',
          location: 'San Francisco, CA',
          lastSeen: new Date(Date.now() - 300000).toISOString(),
          isVerified: true
        },
        {
          id: 'vendor-3',
          name: 'Emily Rodriguez',
          company: 'Power Solutions Pro',
          avatar: '/avatars/emily.jpg',
          status: 'offline',
          role: 'technician',
          location: 'San Diego, CA',
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
          isVerified: false
        },
        {
          id: 'vendor-4',
          name: 'David Thompson',
          company: 'Luxury Tents Co',
          avatar: '/avatars/david.jpg',
          status: 'online',
          role: 'coordinator',
          location: 'Las Vegas, NV',
          lastSeen: new Date().toISOString(),
          isVerified: true
        }
      ]

      const mockThreads: CollaborationThread[] = [
        {
          id: 'thread-1',
          title: 'Coachella 2024 - Main Stage Setup',
          participants: ['vendor-1', 'vendor-2', 'vendor-3'],
          unreadCount: 3,
          isArchived: false,
          isPinned: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          lastMessage: {
            id: 'msg-1',
            senderId: 'vendor-2',
            sender: mockVendors[1],
            content: 'The lighting rig is ready for installation. Should we proceed?',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            type: 'text',
            isRead: false
          }
        },
        {
          id: 'thread-2',
          title: 'General Coordination',
          participants: ['vendor-1', 'vendor-2', 'vendor-3', 'vendor-4'],
          unreadCount: 0,
          isArchived: false,
          isPinned: false,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          lastMessage: {
            id: 'msg-2',
            senderId: 'vendor-4',
            sender: mockVendors[3],
            content: 'Thanks for the update on tent delivery!',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            type: 'text',
            isRead: true
          }
        }
      ]

      const mockMessages: CollaborationMessage[] = [
        {
          id: 'msg-1',
          senderId: 'vendor-2',
          sender: mockVendors[1],
          content: 'The lighting rig is ready for installation. Should we proceed?',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          type: 'text',
          isRead: false,
          threadId: 'thread-1'
        },
        {
          id: 'msg-2',
          senderId: 'vendor-1',
          sender: mockVendors[0],
          content: 'Yes, let\'s proceed with the installation. I\'ll coordinate with the power team.',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          type: 'text',
          isRead: false,
          threadId: 'thread-1'
        },
        {
          id: 'msg-3',
          senderId: 'vendor-3',
          sender: mockVendors[2],
          content: 'Power distribution is ready. We can start connecting the lighting system.',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          type: 'text',
          isRead: false,
          threadId: 'thread-1'
        }
      ]

      const mockShares: SiteMapShare[] = [
        {
          id: 'share-1',
          siteMapId: 'site-1',
          siteMapName: 'Coachella Main Stage Layout',
          sharedWith: [mockVendors[1], mockVendors[2]],
          permissions: 'edit',
          expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          createdBy: 'vendor-1'
        }
      ]

      setVendors(mockVendors)
      setThreads(mockThreads)
      setMessages(mockMessages)
      setSiteMapShares(mockShares)
      setSelectedThread('thread-1')
    } catch (error) {
      console.error('Error loading collaboration data:', error)
      toast({
        title: "Error",
        description: "Failed to load collaboration data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case 'busy': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      case 'offline': return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'technician': return 'bg-green-100 text-green-800'
      case 'coordinator': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return

    try {
      // Send message logic here
      const message: CollaborationMessage = {
        id: `msg-${Date.now()}`,
        senderId: vendorId,
        sender: vendors.find(v => v.id === vendorId) || vendors[0],
        content: newMessage,
        timestamp: new Date().toISOString(),
        type: 'text',
        isRead: false,
        threadId: selectedThread
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')
      
      toast({
        title: "Success",
        description: "Message sent successfully"
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const shareSiteMap = async () => {
    if (shareForm.selectedVendors.length === 0) {
      toast({
        title: "Error",
        description: "Please select vendors to share with",
        variant: "destructive"
      })
      return
    }

    try {
      // Share site map logic here
      toast({
        title: "Success",
        description: `Site map shared with ${shareForm.selectedVendors.length} vendors`
      })
      setShowShareDialog(false)
      setShareForm({
        siteMapId: '',
        selectedVendors: [],
        permissions: 'view',
        expiresAt: '',
        message: ''
      })
      loadCollaborationData()
    } catch (error) {
      console.error('Error sharing site map:', error)
      toast({
        title: "Error",
        description: "Failed to share site map",
        variant: "destructive"
      })
    }
  }

  const inviteVendor = async (email: string, role: string) => {
    try {
      // Invite vendor logic here
      toast({
        title: "Success",
        description: `Invitation sent to ${email}`
      })
      setShowInviteDialog(false)
    } catch (error) {
      console.error('Error inviting vendor:', error)
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      })
    }
  }

  const currentThreadMessages = messages.filter(msg => msg.threadId === selectedThread)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collaboration hub...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
      {/* Vendors List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Team Members</CardTitle>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Vendor</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="vendor@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">Send Invitation</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={vendor.avatar} />
                    <AvatarFallback>{vendor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1">
                    {getStatusIcon(vendor.status)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{vendor.name}</p>
                    {vendor.isVerified && (
                      <Shield className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-600 truncate">{vendor.company}</p>
                    <Badge className={getRoleColor(vendor.role)} variant="outline">
                      {vendor.role}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setShowShareDialog(true)}>
              <Share className="h-4 w-4 mr-2" />
              Share Site Map
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Create Report
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {threads.find(t => t.id === selectedThread)?.title || 'Select a conversation'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto mb-4">
              {currentThreadMessages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.senderId === vendorId ? 'justify-end' : 'justify-start'}`}>
                  {message.senderId !== vendorId && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar} />
                      <AvatarFallback>{message.sender.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${message.senderId === vendorId ? 'order-first' : ''}`}>
                    {message.senderId !== vendorId && (
                      <p className="text-xs text-gray-600 mb-1">{message.sender.name}</p>
                    )}
                    <div className={`p-3 rounded-lg ${
                      message.senderId === vendorId 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(message.timestamp))}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4" />
              </Button>
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations and Shares */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedThread === thread.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedThread(thread.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm truncate">{thread.title}</h4>
                  {thread.isPinned && <Star className="h-3 w-3 text-yellow-500" />}
                </div>
                {thread.lastMessage && (
                  <p className="text-xs text-gray-600 truncate mb-1">
                    {thread.lastMessage.content}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {formatSafeDate(thread.lastMessage?.timestamp || thread.createdAt)}
                  </p>
                  {thread.unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {thread.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Shared Site Maps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Shared Site Maps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {siteMapShares.map((share) => (
              <div key={share.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{share.siteMapName}</h4>
                  <Badge variant="outline">{share.permissions}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {share.sharedWith.slice(0, 3).map((vendor) => (
                    <Avatar key={vendor.id} className="h-6 w-6">
                      <AvatarImage src={vendor.avatar} />
                      <AvatarFallback className="text-xs">{vendor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  ))}
                  {share.sharedWith.length > 3 && (
                    <span className="text-xs text-gray-500">+{share.sharedWith.length - 3}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Shared {formatSafeDate(share.createdAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Site Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="siteMap">Site Map</Label>
              <Select value={shareForm.siteMapId} onValueChange={(value) => setShareForm(prev => ({ ...prev, siteMapId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site-1">Coachella Main Stage Layout</SelectItem>
                  <SelectItem value="site-2">VIP Tent Area</SelectItem>
                  <SelectItem value="site-3">Food Court Setup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Share with</Label>
              <div className="space-y-2 mt-2">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`vendor-${vendor.id}`}
                      checked={shareForm.selectedVendors.includes(vendor.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setShareForm(prev => ({
                            ...prev,
                            selectedVendors: [...prev.selectedVendors, vendor.id]
                          }))
                        } else {
                          setShareForm(prev => ({
                            ...prev,
                            selectedVendors: prev.selectedVendors.filter(id => id !== vendor.id)
                          }))
                        }
                      }}
                    />
                    <label htmlFor={`vendor-${vendor.id}`} className="text-sm">
                      {vendor.name} ({vendor.company})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="permissions">Permissions</Label>
              <Select value={shareForm.permissions} onValueChange={(value: any) => setShareForm(prev => ({ ...prev, permissions: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={shareForm.message}
                onChange={(e) => setShareForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Add a message..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Cancel
              </Button>
              <Button onClick={shareSiteMap}>
                Share Site Map
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
