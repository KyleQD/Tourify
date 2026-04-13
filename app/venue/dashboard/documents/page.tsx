import { PageHeader } from "../../../components/navigation/page-header"
import { FeatureTabs } from "../../../components/navigation/feature-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Download, Share2, MoreHorizontal, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DocumentsPage() {
  const tabs = [
    { id: "all", label: "All Documents" },
    { id: "contracts", label: "Contracts" },
    { id: "riders", label: "Riders" },
    { id: "legal", label: "Legal" },
    { id: "other", label: "Other" },
  ]

  const documents = [
    { id: 1, name: "Performance Contract - Summer Festival", type: "Contract", date: "May 15, 2023", size: "1.2 MB" },
    { id: 2, name: "Technical Rider - Club Venues", type: "Rider", date: "Apr 22, 2023", size: "3.5 MB" },
    { id: 3, name: "Distribution Agreement", type: "Legal", date: "Mar 10, 2023", size: "850 KB" },
    { id: 4, name: "Stage Plot Template", type: "Other", date: "Feb 28, 2023", size: "2.1 MB" },
    { id: 5, name: "Booking Agreement - Template", type: "Contract", date: "Jan 15, 2023", size: "1.8 MB" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage your contracts, riders, and other documents"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <FeatureTabs />
        </div>
        <div className="relative w-full shrink-0 md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search documents..." className="pl-8 bg-muted/50 border-muted" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-5 border-b px-4 py-3 text-sm font-medium">
              <div className="col-span-2">Name</div>
              <div>Type</div>
              <div>Date</div>
              <div>Actions</div>
            </div>
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="grid grid-cols-5 items-center px-4 py-3 text-sm">
                  <div className="col-span-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{doc.name}</span>
                  </div>
                  <div>{doc.type}</div>
                  <div>{doc.date}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
