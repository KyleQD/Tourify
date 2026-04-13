"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href: string
  isCurrent?: boolean
}

export function Breadcrumbs() {
  const pathname = usePathname()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/admin/dashboard' },
    ]

    if (segments[0] !== 'admin') return breadcrumbs

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      if (index === 0) return
      // Hide a redundant "Dashboard" crumb; keep real sections (e.g. Applications, Settings)
      if (index === 1 && segment === 'dashboard') return

      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrent: index === segments.length - 1,
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-400 mb-4">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-slate-500" />
          )}
          
          {item.isCurrent ? (
            <span className="text-white font-medium">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-white transition-colors duration-200 flex items-center space-x-1"
            >
              {index === 0 && <Home className="h-4 w-4" />}
              <span>{item.label}</span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
} 