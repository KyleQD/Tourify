"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Jobs",
    href: "/jobs",
  },
  {
    name: "Profile",
    href: "/profile",
  },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === link.href
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  )
} 