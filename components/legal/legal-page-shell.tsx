import Link from "next/link"
import type { ReactNode } from "react"
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_ENTITY,
  LEGAL_FOOTER_LINKS,
  LEGAL_JURISDICTION,
  LEGAL_LAST_UPDATED,
} from "@/components/legal/legal-constants"

interface LegalPageShellProps {
  title: string
  version?: string
  children: ReactNode
  currentPath?: string
}

export function LegalPageShell({ title, version, children, currentPath }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            &larr; Back to Tourify
          </Link>
        </div>

        <div
          role="status"
          className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <p className="font-medium text-amber-50">Pending legal review</p>
          <p className="mt-1 leading-relaxed text-amber-100/90">
            These documents are working drafts prepared for {LEGAL_ENTITY} and are pending review by
            qualified legal counsel. They are posted so users can review intended terms; counsel may
            require changes before they are considered final.
          </p>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 mb-1">
          {LEGAL_ENTITY} &mdash; {LEGAL_JURISDICTION}
        </p>
        <p className="text-slate-400 mb-2">
          Effective Date: {LEGAL_EFFECTIVE_DATE} &nbsp;|&nbsp; Last Updated: {LEGAL_LAST_UPDATED}
        </p>
        {version ? <p className="text-slate-500 mb-8 text-sm">Version {version}</p> : <div className="mb-8" />}

        <div className="prose prose-invert prose-slate max-w-none space-y-8">{children}</div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} {LEGAL_ENTITY}. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm">
            {LEGAL_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  currentPath === link.href
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                }
              >
                {link.label}
              </Link>
            ))}
            <Link href="/" className="text-slate-400 hover:text-white">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-purple-400 hover:text-purple-300">
      {children}
    </Link>
  )
}

export function LegalContactBlock({
  email = "legal@tourify.app",
  label = "Email",
}: {
  email?: string
  label?: string
}) {
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300 text-sm space-y-1">
      <p>
        <strong className="text-white">{LEGAL_ENTITY}</strong>
      </p>
      <p>{LEGAL_JURISDICTION}, United States</p>
      <p>
        {label}:{" "}
        <a href={`mailto:${email}`} className="text-purple-400 hover:text-purple-300">
          {email}
        </a>
      </p>
    </div>
  )
}
