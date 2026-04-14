import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface UpgradeToProProps extends React.ComponentProps<typeof Button> {
  variant?: "default" | "outline" | "ghost"
}

export function UpgradeToPro({ className, variant = "default", ...props }: UpgradeToProProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} className={cn("", className)} {...props}>
          All features free during beta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Everything is free during beta</DialogTitle>
          <DialogDescription>
            All features and account types are completely free while we&apos;re in beta.
            Create as many accounts as you need — no payment required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ul className="list-disc list-inside space-y-2">
            <li>Unlimited artist, venue, and organizer accounts</li>
            <li>All Pro features unlocked</li>
            <li>Full upload limits</li>
            <li>Premium EPK features</li>
            <li>Priority support</li>
          </ul>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button>Got it</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 