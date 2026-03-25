'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react'

interface PhotoViewerProps {
  isOpen: boolean
  onClose: () => void
  photos: string[]
  initialIndex: number
  post: any
}

export function PhotoViewer({ isOpen, onClose, photos, initialIndex, post }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Debug logging
  console.log('🖼️ PhotoViewer render:', {
    isOpen,
    photos,
    initialIndex,
    currentIndex,
    post: post?.id,
    photosLength: photos?.length,
    currentPhoto: photos?.[currentIndex]
  })

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, photos.length, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const nextPhoto = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevPhoto = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (!isOpen) return null

  // Safety check for photos array
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    console.error('❌ PhotoViewer: Invalid photos array:', photos)
    return null
  }

  // Safety check for current index
  if (currentIndex < 0 || currentIndex >= photos.length) {
    console.error('❌ PhotoViewer: Invalid currentIndex:', currentIndex, 'photos length:', photos.length)
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Left Sidebar */}
      <div className="w-96 bg-gray-900 text-white flex flex-col border-r border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-bold text-lg">Post Details</h3>
          <p className="text-sm text-gray-400 mt-2">
            {post?.content || 'No description'}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2">
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-xs">{post?.likes_count || 0}</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8 px-2">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{post?.comments_count || 0}</span>
            </Button>
          </div>
        </div>

        {/* Photo Info */}
        <div className="p-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {currentIndex + 1} of {photos.length}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Photo */}
      <div className="flex-1 flex items-center justify-center relative bg-black min-h-0">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-10 text-white hover:bg-white/20 disabled:opacity-50"
              onClick={prevPhoto}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-10 text-white hover:bg-white/20 disabled:opacity-50"
              onClick={nextPhoto}
              disabled={currentIndex === photos.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Main Image */}
        <div className="w-full h-full p-4 flex items-center justify-center">
          {photos[currentIndex] ? (
            <img
              key={currentIndex}
              src={photos[currentIndex]}
              alt={`Photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              style={{ 
                maxHeight: 'calc(100vh - 32px)',
                maxWidth: 'calc(100vw - 448px)' // Account for sidebar width
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', photos[currentIndex])
              }}
              onError={(e) => {
                console.error('❌ Failed to load image:', photos[currentIndex])
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-lg">No photo to display</p>
              <p className="text-gray-400 text-sm mt-2">
                Photo URL: {photos[currentIndex]}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Current index: {currentIndex}, Total photos: {photos.length}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
