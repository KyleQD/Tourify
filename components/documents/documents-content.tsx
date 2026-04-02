"use client"

import { ArrowDown, ArrowUp, Grid, List, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentCard } from "@/components/documents/document-card"
import { DocumentRow } from "@/components/documents/document-row"
import type { Document, Folder, SortOption, ViewMode, SortDirection } from "./documents-management"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface DocumentsContentProps {
  documents: Document[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedDocument: string | null
  setSelectedDocument: (id: string | null) => void
  currentFolder: Folder | null
  sortBy: SortOption
  sortDirection: SortDirection
  toggleSort: (option: SortOption) => void
}

export function DocumentsContent({
  documents,
  viewMode,
  setViewMode,
  selectedDocument,
  setSelectedDocument,
  currentFolder,
  sortBy,
  sortDirection,
  toggleSort,
}: DocumentsContentProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f1117]">
      <div className="p-4 border-b border-[#1a1d29] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => setSelectedDocument(null)}>Documents</BreadcrumbLink>
            </BreadcrumbItem>
            {currentFolder && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink>{currentFolder.name}</BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#2a2f3e] rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "grid" ? "bg-[#2a2f3e]" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "list" ? "bg-[#2a2f3e]" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "list" && (
        <div className="border-b border-[#1a1d29] px-4 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-white/60">
          <div className="col-span-5 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("name")}>
            Name
            {sortBy === "name" &&
              (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("type")}>
            Type
            {sortBy === "type" &&
              (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("size")}>
            Size
            {sortBy === "size" &&
              (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("date")}>
            Modified
            {sortBy === "date" &&
              (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </div>
          <div className="col-span-1 text-right">
            <MoreHorizontal className="h-4 w-4 inline-block" />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-white/20 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-medium text-white mb-2">No Documents Found</h3>
            <p className="text-white/60 text-center max-w-md">
              {currentFolder
                ? `This folder is empty. Upload documents to the "${currentFolder.name}" folder to see them here.`
                : "No documents match your search criteria. Try a different search term or folder."}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid" ? "p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : ""
            }
          >
            {documents.map((document) =>
              viewMode === "grid" ? (
                <DocumentCard
                  key={document.id}
                  document={document}
                  isSelected={selectedDocument === document.id}
                  onClick={() => setSelectedDocument(document.id === selectedDocument ? null : document.id)}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                />
              ) : (
                <DocumentRow
                  key={document.id}
                  document={document}
                  isSelected={selectedDocument === document.id}
                  onClick={() => setSelectedDocument(document.id === selectedDocument ? null : document.id)}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                />
              ),
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
