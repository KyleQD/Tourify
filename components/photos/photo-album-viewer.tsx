"use client"

import React, { useState, useEffect } from 'react'
import { Heart, Share2, Eye, MoreVertical, Edit, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Photo {
  id: string
  title?: string
  description?: string
  preview_url: string
  thumbnail_url: string
  watermarked_url?: string
  dimensions: { width: number; height: number }
  likes: number
  views: number
  is_for_sale: boolean
  sale_price?: number
  license_type?: string
  created_at: string
}

interface Album {
  id: string
  title: string
  description?: string
  photo_count: number
  total_views: number
  total_likes: number
  is_public: boolean
  category?: string
  created_at: string
  user_id: string
}

interface PhotoAlbumViewerProps {
  albumId: string
  isOwner?: boolean
  onEditAlbum?: () => void
  onDeleteAlbum?: () => void
  onEditPhoto?: (photoId: string) => void
  onDeletePhoto?: (photoId: string) => void
}

export function PhotoAlbumViewer({
  albumId,
  isOwner = false,
  onEditAlbum,
  onDeleteAlbum,
  onEditPhoto,
  onDeletePhoto
}: PhotoAlbumViewerProps) {
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchAlbum()
  }, [albumId])

  const fetchAlbum = async () => {
    try {
      const response = await fetch(`/api/photos/albums/${albumId}`)
      if (!response.ok) throw new Error('Failed to fetch album')
      
      const data = await response.json()
      setAlbum(data.album)
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error fetching album:', error)
      toast({
        title: 'Error',
        description: 'Failed to load album',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLikePhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/like`, {
        method: 'POST'
      })

      if (response.ok) {
        setPhotos(prev => prev.map(p =>
          p.id === photoId ? { ...p, likes: p.likes + 1 } : p
        ))
      } else {
        throw new Error('Failed to like photo')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to like photo',
        variant: 'destructive'
      })
    }
  }

  const handleUnlikePhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/like`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPhotos(prev => prev.map(p =>
          p.id === photoId ? { ...p, likes: Math.max(0, p.likes - 1) } : p
        ))
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unlike photo',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!album) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Album Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{album.title}</h1>
            {album.description && (
              <p className="text-muted-foreground mb-4">{album.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{album.photo_count} photos</span>
              <span>•</span>
              <span className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {album.total_views} views
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Heart className="h-4 w-4 mr-1" />
                {album.total_likes} likes
              </span>
              {album.category && (
                <>
                  <span>•</span>
                  <Badge variant="secondary">{album.category}</Badge>
                </>
              )}
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEditAlbum}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Album
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDeleteAlbum}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Album
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">No photos in this album yet</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group cursor-pointer">
              <div 
                className="relative aspect-square"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.watermarked_url || photo.preview_url}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <p className="font-medium mb-2">
                      {photo.title || 'Untitled'}
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      <span className="flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        {photo.likes}
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {photo.views}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sale Badge */}
                {photo.is_for_sale && photo.sale_price && (
                  <Badge className="absolute top-2 left-2">
                    ${photo.sale_price}
                  </Badge>
                )}

                {/* Owner Actions */}
                {isOwner && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditPhoto?.(photo.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeletePhoto?.(photo.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              {/* Photo Info */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {photo.title && (
                      <p className="font-medium truncate">{photo.title}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleLikePhoto(photo.id)}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Modal (simplified - in production use a proper lightbox) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-6xl max-h-[90vh] relative">
            <img
              src={selectedPhoto.watermarked_url || selectedPhoto.preview_url}
              alt={selectedPhoto.title || 'Photo'}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <Button
              variant="secondary"
              className="absolute top-4 right-4"
              onClick={() => setSelectedPhoto(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

