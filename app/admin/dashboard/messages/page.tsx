"use client"

import { Bell, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function MessagesPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-6 sm:p-10">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-white shadow-lg">
        <CardHeader className="items-center space-y-4 text-center">
          <div className="flex justify-center gap-3 text-slate-300">
            <MessageSquare className="h-10 w-10" strokeWidth={1.5} aria-hidden />
            <Bell className="h-9 w-9" strokeWidth={1.5} aria-hidden />
          </div>
          <CardTitle className="text-xl font-semibold text-white">Messaging</CardTitle>
          <CardDescription className="text-base leading-relaxed text-slate-400">
            Team messaging and broadcast communications are being built. Check back
            soon!
          </CardDescription>
          <Badge
            variant="outline"
            className="border-slate-600 bg-slate-900/80 text-slate-200"
          >
            Coming Soon
          </Badge>
        </CardHeader>
      </Card>
    </div>
  )
}
