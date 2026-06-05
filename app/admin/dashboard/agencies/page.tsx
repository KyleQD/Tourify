"use client"

import { Building } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPageHeader } from "../components/admin-page-header"
import { PerformanceAgencyManager } from "@/components/admin/agencies/performance-agency-manager"
import { StaffingAgencyManager } from "@/components/admin/agencies/staffing-agency-manager"

export default function AgenciesDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Agencies"
        subtitle="Performance and staffing agency management"
        icon={Building}
      />

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
          >
            Performance Agencies
          </TabsTrigger>
          <TabsTrigger
            value="staffing"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm"
          >
            Staffing Agencies
          </TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          <PerformanceAgencyManager />
        </TabsContent>
        <TabsContent value="staffing">
          <StaffingAgencyManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
