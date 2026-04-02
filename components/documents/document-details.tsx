"use client"

import { Download, Link, Share2, Star, Trash, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Document } from "./documents-management"
import { getFileIcon } from "./file-icons"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface DocumentDetailsProps {
  document: Document
  onClose: () => void
  setIsShareDialogOpen: (open: boolean) => void
}

export function DocumentDetails({ document, onClose, setIsShareDialogOpen }: DocumentDetailsProps) {
  const FileTypeIcon = getFileIcon(document.type)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatSafeDate(date.toISOString())
  }

  return (
    <div className="w-80 border-l border-[#1a1d29] bg-[#0f1117] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#1a1d29] flex justify-between items-center">
        <h2 className="text-lg font-medium">Document Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col items-center text-center mb-6">
          {document.thumbnailUrl ? (
            <div className="h-32 w-32 rounded-md overflow-hidden mb-3">
              <img
                src={document.thumbnailUrl || "/placeholder.svg"}
                alt={document.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-32 w-32 flex items-center justify-center mb-3">
              <FileTypeIcon className="h-24 w-24" />
            </div>
          )}
          <h3 className="font-medium text-base break-words">{document.name}</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/60">Document Information</h4>
            <div className="bg-[#1a1d29] rounded-md p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Type</span>
                <span className="uppercase">{document.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Size</span>
                <span>{formatFileSize(document.size)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Created By</span>
                <span>{document.createdBy}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Last Modified</span>
                <span>{formatDate(document.lastModified)}</span>
              </div>
            </div>
          </div>

          {document.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white/60">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag) => (
                  <span key={tag} className="inline-block px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/60">Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a2f3e] text-white hover:bg-[#2a2f3e] justify-start"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a2f3e] text-white hover:bg-[#2a2f3e] justify-start"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a2f3e] text-white hover:bg-[#2a2f3e] justify-start"
              >
                <Star className={`mr-2 h-4 w-4 ${document.starred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                {document.starred ? "Unstar" : "Star"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#2a2f3e] text-white hover:bg-[#2a2f3e] justify-start"
              >
                <Link className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#1a1d29]">
        <Button variant="destructive" className="w-full justify-center">
          <Trash className="mr-2 h-4 w-4" />
          Delete Document
        </Button>
      </div>
    </div>
  )
}
