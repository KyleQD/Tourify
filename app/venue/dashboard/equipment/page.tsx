import type { Metadata } from "next"
import { EquipmentManagement } from "../../components/equipment-management"
import { PageHeader } from "../../components/navigation/page-header"
import { Breadcrumbs } from "../../components/navigation/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Download, FileText, Plus, Upload } from "lucide-react"

export const metadata: Metadata = {
  title: "Equipment Management | Tourify",
  description: "Manage your venue's equipment inventory, maintenance schedules, and rentals.",
}

export default function EquipmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/venue/dashboard/dashboard" },
            { label: "Equipment Management", href: "/venue/dashboard/equipment" },
          ]}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <PageHeader
            title="Equipment Management"
            description="Track, maintain, and rent your venue's equipment inventory"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <EquipmentManagement />
      </div>
    </div>
  )
}
