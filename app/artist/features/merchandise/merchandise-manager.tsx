"use client"

import { supabase } from '@/lib/supabase'
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
import { 
  Save, 
  ArrowLeft, 
  ShoppingBag, 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  DollarSign,
  Package,
  TrendingUp,
  Star,
  MoreHorizontal
} from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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

interface MerchandiseEditorProps {
  item?: MerchandiseItem
  onSave: (item: MerchandiseItem) => void
  onCancel: () => void
}

function MerchandiseEditor({ item, onSave, onCancel }: MerchandiseEditorProps) {
  const { user } = useArtist()
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
    is_featured: false,
    ...item
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>(item?.images || [])
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(files)
    
    const previews = files.map(file => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      return URL.createObjectURL(file)
    })
    setImagePreviews([...imagePreviews, ...previews])
  }

  const uploadImages = async () => {
    if (!imageFiles.length || !user) return formData.images

    const uploadedUrls: string[] = []
    
    for (const file of imageFiles) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('artist-content')
          .upload(`merchandise/${fileName}`, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('artist-content')
          .getPublicUrl(`merchandise/${fileName}`)

        uploadedUrls.push(publicUrl)
      } catch (error) {
        console.error('Error uploading image:', error)
        toast.error('Failed to upload some images')
      }
    }
    
    return [...formData.images, ...uploadedUrls]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || formData.price <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsLoading(true)
      const images = await uploadImages()
      const itemToSave = { ...formData, images }
      onSave(itemToSave)
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error('Failed to save merchandise item')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {item ? 'Edit Merchandise' : 'Add New Merchandise'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

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
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description..."
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
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
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-gray-300">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory" className="text-gray-300">Inventory Count</Label>
              <Input
                id="inventory"
                type="number"
                min="0"
                value={formData.inventory_count}
                onChange={(e) => setFormData(prev => ({ ...prev, inventory_count: parseInt(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
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
          </CardContent>
        </Card>

        {/* Images */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="images" className="text-gray-300">Upload Images</Label>
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800">
                    <Image
                      src={preview}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variants */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Product Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sizes */}
            <div className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
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
            <div className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
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
    </form>
  )
}

export default function MerchandiseManager() {
  const { user, profile } = useArtist()
  const [items, setItems] = useState<MerchandiseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<MerchandiseItem | null>(null)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadItems()
    }
  }, [user])

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

  const handleSaveItem = async (itemData: MerchandiseItem) => {
    if (!user) return

    try {
      const dataToSave = {
        ...itemData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }

      if (itemData.id) {
        // Update existing item
        const { error } = await supabase
          .from('artist_merchandise')
          .update(dataToSave)
          .eq('id', itemData.id)
          .eq('user_id', user.id)

        if (error) throw error
        
        setItems(prev => prev.map(item => 
          item.id === itemData.id ? { ...item, ...dataToSave } : item
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

  if (showEditor) {
    return (
      <MerchandiseEditor
        item={editingItem || undefined}
        onSave={handleSaveItem}
        onCancel={() => {
          setShowEditor(false)
          setEditingItem(null)
        }}
      />
    )
  }

  const stats = getTotalStats()

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
            <p className="text-gray-400">Manage your products and inventory</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowEditor(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

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
              onClick={() => setShowEditor(true)}
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
                {item.images.length > 0 && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    {item.is_featured && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
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

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Inventory: {item.inventory_count}</span>
                    {item.sku && <span>SKU: {item.sku}</span>}
                  </div>

                  {(item.sizes.length > 0 || item.colors.length > 0) && (
                    <div className="mt-3 space-y-2">
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