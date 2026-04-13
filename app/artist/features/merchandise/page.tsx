"use client"

import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { extractApiError } from "@/lib/api/extract-error"
import { 
  Plus, 
  ShoppingBag, 
  Edit, 
  Trash2, 
  Package,
  DollarSign,
  TrendingUp,
  Star,
  MoreHorizontal,
  Image as ImageIcon,
  RefreshCw
} from "lucide-react"
import Image from "next/image"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface MerchandiseItem {
  id?: string
  name: string
  description: string
  type: 'clothing' | 'accessories' | 'music' | 'collectibles' | 'other'
  price: number
  currency: string
  inventory_count: number
  sku?: string
  images: string[]
  sizes: string[]
  colors: string[]
  status: 'active' | 'inactive' | 'sold_out'
  is_featured: boolean
  created_at?: string
  updated_at?: string
}

export default function MerchandisePage() {
  const { user, profile, isLoading: isUserLoading } = useArtist()
  // Helper function to check if user is ready for content creation
  const isUserReady = () => {
    return !isUserLoading && user && profile
  }
  
  const [items, setItems] = useState<MerchandiseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<MerchandiseItem | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  
  // Editor form state
  const [formData, setFormData] = useState<MerchandiseItem>({
    name: '',
    description: '',
    type: 'clothing',
    price: 0,
    currency: 'USD',
    inventory_count: 0,
    sku: '',
    images: [],
    sizes: [],
    colors: [],
    status: 'active',
    is_featured: false
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [isImportingLegacy, setIsImportingLegacy] = useState(false)
  const [backfillPreview, setBackfillPreview] = useState<{
    totalLegacyItems: number
    alreadyMigrated: number
    pendingItems: number
  } | null>(null)

  useEffect(() => {
    if (user) {
      loadItems()
      void loadBackfillPreview()
    }
  }, [user])

  useEffect(() => {
    if (editingItem) {
      // Ensure proper types when editing
      setFormData({
        ...editingItem,
        price: typeof editingItem.price === 'string' ? parseFloat(editingItem.price) : editingItem.price,
        inventory_count: typeof editingItem.inventory_count === 'string' ? parseInt(editingItem.inventory_count) : editingItem.inventory_count
      })
    } else {
      // Reset form with proper initial values
      setFormData({
        name: '',
        description: '',
        type: 'clothing',
        price: 0,
        currency: 'USD',
        inventory_count: 0,
        sku: '',
        images: [],
        sizes: [],
        colors: [],
        status: 'active',
        is_featured: false
      })
    }
  }, [editingItem])

  const loadItems = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('artist_merchandise')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading merchandise:', error)
      toast.error('Failed to load merchandise items')
    } finally {
      setIsLoading(false)
    }
  }

  const loadBackfillPreview = async () => {
    try {
      const response = await fetch('/api/marketplace/migrations/backfill-artist-merch', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) return
      setBackfillPreview(body.data || null)
    } catch (error) {
      console.error('Error loading marketplace backfill preview:', error)
    }
  }

  const handleImportLegacyMerchandise = async () => {
    try {
      setIsImportingLegacy(true)
      const response = await fetch('/api/marketplace/migrations/backfill-artist-merch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, publishActiveItems: true }),
      })
      const body = await response.json()
      if (!response.ok) {
        toast.error(extractApiError(body, 'Failed to import legacy merch'))
        return
      }

      const insertedCount = Number(body.data?.inserted || 0)
      if (insertedCount > 0) toast.success(`Imported ${insertedCount} products into Marketplace`)
      else toast.success('No legacy products needed migration')

      await Promise.all([loadItems(), loadBackfillPreview()])
    } catch (error) {
      console.error('Error importing legacy merch:', error)
      toast.error('Failed to import legacy merch')
    } finally {
      setIsImportingLegacy(false)
    }
  }

  const handleSaveItem = async () => {
    // Debug logging
    console.log('Form data before validation:', formData)
    console.log('User:', user ? 'Present' : 'Missing')
    console.log('Profile:', profile ? 'Present' : 'Missing') 
    console.log('Loading state:', isUserLoading)
    
    // Comprehensive validation with better error messages
    const validationErrors = []
    
    // Check for both user and profile (required by artist context)
    if (!user) {
      validationErrors.push('User not authenticated')
    }
    
    if (!profile) {
      validationErrors.push('Artist profile not loaded. Please wait a moment and try again.')
    }
    
    // If still loading, prevent submission
    if (isUserLoading) {
      validationErrors.push('Please wait while your profile loads...')
    }
    
    if (!formData.name.trim()) {
      validationErrors.push('Product name is required')
    }
    
    // Ensure price is a valid number and greater than 0
    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price
    if (isNaN(price) || price <= 0) {
      validationErrors.push('Price must be greater than 0')
    }
    
    // Ensure inventory is a valid number (can be 0)
    const inventory = typeof formData.inventory_count === 'string' ? parseInt(formData.inventory_count) : formData.inventory_count
    if (isNaN(inventory) || inventory < 0) {
      validationErrors.push('Inventory must be 0 or greater')
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]) // Show first error
      console.log('Validation errors:', validationErrors)
      return
    }

    try {
      setIsSaving(true)
      
      // Ensure proper data types before saving
      const dataToSave = {
        ...formData,
        price: typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price,
        inventory_count: typeof formData.inventory_count === 'string' ? parseInt(formData.inventory_count) : formData.inventory_count,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (editingItem?.id) {
        // Update existing item
        const { error } = await supabase
          .from('artist_merchandise')
          .update(dataToSave)
          .eq('id', editingItem.id)
          .eq('user_id', user.id)

        if (error) throw error
        
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...dataToSave } : item
        ))
        toast.success('Merchandise item updated successfully!')
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('artist_merchandise')
          .insert(dataToSave)
          .select()
          .single()

        if (error) throw error
        
        if (data) {
          setItems(prev => [data, ...prev])
        }
        toast.success('Merchandise item created successfully!')
      }
      
      setShowEditor(false)
      setEditingItem(null)
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error('Failed to save merchandise item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('artist_merchandise')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Merchandise item deleted successfully')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete merchandise item')
    } finally {
      setDeleteItemId(null)
    }
  }

  const addSize = () => {
    if (newSize.trim() && !formData.sizes.includes(newSize.trim())) {
      setFormData(prev => ({
        ...prev,
        sizes: [...prev.sizes, newSize.trim()]
      }))
      setNewSize('')
    }
  }

  const removeSize = (sizeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter(size => size !== sizeToRemove)
    }))
  }

  const addColor = () => {
    if (newColor.trim() && !formData.colors.includes(newColor.trim())) {
      setFormData(prev => ({
        ...prev,
        colors: [...prev.colors, newColor.trim()]
      }))
      setNewColor('')
    }
  }

  const removeColor = (colorToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter(color => color !== colorToRemove)
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-300'
      case 'inactive': return 'bg-gray-600/20 text-gray-300'
      case 'sold_out': return 'bg-red-600/20 text-red-300'
      default: return 'bg-gray-600/20 text-gray-300'
    }
  }

  const getTotalStats = () => {
    return items.reduce((acc, item) => ({
      totalItems: acc.totalItems + 1,
      totalValue: acc.totalValue + (item.price * item.inventory_count),
      activeItems: acc.activeItems + (item.status === 'active' ? 1 : 0),
      totalInventory: acc.totalInventory + item.inventory_count
    }), { totalItems: 0, totalValue: 0, activeItems: 0, totalInventory: 0 })
  }

  const stats = getTotalStats()

  // Show loading state if user/profile aren't ready
  if (isUserLoading || !user || !profile) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-blue-500">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Merchandise</h1>
              <p className="text-gray-400">
                {isUserLoading ? 'Loading your profile...' : 'Manage your products and inventory'}
              </p>
            </div>
          </div>
          <Button 
            disabled
            className="bg-purple-600 hover:bg-purple-700 text-white opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Loading state */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {isUserLoading ? 'Loading your artist profile...' : 'Setting up your account...'}
            </h3>
            <p className="text-gray-400">
              {isUserLoading ? 'Please wait while we fetch your data.' : 'Please wait while we set up your artist account.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-blue-500">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Merchandise</h1>
            <p className="text-gray-400">Manage your products and inventory</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isImportingLegacy || !backfillPreview || backfillPreview.pendingItems === 0}
            onClick={() => void handleImportLegacyMerchandise()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isImportingLegacy ? 'Importing...' : 'Import to Marketplace'}
          </Button>
          <Button 
            onClick={() => {
              setEditingItem(null)
              setShowEditor(true)
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {backfillPreview ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 text-sm text-slate-300">
            Marketplace migration status: {backfillPreview.totalLegacyItems} legacy items, {backfillPreview.pendingItems} pending import, {backfillPreview.alreadyMigrated} already migrated.
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Products</p>
                <p className="text-2xl font-bold text-white">{stats.activeItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Inventory</p>
                <p className="text-2xl font-bold text-white">{stats.totalInventory}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inventory Value</p>
                <p className="text-2xl font-bold text-white">${stats.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-full mb-4"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No merchandise yet</h3>
            <p className="text-gray-400 mb-6">
              Start selling your products by adding your first merchandise item.
            </p>
            <Button 
              onClick={() => {
                setEditingItem(null)
                setShowEditor(true)
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="bg-slate-900/50 border-slate-700/50 group hover:border-purple-500/50 transition-all duration-200">
              <CardContent className="p-0">
                <div className="relative h-48 w-full bg-slate-800 flex items-center justify-center">
                  {item.images.length > 0 ? (
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-500" />
                  )}
                  {item.is_featured && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem 
                          onClick={() => {
                            setEditingItem(item)
                            setShowEditor(true)
                          }}
                          className="text-gray-300 hover:text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem 
                          onClick={() => setDeleteItemId(item.id!)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getStatusColor(item.status)}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                        {item.type}
                      </Badge>
                    </div>
                    <span className="text-xl font-bold text-green-400">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>Inventory: {item.inventory_count}</span>
                    {item.sku && <span>SKU: {item.sku}</span>}
                  </div>

                  {(item.sizes.length > 0 || item.colors.length > 0) && (
                    <div className="space-y-2">
                      {item.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.sizes.slice(0, 3).map((size) => (
                            <Badge
                              key={size}
                              variant="outline"
                              className="text-xs border-blue-500/30 text-blue-300"
                            >
                              {size}
                            </Badge>
                          ))}
                          {item.sizes.length > 3 && (
                            <Badge variant="outline" className="text-xs border-gray-500/30 text-gray-400">
                              +{item.sizes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {item.colors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.colors.slice(0, 3).map((color) => (
                            <Badge
                              key={color}
                              variant="outline"
                              className="text-xs border-green-500/30 text-green-300"
                            >
                              {color}
                            </Badge>
                          ))}
                          {item.colors.length > 3 && (
                            <Badge variant="outline" className="text-xs border-gray-500/30 text-gray-400">
                              +{item.colors.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? 'Edit Merchandise' : 'Add New Merchandise'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Product name..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product description..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-gray-300">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="collectibles">Collectibles</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sku" className="text-gray-300">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Product SKU..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Pricing & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-gray-300">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty string during typing, convert to number on blur
                        setFormData(prev => ({ 
                          ...prev, 
                          price: value === '' ? 0 : parseFloat(value) || 0
                        }))
                      }}
                      onBlur={(e) => {
                        // Ensure we have a valid number when leaving the field
                        const value = parseFloat(e.target.value) || 0
                        setFormData(prev => ({ ...prev, price: value }))
                      }}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inventory" className="text-gray-300">Inventory</Label>
                    <Input
                      id="inventory"
                      type="number"
                      min="0"
                      value={formData.inventory_count || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        // Allow empty string during typing, convert to number on blur
                        setFormData(prev => ({ 
                          ...prev, 
                          inventory_count: value === '' ? 0 : parseInt(value) || 0
                        }))
                      }}
                      onBlur={(e) => {
                        // Ensure we have a valid number when leaving the field
                        const value = parseInt(e.target.value) || 0
                        setFormData(prev => ({ ...prev, inventory_count: value }))
                      }}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-300">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="sold_out">Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="featured" className="text-gray-300">Featured Item</Label>
                </div>

                {/* Sizes */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Sizes</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      placeholder="Add size..."
                      className="bg-slate-800 border-slate-700 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && addSize()}
                    />
                    <Button type="button" onClick={addSize} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.sizes.map((size) => (
                      <Badge
                        key={size}
                        variant="secondary"
                        className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 cursor-pointer"
                        onClick={() => removeSize(size)}
                      >
                        {size} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Colors</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="Add color..."
                      className="bg-slate-800 border-slate-700 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && addColor()}
                    />
                    <Button type="button" onClick={addColor} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.colors.map((color) => (
                      <Badge
                        key={color}
                        variant="secondary"
                        className="bg-green-600/20 text-green-300 hover:bg-green-600/30 cursor-pointer"
                        onClick={() => removeColor(color)}
                      >
                        {color} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)} disabled={isSaving || isUserLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveItem} 
              disabled={isSaving || isUserLoading || !user || !profile} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUserLoading ? 'Loading Profile...' : isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Merchandise Item</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this merchandise item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && handleDeleteItem(deleteItemId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 