"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { featureUnavailableMessage, isFeatureUnavailableResponse } from "@/lib/api/feature-unavailable"
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Shield,
  Lock,
  Eye,
  Loader2,
  CheckCircle,
  AlertTriangle,
  File,
  Image,
} from "lucide-react"

interface EventSecureUploadsProps {
  eventId: string
  isAdmin: boolean
  taskMessageId?: string
}

interface SecureUpload {
  id: string
  event_id: string
  uploaded_by: string
  original_name: string
  file_size: number
  mime_type: string
  category: string
  classification: string
  created_at: string
  file_hash: string
  task_message_id?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  credentials: 'Credentials',
  safety: 'Safety Cert',
  contract: 'Contract',
  license: 'License',
  insurance: 'Insurance',
  identity: 'ID Document',
  medical: 'Medical',
  tax: 'Tax Document',
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
  public: { label: 'Public', color: 'bg-green-500/20 text-green-400' },
  internal: { label: 'Internal', color: 'bg-blue-500/20 text-blue-400' },
  confidential: { label: 'Confidential', color: 'bg-orange-500/20 text-orange-400' },
  restricted: { label: 'Restricted', color: 'bg-red-500/20 text-red-400' },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  return FileText
}

function buildFetchInit(extra?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...extra,
    headers: { 'Cache-Control': 'no-cache', ...(extra?.headers || {}) },
  }
}

export function EventSecureUploads({ eventId, isAdmin, taskMessageId }: EventSecureUploadsProps) {
  const [uploads, setUploads] = useState<SecureUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [category, setCategory] = useState('general')
  const [classification, setClassification] = useState('confidential')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchUploads = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/events/${eventId}/secure-uploads`, buildFetchInit())
      const data = await res.json()
      if (data.success) setUploads(data.uploads || [])
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { void fetchUploads() }, [fetchUploads])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX, TXT')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit')
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      formData.append('classification', classification)
      if (taskMessageId) formData.append('task_message_id', taskMessageId)

      setUploadProgress(30)

      const res = await fetch(`/api/admin/events/${eventId}/secure-uploads`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      setUploadProgress(80)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (isFeatureUnavailableResponse(res.status, err))
          throw new Error(featureUnavailableMessage(err, 'Secure uploads are temporarily unavailable.'))
        throw new Error(err.error || 'Upload failed')
      }

      setUploadProgress(100)
      toast.success('File uploaded securely')
      await fetchUploads()
    } catch (e: any) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDownload(uploadId: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/secure-uploads?id=${uploadId}`, buildFetchInit())
      const data = await res.json()

      if (!data.success || !data.download_url) {
        toast.error('Failed to generate download link')
        return
      }

      const link = document.createElement('a')
      link.href = data.download_url
      link.download = data.file_name || 'download'
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Download started — link expires in 5 minutes')
    } catch {
      toast.error('Download failed')
    }
  }

  async function handleDelete(uploadId: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/secure-uploads?id=${uploadId}`, buildFetchInit({ method: 'DELETE' }))
      if (!res.ok) throw new Error()
      toast.success('File deleted')
      await fetchUploads()
    } catch {
      toast.error('Failed to delete file')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Secure Uploads</h3>
            <p className="text-xs text-slate-400">Encrypted storage with audit logging and time-limited access</p>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Security measures active:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Files stored in encrypted private storage bucket</li>
              <li>SHA-256 hash verification on every upload</li>
              <li>Time-limited download links (5 min expiry)</li>
              <li>Full audit trail — every access is logged</li>
              <li>Only admins can view all uploads; members see only their own</li>
              <li>Allowed types: PDF, JPEG, PNG, WebP, DOC, DOCX, TXT (25MB max)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <Card className="bg-slate-900/50 border-slate-700/50 border-dashed">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Classification</Label>
                <Select value={classification} onValueChange={setClassification}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {Object.entries(CLASSIFICATION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-1.5">
                          {k === 'restricted' && <Lock className="h-3 w-3 text-red-400" />}
                          {v.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
                className="hidden"
                disabled={uploading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-amber-600/80 to-orange-600/80 text-white"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? 'Uploading securely...' : 'Upload Secure Document'}
              </Button>
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-1.5" />
                <p className="text-xs text-slate-500 text-center">
                  {uploadProgress < 30 ? 'Preparing...' : uploadProgress < 80 ? 'Uploading & encrypting...' : 'Verifying...'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploads list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          No secure uploads yet
        </div>
      ) : (
        <div className="space-y-2">
          {uploads.map((upload) => {
            const FileIcon = getFileIcon(upload.mime_type)
            const classConfig = CLASSIFICATION_CONFIG[upload.classification] || CLASSIFICATION_CONFIG.internal

            return (
              <Card key={upload.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 bg-slate-800 rounded">
                        <FileIcon className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{upload.original_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{formatFileSize(upload.file_size)}</span>
                          <Badge className={`${classConfig.color} text-[10px] px-1.5 py-0`}>{classConfig.label}</Badge>
                          <Badge className="bg-slate-700/50 text-slate-400 text-[10px] px-1.5 py-0">
                            {CATEGORY_LABELS[upload.category] || upload.category}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(upload.id)}
                        className="border-slate-600 text-slate-300 h-7 text-xs"
                        title="Download (generates a 5-minute signed link)"
                      >
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(upload.id)}
                          className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600">
                    <Shield className="h-3 w-3" />
                    <span>SHA-256: {upload.file_hash?.slice(0, 16)}...</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
