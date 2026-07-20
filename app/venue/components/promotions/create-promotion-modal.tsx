"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CreatePromotionModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Stub modal kept for URL/import safety — promotions creation is not advertised. */
export function CreatePromotionModal({ isOpen, onClose }: CreatePromotionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promotions not available</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground text-sm">
          Creating promotions is not available yet.
        </div>
      </DialogContent>
    </Dialog>
  )
}
