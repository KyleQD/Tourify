"use client"

import { AlertTriangle, CheckCircle2, ExternalLink, FileText, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { HiringCandidateDocument, StaffDocumentStatus } from "@/types/hiring-candidate-workflow"
import { useState } from "react"

interface CandidateDocumentReviewProps {
  documents?: HiringCandidateDocument[]
  disabled?: boolean
  onReviewDocument?: (args: { documentId: string; status: "verified" | "rejected"; rejectionReason?: string }) => Promise<void>
}

function getDocumentStatusClassName(status: StaffDocumentStatus): string {
  if (status === "verified") return "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
  if (status === "rejected") return "border-destructive/40 text-destructive"
  if (status === "expired") return "border-amber-500/40 text-amber-600 dark:text-amber-400"
  return "border-blue-500/40 text-blue-600 dark:text-blue-400"
}

export function CandidateDocumentReview({ documents = [], disabled, onReviewDocument }: CandidateDocumentReviewProps) {
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null)

  async function handleReview(documentId: string, status: "verified" | "rejected") {
    if (!onReviewDocument) return
    setPendingDocumentId(documentId)
    try {
      await onReviewDocument({
        documentId,
        status,
        rejectionReason: status === "rejected" ? rejectionReasons[documentId] : undefined,
      })
    } finally {
      setPendingDocumentId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No onboarding documents have been submitted yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Document Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.map((document) => (
          <div key={document.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{document.label}</p>
                  {document.required ? <Badge variant="secondary">Required</Badge> : null}
                  {document.blocking ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      Blocking
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[document.fileName, document.documentType, document.uploadedAt ? `Uploaded ${new Date(document.uploadedAt).toLocaleDateString()}` : null]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                {document.rejectionReason ? (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {document.rejectionReason}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("capitalize", getDocumentStatusClassName(document.status))}>
                  {document.status.replace("_", " ")}
                </Badge>
                {document.signedUrl ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={document.signedUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            {onReviewDocument ? (
              <div className="mt-4 space-y-3">
                <Textarea
                  value={rejectionReasons[document.id] ?? ""}
                  onChange={(event) => setRejectionReasons((current) => ({ ...current, [document.id]: event.target.value }))}
                  placeholder="Optional rejection reason or review note"
                  disabled={disabled || pendingDocumentId === document.id}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReview(document.id, "verified")}
                    disabled={disabled || pendingDocumentId === document.id}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReview(document.id, "rejected")}
                    disabled={disabled || pendingDocumentId === document.id}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
