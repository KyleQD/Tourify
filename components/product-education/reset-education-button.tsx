"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useProductEducation } from "./product-education-context"

export function ResetEducationButton() {
  const { resetEducation } = useProductEducation()

  return (
    <Button
      type="button"
      variant="outline"
      className="border-white/30 text-white hover:bg-white/10"
      onClick={() => {
        resetEducation()
        toast.success("Tips and help preferences were reset on this device.")
      }}
    >
      Reset tips and tours
    </Button>
  )
}
