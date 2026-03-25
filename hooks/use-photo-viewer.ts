'use client'

import { useState } from 'react'

interface PhotoViewerState {
  isOpen: boolean
  photos: string[]
  initialIndex: number
  post: any
}

export function usePhotoViewer() {
  const [viewerState, setViewerState] = useState<PhotoViewerState>({
    isOpen: false,
    photos: [],
    initialIndex: 0,
    post: null
  })

  const openPhotoViewer = (photos: string[], initialIndex: number, post: any) => {
    setViewerState({
      isOpen: true,
      photos,
      initialIndex,
      post
    })
  }

  const closePhotoViewer = () => {
    setViewerState(prev => ({
      ...prev,
      isOpen: false
    }))
  }

  return {
    ...viewerState,
    openPhotoViewer,
    closePhotoViewer
  }
}
