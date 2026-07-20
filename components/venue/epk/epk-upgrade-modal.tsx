"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Link, Music, Video } from "lucide-react"
import { useProfile } from "@/context/venue/profile-context"
import { useToast } from "@/hooks/use-toast"

interface EPKUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EPKUpgradeModal({ isOpen, onClose }: EPKUpgradeModalProps) {
  const { upgradeToPremiumEPK } = useProfile()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUpgrade = async () => {
    setIsProcessing(true)
    try {
      // Temporarily treat EPK premium as free
      const success = await upgradeToPremiumEPK()
      if (success) {
        toast({
          title: "EPK premium enabled",
          description: "Premium EPK features are now free during the beta.",
        })
        onClose()
      }
    } catch (error) {
      console.error("Error upgrading EPK:", error)
      toast({
        title: "Upgrade failed",
        description: "There was an error upgrading your EPK. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Premium EPK is free</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enhance your EPK with a dedicated landing page featuring videos and links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Premium EPK</h3>
              <Badge className="bg-green-600">Free</Badge>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Take your EPK to the next level with premium features designed to showcase your work professionally.
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Dedicated Landing Page</p>
                  <p className="text-sm text-gray-400">
                    Custom URL for your EPK that you can share with venues and promoters
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Video className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Video Integration</p>
                  <p className="text-sm text-gray-400">Embed videos from YouTube, Vimeo, and other platforms</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Music className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Music Player</p>
                  <p className="text-sm text-gray-400">Showcase your music with an embedded player</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Link className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Unlimited Links</p>
                  <p className="text-sm text-gray-400">Add as many social media and streaming links as you need</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-700">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Enable Premium"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
