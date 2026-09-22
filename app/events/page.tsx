"use client"

import { motion } from "framer-motion"
import { Suspense } from "react"
import { EventsProvider } from "@/context/venue/events-context"
import { EnhancedDiscoverEvents } from "@/components/events/enhanced-discover-events"
import { DiscoveryExplorer } from "@/components/events/discovery/discovery-explorer"

const DISCOVERY_V2 =
  process.env.NEXT_PUBLIC_EVENT_DISCOVERY_V2 === "true" ||
  process.env.NEXT_PUBLIC_EVENT_DISCOVERY_V2 === "1"

export default function EventsPage() {
  return (
    <EventsProvider>
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"
            animate={{
              y: [0, -15, 0],
              transition: {
                duration: 4,
                repeat: Infinity,
                delay: 1
              }
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-emerald-500/3 to-teal-500/3 rounded-full blur-3xl"
            animate={{
              y: [0, -8, 0],
              x: [0, 8, 0],
              transition: {
                duration: 5,
                repeat: Infinity,
                delay: 2
              }
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {DISCOVERY_V2 ? (
              <Suspense fallback={<p className="py-6 text-center text-sm text-slate-400">Loading events…</p>}>
                <DiscoveryExplorer />
              </Suspense>
            ) : (
              <EnhancedDiscoverEvents />
            )}
          </div>
        </div>
      </div>
    </EventsProvider>
  )
}
