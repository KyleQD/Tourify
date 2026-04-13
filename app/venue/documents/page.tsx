"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadVenueDocument } from "../actions/document-actions"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { useCurrentVenue } from "../hooks/useCurrentVenue"
import { venueService } from "@/lib/services/venue.service"
import { LoadingSpinner } from "../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import {
  FileText,
  Upload,
  Download,
  Eye,
  Share2,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Folder,
  FolderOpen,
  Image,
  Video,
  Music,
  Archive,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Lock,
  Unlock,
  Star,
  Edit,
  Copy,
  History,
  Settings,
  Grid,
  List,
  Calendar,
  Tag,
  Shield,
  Link,
} from "lucide-react"

interface Document {
  id: string
  name: string
  description?: string
  document_type: "contract" | "rider" | "insurance" | "license" | "safety" | "marketing" | "other"
  file_url: string
  file_size: number
  mime_type: string
  is_public: boolean
  uploaded_by: string
  created_at: string
  updated_at: string
  tags?: string[]
  folder_id?: string
  version?: number
  download_count?: number
  last_accessed?: string
}

interface Folder {
  id: string
  name: string
  description?: string
  parent_id?: string
  document_count: number
  created_at: string
  color?: string
}

const documentTypes = [
  { value: "contract", label: "Contracts", icon: FileText, color: "text-blue-500" },
  { value: "rider", label: "Riders", icon: FileText, color: "text-purple-500" },
  { value: "insurance", label: "Insurance", icon: Shield, color: "text-green-500" },
  { value: "license", label: "Licenses", icon: CheckCircle, color: "text-yellow-500" },
  { value: "safety", label: "Safety", icon: AlertCircle, color: "text-red-500" },
  { value: "marketing", label: "Marketing", icon: Image, color: "text-pink-500" },
  { value: "other", label: "Other", icon: Folder, color: "text-gray-500" },
]

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image
  if (mimeType.startsWith("video/")) return Video
  if (mimeType.startsWith("audio/")) return Music
  if (mimeType.includes("pdf")) return FileText
  if (mimeType.includes("zip") || mimeType.includes("rar")) return Archive
  return FileText
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function DocumentsPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
  // Upload states
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    if (venue?.id) {
      fetchDocuments()
    }
  }, [venue?.id, currentFolder])

  const fetchDocuments = async () => {
    if (!venue?.id) return
    
    try {
      setIsLoading(true)
      const documentsData = await venueService.getVenueDocuments(venue.id)
      
      // Mock enhanced document data with additional fields
      const enhancedDocuments: Document[] = documentsData.map((doc, i) => ({
        ...doc,
        description: doc.description || undefined,
        file_size: doc.file_size || 0,
        mime_type: doc.mime_type || 'application/octet-stream',
        uploaded_by: doc.uploaded_by || 'Unknown',
        tags: i % 3 === 0 ? ["Important", "Updated"] : i % 2 === 0 ? ["Draft"] : [],
        version: Math.floor(Math.random() * 3) + 1,
        download_count: Math.floor(Math.random() * 50),
        last_accessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))
      
      setDocuments(enhancedDocuments)
      
      // Mock folders
      setFolders([
        { id: "folder-1", name: "Contracts", document_count: 5, created_at: "2024-01-15T10:00:00Z", color: "blue" },
        { id: "folder-2", name: "Marketing Materials", document_count: 12, created_at: "2024-02-01T10:00:00Z", color: "purple" },
        { id: "folder-3", name: "Technical Specs", document_count: 8, created_at: "2024-02-15T10:00:00Z", color: "green" },
        { id: "folder-4", name: "Legal Documents", document_count: 3, created_at: "2024-03-01T10:00:00Z", color: "red" },
      ])
      
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredDocuments = documents
    .filter(doc => {
      // Search filter
      if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !doc.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false
      
      // Type filter
      if (typeFilter !== "all" && doc.document_type !== typeFilter) return false
      
      // Folder filter
      if (currentFolder && doc.folder_id !== currentFolder) return false
      if (!currentFolder && doc.folder_id) return false
      
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case "size":
          comparison = a.file_size - b.file_size
          break
        case "type":
          comparison = a.document_type.localeCompare(b.document_type)
          break
        default:
          comparison = 0
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

  const handleFileUpload = async (files: FileList) => {
    if (!venue?.id) return
    const fileArray = Array.from(files)
    setUploadingFiles(fileArray)
    for (const file of fileArray) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }))
        const res = await uploadVenueDocument({ venueId: venue.id, file, name: file.name, documentType: 'other', isPublic: false })
        if (!res.success) {
          toast({ title: 'Upload Failed', description: res.error || `Failed to upload ${file.name}`, variant: 'destructive' })
        } else {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
          toast({ title: 'File Uploaded', description: `${file.name} has been uploaded successfully.` })
        }
      } catch (error) {
        toast({ title: 'Upload Failed', description: `Failed to upload ${file.name}`, variant: 'destructive' })
      }
    }
    setUploadingFiles([])
    setUploadProgress({})
    setIsUploadModalOpen(false)
  }

  const handleBulkAction = (action: string) => {
    const count = selectedDocuments.length
    
    switch (action) {
      case "download":
        toast({
          title: "Download Started",
          description: `Downloading ${count} document${count > 1 ? 's' : ''}...`,
        })
        break
      case "delete":
        setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)))
        toast({
          title: "Documents Deleted",
          description: `${count} document${count > 1 ? 's' : ''} deleted successfully.`,
        })
        break
      case "share":
        setIsShareModalOpen(true)
        return
    }
    
    setSelectedDocuments([])
  }

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    )
  }

  const selectAllVisible = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id))
    }
  }

  if (venueLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No Venue Found</h2>
        <p className="text-muted-foreground">Please set up your venue profile first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
          <p className="text-muted-foreground break-words">
            Organize and manage documents for {venue.venue_name || venue.name}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)}>
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">Across all folders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(documents.reduce((sum, doc) => sum + doc.file_size, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Of available space</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Documents</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(doc => doc.is_public).length}
            </div>
            <p className="text-xs text-muted-foreground">Publicly accessible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(doc => {
                const uploadDate = new Date(doc.created_at)
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                return uploadDate > weekAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(null)}
                className={currentFolder === null ? "bg-muted" : ""}
              >
                <Folder className="h-4 w-4 mr-1" />
                Root
              </Button>
              {currentFolder && (
                <>
                  <span>/</span>
                  <Button variant="ghost" size="sm" className="bg-muted">
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {folders.find(f => f.id === currentFolder)?.name}
                  </Button>
                </>
              )}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="min-w-[120px]">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>

                {selectedDocuments.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction("download")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download ({selectedDocuments.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction("share")}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto p-1 [&>*]:shrink-0">
          <TabsTrigger value="files">Files & Folders</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
          <TabsTrigger value="trash">Trash</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          {/* Folders */}
          {!currentFolder && folders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Folders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      <div className={`mr-3 text-${folder.color || 'blue'}-500`}>
                        <Folder className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {folder.document_count} document{folder.document_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Documents {currentFolder && `in ${folders.find(f => f.id === currentFolder)?.name}`}
                </CardTitle>
                {filteredDocuments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDocuments.length === filteredDocuments.length}
                      onCheckedChange={selectAllVisible}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select all ({filteredDocuments.length})
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-muted-foreground mb-4">
                    {documents.length === 0 ? 
                      "No documents uploaded yet. Upload your first document to get started." :
                      "No documents match your current filters."
                    }
                  </div>
                  {documents.length === 0 && (
                    <Button onClick={() => setIsUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                  )}
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                  {filteredDocuments.map((document) => {
                    const FileIcon = getFileIcon(document.mime_type)
                    const typeConfig = documentTypes.find(t => t.value === document.document_type)
                    
                    return (
                      <div
                        key={document.id}
                        className={`${viewMode === "grid" ? "p-4 border rounded-lg hover:shadow-md" : "flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"} transition-all cursor-pointer`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            checked={selectedDocuments.includes(document.id)}
                            onCheckedChange={() => toggleDocumentSelection(document.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div className={typeConfig?.color || "text-gray-500"}>
                            <FileIcon className="h-8 w-8" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{document.name}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{typeConfig?.label || "Other"}</span>
                              <span>•</span>
                              <span>{formatFileSize(document.file_size)}</span>
                              <span>•</span>
                              <span>{format(new Date(document.created_at), "MMM d, yyyy")}</span>
                            </div>
                            
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {document.tags.map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {document.is_public && (
                                <div className="flex items-center">
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Public
                                </div>
                              )}
                              {document.download_count !== undefined && (
                                <div className="flex items-center">
                                  <Download className="h-3 w-3 mr-1" />
                                  {document.download_count} downloads
                                </div>
                              )}
                              {document.version && document.version > 1 && (
                                <div className="flex items-center">
                                  <History className="h-3 w-3 mr-1" />
                                  v{document.version}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <History className="h-4 w-4 mr-2" />
                                Version History
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Accessed</CardTitle>
              <CardDescription>Documents you've viewed or downloaded recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">Recent documents will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shared">
          <Card>
            <CardHeader>
              <CardTitle>Shared Documents</CardTitle>
              <CardDescription>Documents shared with clients and team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.filter(doc => doc.is_public).map((document) => {
                  const FileIcon = getFileIcon(document.mime_type)
                  return (
                    <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileIcon className="h-6 w-6 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{document.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Shared • {formatFileSize(document.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Public</Badge>
                        <Button variant="outline" size="sm">
                          <Link className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash">
          <Card>
            <CardHeader>
              <CardTitle>Trash</CardTitle>
              <CardDescription>Deleted documents (auto-deleted after 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No deleted documents</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              Upload files to your venue document library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select Files</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="mt-1"
              />
            </div>
            
            {uploadingFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploading...</Label>
                {uploadingFiles.map((file) => (
                  <div key={file.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{file.name}</span>
                      <span>{uploadProgress[file.name] || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name] || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your documents into folders
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Textarea
                id="folder-description"
                placeholder="Enter folder description"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Folder Created",
                description: "New folder has been created successfully."
              })
              setIsCreateFolderOpen(false)
            }}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 