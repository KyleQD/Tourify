'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Map, 
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Database,
  User
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SimCitySiteMapViewer } from "./site-map-builder/simcity-site-map-viewer"
import { cn } from "@/lib/utils"

interface SiteMap {
  id: string
  name: string
  description: string
  width: number
  height: number
  created_at: string
  status: string
}

interface CreateForm {
  name: string
  description: string
  environment: string
  backgroundColor: string
  gridEnabled: boolean
  gridSize: number
  isPublic: boolean
  approximateSize: string
}

interface AuthStatus {
  authenticated: boolean
  userId?: string
  userEmail?: string
  error?: string
}

export function SiteMapManagerEnhanced() {
  const { toast } = useToast()
  const [siteMaps, setSiteMaps] = useState<SiteMap[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false })
  const [useFallbackAPI, setUseFallbackAPI] = useState(false)
  const [selectedSiteMap, setSelectedSiteMap] = useState<SiteMap | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: '',
    description: '',
    environment: 'outdoor',
    backgroundColor: '#f8f9fa',
    gridEnabled: true,
    gridSize: 20,
    isPublic: false,
    approximateSize: 'medium'
  })

  // Size presets
  const getSizePreset = (size: string) => {
    const presets = {
      small: { width: 800, height: 600, scale: 1.0 },
      medium: { width: 1200, height: 900, scale: 1.0 },
      large: { width: 1600, height: 1200, scale: 1.0 },
      xlarge: { width: 2000, height: 1500, scale: 1.0 }
    }
    return presets[size as keyof typeof presets] || presets.medium
  }

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/debug-auth', { credentials: 'include' })
      const data = await response.json()
      
      if (data.success) {
        setAuthStatus({
          authenticated: data.authentication.hasUser,
          userId: data.authentication.userId,
          userEmail: data.authentication.userEmail,
          error: data.authentication.authError
        })
      } else {
        setAuthStatus({
          authenticated: false,
          error: data.error
        })
      }
    } catch (error: any) {
      console.error('Auth check failed:', error)
      setAuthStatus({
        authenticated: false,
        error: error.message
      })
    }
  }

  // Load site maps with fallback
  const loadSiteMaps = async () => {
    setIsLoading(true)
    try {
      console.log('Loading site maps...', { useFallbackAPI, authStatus })
      
      const apiEndpoint = useFallbackAPI ? '/api/site-maps-simple' : '/api/admin/logistics/site-maps'
      const params = new URLSearchParams()
      if (!useFallbackAPI) {
        params.append('includeData', 'true')
      }

      const response = await fetch(`${apiEndpoint}?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        if (response.status === 401 && !useFallbackAPI) {
          console.log('Authentication failed, switching to fallback API')
          setUseFallbackAPI(true)
          
          // Try again with fallback
          const fallbackResponse = await fetch('/api/site-maps-simple', { credentials: 'include' })
          const fallbackData = await fallbackResponse.json()
          
          if (fallbackResponse.ok && fallbackData.success) {
            setSiteMaps(fallbackData.data || [])
            toast({
              title: "Using Fallback Mode",
              description: "Loaded site maps using simplified API (no authentication required)"
            })
            return
          }
        }
        
        throw new Error(data.error || `HTTP ${response.status}: Failed to load site maps`)
      }

      if (data.success) {
        setSiteMaps(data.data || [])
        toast({
          title: "Success",
          description: `Loaded ${data.count || data.data?.length || 0} site maps`
        })
      } else {
        throw new Error(data.error || 'Failed to load site maps')
      }
    } catch (error: any) {
      console.error('Error loading site maps:', error)
      toast({
        title: "Error",
        description: `Failed to load site maps: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Create site map with fallback
  const createSiteMap = async () => {
    if (!createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Site map name is required",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const preset = getSizePreset(createForm.approximateSize)
      
      const formData = new FormData()
      formData.append('name', createForm.name)
      formData.append('description', createForm.description)
      formData.append('environment', createForm.environment)
      formData.append('width', preset.width.toString())
      formData.append('height', preset.height.toString())
      formData.append('scale', preset.scale.toString())
      formData.append('backgroundColor', createForm.backgroundColor)
      formData.append('gridEnabled', createForm.gridEnabled.toString())
      formData.append('gridSize', createForm.gridSize.toString())
      formData.append('isPublic', createForm.isPublic.toString())
      formData.append('approximateSize', createForm.approximateSize)

      const apiEndpoint = useFallbackAPI ? '/api/site-maps-simple' : '/api/admin/logistics/site-maps'
      
      console.log('Creating site map...', { apiEndpoint, useFallbackAPI })
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()
      console.log('Create response:', data)

      if (!response.ok) {
        if (response.status === 401 && !useFallbackAPI) {
          console.log('Authentication failed, switching to fallback API')
          setUseFallbackAPI(true)
          
          // Try again with fallback
          const fallbackResponse = await fetch('/api/site-maps-simple', {
            method: 'POST',
            credentials: 'include',
            body: formData
          })
          const fallbackData = await fallbackResponse.json()
          
          if (fallbackResponse.ok && fallbackData.success) {
            toast({
              title: "Success (Fallback Mode)",
              description: "Site map created using simplified API"
            })
            
            // Reset form and close dialog
            setCreateForm({
              name: '',
              description: '',
              environment: 'outdoor',
              backgroundColor: '#f8f9fa',
              gridEnabled: true,
              gridSize: 20,
              isPublic: false,
              approximateSize: 'medium'
            })
            setShowCreateDialog(false)
            
            // Reload site maps
            await loadSiteMaps()
            return
          }
        }
        
        throw new Error(data.error || `HTTP ${response.status}: Failed to create site map`)
      }

      if (data.success) {
        toast({
          title: "Success",
          description: "Site map created successfully!"
        })
        
        // Reset form and close dialog
        setCreateForm({
          name: '',
          description: '',
          environment: 'outdoor',
          backgroundColor: '#f8f9fa',
          gridEnabled: true,
          gridSize: 20,
          isPublic: false,
          approximateSize: 'medium'
        })
        setShowCreateDialog(false)
        
        // Reload site maps
        await loadSiteMaps()
      } else {
        throw new Error(data.error || 'Failed to create site map')
      }
    } catch (error: any) {
      console.error('Error creating site map:', error)
      toast({
        title: "Error",
        description: `Failed to create site map: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Load site maps and check auth on mount
  useEffect(() => {
    checkAuthStatus()
    loadSiteMaps()
  }, [])

  return (
    <div className="space-y-8">
      {/* Futuristic Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
        <div className="relative bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl border border-slate-700/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-60"></div>
                  <div className="relative p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-xl border border-white/20">
                    <Map className="h-8 w-8 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent tracking-tight">
                    Enhanced Site Maps
                  </h1>
                  <p className="text-slate-400 mt-2 text-lg">Smart site map creation with authentication fallback</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={checkAuthStatus}
                className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Auth
              </Button>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25">
                    <Plus className="h-4 w-4 mr-2" />
                    New Site Map
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-slate-900/95 border-slate-700/50 backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New Site Map</DialogTitle>
                  </DialogHeader>
              
                  <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter site map name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="environment">Environment</Label>
                    <Select
                      value={createForm.environment}
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, environment: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Select
                      value={createForm.approximateSize}
                      onValueChange={(value) => setCreateForm(prev => ({ ...prev, approximateSize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (800x600)</SelectItem>
                        <SelectItem value="medium">Medium (1200x900)</SelectItem>
                        <SelectItem value="large">Large (1600x1200)</SelectItem>
                        <SelectItem value="xlarge">X-Large (2000x1500)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createSiteMap}
                    disabled={isCreating || !createForm.name.trim()}
                  >
                    {isCreating ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Site Map
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      </div>

      {/* Futuristic Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
          <Card className="relative bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-500/30 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-red-500/20 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-red-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-sm"></div>
                  <User className="relative h-4 w-4" />
                </div>
                Authentication Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={authStatus.authenticated ? "default" : "destructive"}
                  className={cn(
                    "px-3 py-1 rounded-full border backdrop-blur-sm",
                    authStatus.authenticated 
                      ? "bg-green-500/20 text-green-300 border-green-500/30" 
                      : "bg-red-500/20 text-red-300 border-red-500/30"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    authStatus.authenticated ? "bg-green-400 animate-pulse" : "bg-red-400 animate-pulse"
                  )}></div>
                  {authStatus.authenticated ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
              {authStatus.userEmail && (
                <p className="text-xs text-red-200 mt-2 font-medium">{authStatus.userEmail}</p>
              )}
              {authStatus.error && (
                <p className="text-xs text-red-300 mt-2 font-medium">{authStatus.error}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
          <Card className="relative bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-500/30 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-sm"></div>
                  <Database className="relative h-4 w-4" />
                </div>
                API Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={useFallbackAPI ? "secondary" : "default"}
                className={cn(
                  "px-3 py-1 rounded-full border backdrop-blur-sm",
                  useFallbackAPI 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                    : "bg-green-500/20 text-green-300 border-green-500/30"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  useFallbackAPI ? "bg-amber-400" : "bg-green-400"
                )}></div>
                {useFallbackAPI ? "Fallback API" : "Full API"}
              </Badge>
              <p className="text-xs text-blue-200 mt-2 font-medium">
                {useFallbackAPI ? "Simplified mode (no auth)" : "Full authentication"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
          <Card className="relative bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-500/30 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-lg blur-sm"></div>
                  <Map className="relative h-4 w-4" />
                </div>
                Site Maps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-green-200">{siteMaps.length}</div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-green-400/50"></div>
              </div>
              <p className="text-xs text-green-200 mt-1 font-medium">Total site maps</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Futuristic Site Maps List */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
            <Card className="relative bg-gradient-to-br from-slate-900/60 to-slate-800/60 border-slate-700/40 backdrop-blur-2xl rounded-3xl shadow-2xl">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-60 animate-pulse"></div>
                    <div className="relative p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
                      <AlertCircle className="h-8 w-8 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Loading Site Maps</h3>
                    <p className="text-slate-400">Fetching your site map data...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : siteMaps.length === 0 ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
            <Card className="relative bg-gradient-to-br from-slate-900/60 to-slate-800/60 border-slate-700/40 backdrop-blur-2xl rounded-3xl shadow-2xl">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-40"></div>
                    <div className="relative p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/30">
                      <Map className="h-16 w-16 text-purple-300" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-white">No Site Maps Found</h3>
                    <p className="text-slate-400 max-w-md leading-relaxed">
                      {useFallbackAPI 
                        ? "Using simplified API - no site maps available in fallback mode."
                        : "Create your first site map to get started with event planning."
                      }
                    </p>
                  </div>
                  {!useFallbackAPI && (
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white border-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25 px-6 py-3"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Your First Site Map
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          siteMaps.map((siteMap) => (
            <div key={siteMap.id} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Card 
                className="relative cursor-pointer bg-gradient-to-br from-slate-900/60 via-slate-800/60 to-slate-900/60 border-slate-700/40 backdrop-blur-2xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/40"
                onClick={() => setSelectedSiteMap(siteMap)}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-sm opacity-60"></div>
                        <div className="relative p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl border border-white/20">
                          <Map className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      <span className="text-xl font-bold text-white">{siteMap.name}</span>
                    </div>
                    <Badge 
                      variant={siteMap.status === 'published' ? 'default' : 'secondary'}
                      className={cn(
                        "px-3 py-1 rounded-full border backdrop-blur-sm font-medium",
                        siteMap.status === 'published' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        siteMap.status === 'published' ? "bg-green-400 animate-pulse" : "bg-amber-400"
                      )}></div>
                      {siteMap.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full shadow-blue-400/50"></div>
                        <span className="text-slate-400 font-medium">Size:</span>
                        <span className="text-slate-300 font-semibold">{siteMap.width} × {siteMap.height}px</span>
                      </div>
                      <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700/30 backdrop-blur-sm">
                        <div className="w-2 h-2 bg-purple-400 rounded-full shadow-purple-400/50"></div>
                        <span className="text-slate-400 font-medium">Type:</span>
                        <span className="text-slate-300 font-semibold">Interactive</span>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-slate-400 font-medium">Description:</span>
                      <p className="text-slate-300 mt-2 leading-relaxed">{siteMap.description || 'No description provided'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                      <span className="text-xs text-slate-400 font-medium">
                        Created {new Date(siteMap.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-green-400/50"></div>
                        <span className="text-xs text-green-400 font-semibold">Ready</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Site Map Viewer */}
      {selectedSiteMap && (
        <SimCitySiteMapViewer
          siteMap={selectedSiteMap}
          onClose={() => setSelectedSiteMap(null)}
          onSave={(updatedSiteMap) => {
            setSiteMaps(prev => prev.map(sm => 
              sm.id === updatedSiteMap.id ? updatedSiteMap : sm
            ))
            setSelectedSiteMap(null)
            toast({
              title: "Success",
              description: "Site map updated successfully!"
            })
          }}
          onDelete={(siteMapId) => {
            setSiteMaps(prev => prev.filter(sm => sm.id !== siteMapId))
            setSelectedSiteMap(null)
            toast({
              title: "Success",
              description: "Site map deleted successfully!"
            })
          }}
        />
      )}
      </div>
    </div>
  )
}
