"use client"

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { VKData } from "@/lib/services/venue-kit.service"
import OverviewSection from "./overview-section"
import SpecsSection from "./specs-section"
import AmenitiesSection from "./amenities-section"
import ShowsSection from "./shows-section"
import PressSection from "./press-section"
import MediaSection from "./media-section"
import ContactSection from "./contact-section"
import SocialSection from "./social-section"

interface VkEditorTabsProps {
  vkData: VKData
  updateVKData: (updates: Partial<VKData>) => void
  activeTab?: string
  onTabChange?: (tab: string) => void
}

const TABS = [
  { id: "overview",   label: "Overview"  },
  { id: "specs",      label: "Specs"     },
  { id: "amenities",  label: "Amenities" },
  { id: "shows",      label: "Shows"     },
  { id: "press",      label: "Press"     },
  { id: "media",      label: "Media"     },
  { id: "contact",    label: "Contact"   },
  { id: "social",     label: "Social"    },
]

export default function VkEditorTabs({
  vkData,
  updateVKData,
  activeTab = "overview",
  onTabChange,
}: VkEditorTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl bg-white/5 p-1">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-foreground"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6">
        <TabsContent value="overview">
          <OverviewSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="specs">
          <SpecsSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="amenities">
          <AmenitiesSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="shows">
          <ShowsSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="press">
          <PressSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="media">
          <MediaSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="contact">
          <ContactSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>

        <TabsContent value="social">
          <SocialSection vkData={vkData} updateVKData={updateVKData} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
