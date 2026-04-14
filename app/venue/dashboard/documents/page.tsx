"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "../../components/navigation/page-header"
import { FeatureTabs } from "../../components/navigation/feature-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Download, Share2, MoreHorizontal, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

interface VenueDocument {
  id: string
  venue_id: string
  name: string
  description: string | null
  document_type: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    contract: "Contract",
    rider: "Rider",
    insurance: "Insurance",
    license: "License",
    safety: "Safety",
    marketing: "Marketing",
    other: "Other",
  }
  return labels[type] ?? type
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<VenueDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { id: "all", label: "All Documents" },
    { id: "contracts", label: "Contracts" },
    { id: "riders", label: "Riders" },
    { id: "legal", label: "Legal" },
    { id: "other", label: "Other" },
  ]

  useEffect(() => {
    async function loadDocuments() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError("Not authenticated")
          setIsLoading(false)
          return
        }

        const { data: venueProfile } = await supabase
          .from("venue_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (!venueProfile) {
          setDocuments([])
          setIsLoading(false)
          return
        }

        const { data, error: fetchError } = await supabase
          .from("venue_documents")
          .select("*")
          .eq("venue_id", venueProfile.id)
          .order("created_at", { ascending: false })

        if (fetchError) {
          console.error("Failed to load documents:", fetchError)
          setError(fetchError.message)
        } else {
          setDocuments(data ?? [])
        }
      } catch (err) {
        console.error("Failed to load documents:", err)
        setError("Failed to load documents")
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage your contracts, riders, and other documents"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <FeatureTabs tabs={tabs} defaultTab="all" />
        </div>
        <div className="relative w-full shrink-0 md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search documents..." className="pl-8 bg-muted/50 border-muted" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading documents…</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-destructive">{error}</div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">No documents yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload contracts, riders, and other files to keep everything organized.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-5 border-b px-4 py-3 text-sm font-medium">
                <div className="col-span-2">Name</div>
                <div>Type</div>
                <div>Date</div>
                <div>Actions</div>
              </div>
              <div className="divide-y">
                {documents.map((doc) => (
                  <div key={doc.id} className="grid grid-cols-5 items-center px-4 py-3 text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{doc.name}</span>
                      {doc.file_size != null && (
                        <span className="text-xs text-muted-foreground">({formatFileSize(doc.file_size)})</span>
                      )}
                    </div>
                    <div>{docTypeLabel(doc.document_type)}</div>
                    <div>{formatDate(doc.created_at)}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
