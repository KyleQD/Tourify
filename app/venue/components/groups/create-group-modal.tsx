"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Stub modal kept for URL/import safety — group creation is not advertised. */
export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Groups not available</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground text-sm">
          Creating groups is not available yet.
        </div>
      </DialogContent>
    </Dialog>
  )
}
