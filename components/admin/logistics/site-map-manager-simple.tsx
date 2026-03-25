'use client'

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Plus, 
  Map, 
  Save,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

export function SiteMapManagerSimple() {
  const { toast } = useToast()
  const [siteMaps, setSiteMaps] = useState<SiteMap[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
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

  // Load site maps
  const loadSiteMaps = async () => {
    setIsLoading(true)
    try {
      console.log('Loading site maps from simple API...')
      const response = await fetch('/api/site-maps-simple', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Site maps loaded:', data)
      
      if (data.success) {
        setSiteMaps(data.data || [])
        toast({
          title: "Success",
          description: `Loaded ${data.count} site maps`
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

  // Create site map
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

      console.log('Creating site map with form data...')
      const response = await fetch('/api/site-maps-simple', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()
      console.log('Create response:', data)

      if (!response.ok) {
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

  // Load site maps on mount
  useEffect(() => {
    loadSiteMaps()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Maps (Simple Test)</h1>
          <p className="text-gray-600">Test site map creation without authentication</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Site Map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Site Map</DialogTitle>
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

      {/* Site Maps List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Loading site maps...</p>
            </CardContent>
          </Card>
        ) : siteMaps.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Map className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No site maps found</h3>
              <p className="text-gray-600 mb-4">Create your first site map to get started</p>
            </CardContent>
          </Card>
        ) : (
          siteMaps.map((siteMap) => (
            <Card key={siteMap.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  {siteMap.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Size:</span> {siteMap.width} × {siteMap.height}px
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      siteMap.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {siteMap.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Description:</span> {siteMap.description || 'No description'}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Created:</span> {new Date(siteMap.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Debug Info */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">API Endpoint:</span> /api/site-maps-simple
            </div>
            <div>
              <span className="font-medium">Authentication:</span> Disabled (for testing)
            </div>
            <div>
              <span className="font-medium">Site Maps Count:</span> {siteMaps.length}
            </div>
            <div>
              <span className="font-medium">Loading:</span> {isLoading ? 'Yes' : 'No'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
