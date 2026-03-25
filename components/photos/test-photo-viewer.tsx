'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PhotoViewer } from './photo-viewer'

export function TestPhotoViewer() {
  const [isOpen, setIsOpen] = useState(false)

  const testPhotos = [
    'https://picsum.photos/800/600?random=1',
    'https://picsum.photos/800/600?random=2',
    'https://picsum.photos/800/600?random=3'
  ]

  const testPost = {
    id: 'test-1',
    content: 'Test post with photos',
    likes_count: 5,
    comments_count: 2,
    shares_count: 1
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Test Photo Viewer</h3>
      <Button onClick={() => setIsOpen(true)}>
        Open Photo Viewer
      </Button>
      
      <PhotoViewer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        photos={testPhotos}
        initialIndex={0}
        post={testPost}
      />
    </div>
  )
}



