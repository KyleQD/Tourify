"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PerformanceAgencyManager } from '@/components/admin/agencies/performance-agency-manager'
import { StaffingAgencyManager } from '@/components/admin/agencies/staffing-agency-manager'

export default function AgenciesDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
      <div className="container mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">Agencies</h1>
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
            <TabsTrigger value="performance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Performance Agencies</TabsTrigger>
            <TabsTrigger value="staffing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">Staffing Agencies</TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="space-y-6">
            <PerformanceAgencyManager />
          </TabsContent>
          <TabsContent value="staffing" className="space-y-6">
            <StaffingAgencyManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


