"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, ArrowLeft, ExternalLink, FileText, HelpCircle } from "lucide-react"

const internalResources = [
  { title: "FAQ", description: "Product questions and how-tos", href: "/faq", icon: HelpCircle },
  { title: "Onboarding", description: "Finish or revisit setup", href: "/onboarding/enhanced-onboarding-flow", icon: FileText },
]

const externalResources = [
  {
    title: "SoundExchange",
    description: "Digital performance royalties in the US",
    href: "https://www.soundexchange.com/",
  },
  {
    title: "Future of Music Coalition",
    description: "Artist rights and business education",
    href: "https://futureofmusic.org/",
  },
]

export default function BusinessEducationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/artist/business">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business
            </Button>
          </Link>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Business resources</h1>
              <p className="text-slate-400 text-sm">In-app links and trusted external references</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">In Tourify</CardTitle>
          <CardDescription className="text-slate-400">
            We removed mock “courses” and broken thumbnails. Use these real entry points instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {internalResources.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 hover:border-amber-500/40 hover:bg-slate-800/50 transition-colors"
            >
              <div className="rounded-lg bg-amber-500/15 p-2 h-fit">
                <item.icon className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="font-medium text-white">{item.title}</p>
                <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>
              </div>
            </Link>
          ))}
          <Link
            href="/artist/business/contracts"
            className="flex gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 hover:border-amber-500/40 hover:bg-slate-800/50 transition-colors"
          >
            <div className="rounded-lg bg-amber-500/15 p-2 h-fit">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="font-medium text-white">Contracts</p>
              <p className="text-sm text-slate-400 mt-0.5">Track deals in one place</p>
            </div>
          </Link>
          <Link
            href="/artist/business/financial"
            className="flex gap-3 rounded-xl border border-slate-700/60 bg-slate-800/30 p-4 hover:border-amber-500/40 hover:bg-slate-800/50 transition-colors"
          >
            <div className="rounded-lg bg-amber-500/15 p-2 h-fit">
              <FileText className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="font-medium text-white">Financial log</p>
              <p className="text-sm text-slate-400 mt-0.5">Income and expenses you record</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">External</CardTitle>
          <CardDescription className="text-slate-400">Third-party sites open in a new tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {externalResources.map(r => (
            <div
              key={r.href}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-700/50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-white">{r.title}</p>
                <p className="text-sm text-slate-400">{r.description}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-slate-600 shrink-0">
                <a href={r.href} target="_blank" rel="noopener noreferrer">
                  Open
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
