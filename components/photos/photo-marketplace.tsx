"use client"

import React, { useState, useEffect } from 'react'
import { Search, ShoppingCart, Heart, Eye, Filter, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface MarketplacePhoto {
  id: string
  title?: string
  description?: string
  preview_url: string
  thumbnail_url: string
  watermarked_url?: string
  dimensions: { width: number; height: number }
  category?: string
  photographer_name?: string
  sale_price: number
  license_type: string
  usage_rights?: string
  likes: number
  views: number
  purchases: number
  tags: string[]
  created_at: string
  user_id: string
}

interface PhotoMarketplaceProps {
  userId?: string
}

export function PhotoMarketplace({ userId }: PhotoMarketplaceProps) {
  const [photos, setPhotos] = useState<MarketplacePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  const [licenseType, setLicenseType] = useState<string>('')
  const [priceRange, setPriceRange] = useState<string>('')
  const [selectedPhoto, setSelectedPhoto] = useState<MarketplacePhoto | null>(null)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<string>('')
  const [purchasing, setPurchasing] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    fetchPhotos()
  }, [category, licenseType, priceRange])

  const fetchPhotos = async () => {
    try {
      const params = new URLSearchParams()
      if (category) params.append('category', category)
      if (licenseType) params.append('licenseType', licenseType)
      if (priceRange) {
        const [min, max] = priceRange.split('-')
        if (min) params.append('minPrice', min)
        if (max) params.append('maxPrice', max)
      }
      params.append('limit', '20')
      params.append('offset', '0')

      const response = await fetch(`/api/photos/marketplace?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch photos')

      const data = await response.json()
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast({
        title: 'Error',
        description: 'Failed to load marketplace photos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePurchaseClick = (photo: MarketplacePhoto) => {
    setSelectedPhoto(photo)
    setSelectedLicense(photo.license_type)
    setPurchaseModalOpen(true)
  }

  const handlePurchase = async () => {
    if (!selectedPhoto) return

    setPurchasing(true)

    try {
      const response = await fetch('/api/photos/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: selectedPhoto.id,
          licenseType: selectedLicense
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Purchase failed')
      }

      const { checkoutUrl } = await response.json()
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('Purchase error:', error)
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to initiate purchase',
        variant: 'destructive'
      })
      setPurchasing(false)
    }
  }

  const filteredPhotos = photos.filter(photo => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      photo.title?.toLowerCase().includes(query) ||
      photo.description?.toLowerCase().includes(query) ||
      photo.photographer_name?.toLowerCase().includes(query) ||
      photo.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photo Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Purchase high-quality professional photos
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="behind_scenes">Behind the Scenes</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger>
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Price</SelectItem>
              <SelectItem value="0-25">Under $25</SelectItem>
              <SelectItem value="25-50">$25 - $50</SelectItem>
              <SelectItem value="50-100">$50 - $100</SelectItem>
              <SelectItem value="100-">Over $100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Photo Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">No photos found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group">
              <div className="relative aspect-square">
                <img
                  src={photo.watermarked_url || photo.preview_url}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover"
                />

                {/* Price Badge */}
                <Badge className="absolute top-2 left-2 bg-black/80 text-white">
                  ${photo.sale_price}
                </Badge>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                  <h3 className="text-white font-semibold mb-2 line-clamp-2">
                    {photo.title || 'Untitled'}
                  </h3>
                  {photo.photographer_name && (
                    <p className="text-white/80 text-sm mb-3">
                      by {photo.photographer_name}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-white/80 text-sm mb-4">
                    <span className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {photo.likes}
                    </span>
                    <span className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {photo.views}
                    </span>
                  </div>
                  <Button
                    onClick={() => handlePurchaseClick(photo)}
                    className="w-full"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Purchase
                  </Button>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {photo.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {photo.license_type} license
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {photo.purchases} sold
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Purchase Modal */}
      <Dialog open={purchaseModalOpen} onOpenChange={setPurchaseModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Photo</DialogTitle>
            <DialogDescription>
              Select a license type and proceed to checkout
            </DialogDescription>
          </DialogHeader>

          {selectedPhoto && (
            <div className="space-y-6">
              {/* Photo Preview */}
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedPhoto.watermarked_url || selectedPhoto.preview_url}
                  alt={selectedPhoto.title || 'Photo'}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Photo Info */}
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {selectedPhoto.title || 'Untitled'}
                </h3>
                {selectedPhoto.photographer_name && (
                  <p className="text-muted-foreground mb-2">
                    by {selectedPhoto.photographer_name}
                  </p>
                )}
                {selectedPhoto.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPhoto.description}
                  </p>
                )}
              </div>

              {/* License Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Select License Type
                </Label>
                <RadioGroup value={selectedLicense} onValueChange={setSelectedLicense}>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="personal" id="personal" />
                      <div className="flex-1">
                        <Label htmlFor="personal" className="font-medium cursor-pointer">
                          Personal Use
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          For personal projects, social media, and non-commercial use
                        </p>
                      </div>
                      <span className="font-semibold">${selectedPhoto.sale_price}</span>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="commercial" id="commercial" />
                      <div className="flex-1">
                        <Label htmlFor="commercial" className="font-medium cursor-pointer">
                          Commercial Use
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          For advertising, marketing, and commercial projects
                        </p>
                      </div>
                      <span className="font-semibold">${(selectedPhoto.sale_price * 2).toFixed(2)}</span>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="editorial" id="editorial" />
                      <div className="flex-1">
                        <Label htmlFor="editorial" className="font-medium cursor-pointer">
                          Editorial Use
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          For news, educational content, and documentaries
                        </p>
                      </div>
                      <span className="font-semibold">${(selectedPhoto.sale_price * 1.5).toFixed(2)}</span>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="exclusive" id="exclusive" />
                      <div className="flex-1">
                        <Label htmlFor="exclusive" className="font-medium cursor-pointer">
                          Exclusive Rights
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Full exclusive rights, photo removed from marketplace
                        </p>
                      </div>
                      <span className="font-semibold">${(selectedPhoto.sale_price * 5).toFixed(2)}</span>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPurchaseModalOpen(false)}
              disabled={purchasing}
            >
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={purchasing || !selectedLicense}>
              {purchasing ? (
                'Processing...'
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

