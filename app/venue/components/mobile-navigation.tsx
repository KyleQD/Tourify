"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Home, Plus, Users } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

const MobileNavigation = () => {
  const pathname = usePathname()
  const router = useRouter()

  const handleNavigation = (route: string) => {
    router.push(route)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60">
        <Button variant="ghost" size="icon" onClick={() => handleNavigation("/")}>
          <Home className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleNavigation("/documents/new")}>
          <Plus className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleNavigation("/venue/staff")}>
          <Users className="h-5 w-5" />
        </Button>
      </SheetContent>
    </Sheet>
  )
}

export default MobileNavigation
