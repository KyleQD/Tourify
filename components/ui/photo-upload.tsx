"use client"

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { X, Camera, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  onPhotosSelected: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // in MB
  disabled?: boolean
  className?: string
  showPreview?: boolean
}

export function PhotoUpload({
  onPhotosSelected,
  maxFiles = 10,
  maxSize = 10,
  disabled = false,
  className,
  showPreview = true
}: PhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [selectedFiles])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'))
    const validFiles = imageFiles.filter(file => file.size <= maxSize * 1024 * 1024)
    
    const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles)
    setSelectedFiles(newFiles)
    onPhotosSelected(newFiles)
  }, [selectedFiles, maxFiles, maxSize, onPhotosSelected])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']
    },
    multiple: true,
    disabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  })

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    onPhotosSelected(newFiles)
  }

  const handleFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      const imageFiles = files.filter(file => file.type.startsWith('image/'))
      const validFiles = imageFiles.filter(file => file.size <= maxSize * 1024 * 1024)
      
      const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles)
      setSelectedFiles(newFiles)
      onPhotosSelected(newFiles)
    }
    input.click()
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div {...getRootProps()} className="relative">
        <input {...getInputProps()} />
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleFileSelect}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-purple-400 hover:bg-purple-500/20"
            disabled={disabled}
          >
            <Camera className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
          
          {selectedFiles.length > 0 && (
            <span className="text-sm text-gray-400">
              {selectedFiles.length}/{maxFiles} photos selected
            </span>
          )}
        </div>

        {isDragActive && (
          <div className="absolute inset-0 bg-purple-500/20 border-2 border-dashed border-purple-400 rounded-lg flex items-center justify-center z-10">
            <div className="text-center text-purple-300">
              <Upload className="h-8 w-8 mx-auto mb-2" />
              <p>Drop photos here...</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Files Preview */}
      {showPreview && selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="relative group">
              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={previewUrls[index] || ''}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                onClick={() => removeFile(index)}
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-1 left-1 right-1">
                <div className="bg-black/50 rounded px-1 py-0.5">
                  <p className="text-xs text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-300">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
