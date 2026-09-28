"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, CopyPlus, Loader2, RotateCcw } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

type LifecycleAction = "archive" | "restore" | "repost"

interface JobPostingLifecycleActionsProps {
  jobId: string
  title: string
  status: string
  queryString: string
  hasVacancy?: boolean
}

const COPY: Record<LifecycleAction, { title: string; description: string; button: string }> = {
  archive: {
    title: "Remove this listing?",
    description: "The listing will be archived, not deleted. Its applicants and activity will remain available.",
    button: "Remove listing",
  },
  restore: {
    title: "Restore this listing to draft?",
    description: "The original applicant pool will be retained. Review the posting before publishing it again.",
    button: "Restore to draft",
  },
  repost: {
    title: "Repost as a new draft?",
    description: "A separate draft with a new ID and zero applicants will be created. This archived posting stays unchanged.",
    button: "Create new draft",
  },
}

export function JobPostingLifecycleActions({ jobId, title, status, queryString, hasVacancy = false }: JobPostingLifecycleActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function runAction() {
    if (!pendingAction) return
    setIsSubmitting(true)
    try {
      const endpoint = pendingAction === "repost"
        ? `/api/hiring/job-postings/${jobId}/repost?${queryString}`
        : `/api/hiring/job-postings/${jobId}?${queryString}`
      const response = await fetch(endpoint, {
        method: pendingAction === "archive" ? "DELETE" : pendingAction === "restore" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: pendingAction === "restore" ? JSON.stringify({ lifecycle_action: "restore", status: "draft" }) : undefined,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "The job posting could not be updated")

      toast({
        title: pendingAction === "archive" ? "Listing archived" : pendingAction === "restore" ? "Listing restored to draft" : "New draft created",
        description: pendingAction === "archive" ? `${title} is no longer accepting applications.` : undefined,
      })
      setPendingAction(null)

      const newJobId = payload?.data?.id ?? payload?.job?.id
      if (pendingAction === "repost" && typeof newJobId === "string") {
        router.push(`/admin/dashboard/jobs/${newJobId}?${queryString}`)
        return
      }
      router.refresh()
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const archived = status === "archived"
  const recoverable = archived || (status === "filled" && hasVacancy)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {recoverable ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setPendingAction("restore")}>
              <RotateCcw className="mr-2 h-4 w-4" />{archived ? "Restore to draft" : "Reopen as draft"}
            </Button>
            <Button size="sm" onClick={() => setPendingAction("repost")}>
              <CopyPlus className="mr-2 h-4 w-4" />Repost as new draft
            </Button>
          </>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => setPendingAction("archive")}>
            <Archive className="mr-2 h-4 w-4" />Remove listing
          </Button>
        )}
      </div>

      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && !isSubmitting && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction ? COPY[pendingAction].title : "Update listing"}</AlertDialogTitle>
            <AlertDialogDescription>{pendingAction ? COPY[pendingAction].description : null}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void runAction() }} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pendingAction ? COPY[pendingAction].button : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
