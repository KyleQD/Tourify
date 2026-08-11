"use client"

import { Building2, FileSignature } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminEmptyState } from "../components/admin-empty-state"
import { VendorMasterPanel } from "@/components/admin/vendors/vendor-master-panel"
import { ContractWorkspacePanel } from "@/components/admin/vendors/contract-workspace-panel"
import { ObligationsPanel } from "@/components/admin/vendors/obligations-panel"
import { useActingContext } from "@/hooks/use-acting-context"

/**
 * W16 — Vendors, Procurement, and Contracts
 * VEND-501..507, CONT-501..508
 * Replaces the notFound() stub with a real admin surface.
 */
export default function AdminVendorsContractsPage() {
  const { isActingReady } = useActingContext()

  if (!isActingReady) {
    return (
      <AdminEmptyState
        icon={Building2}
        title="No organization selected"
        description="Select an organization from the account switcher in the top navigation to continue."
      />
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        icon={Building2}
        title="Vendors &amp; Contracts"
        subtitle="Manage your vendor master, compliance documents, RFP/quotes, contract workspace, and obligations."
      />

      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/30 p-1 rounded-sm flex flex-wrap gap-0.5">
          <TabsTrigger value="vendors" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <Building2 className="h-4 w-4" />Vendors
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <FileSignature className="h-4 w-4" />Contracts
          </TabsTrigger>
          <TabsTrigger value="obligations" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            <FileSignature className="h-4 w-4" />Obligations
          </TabsTrigger>
        </TabsList>

        {/* VEND-501 / VEND-502 — Vendor master with compliance */}
        <TabsContent value="vendors" className="space-y-6">
          <VendorMasterPanel />
        </TabsContent>

        {/* CONT-501..506 — Contract workspace */}
        <TabsContent value="contracts" className="space-y-6">
          <ContractWorkspacePanel />
        </TabsContent>

        {/* CONT-507 / CONT-508 — Obligations */}
        <TabsContent value="obligations" className="space-y-6">
          <ObligationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
