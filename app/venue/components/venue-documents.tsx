import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, FileText, Upload } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueDocumentsProps {
  venue: any
}

export function VenueDocuments({ venue }: VenueDocumentsProps) {
  // Safely handle undefined or empty documents
  const documents = venue?.documents || []
  const hasDocuments = documents.length > 0

  // Mock documents when no real data exists
  const mockDocuments = [
    {
      id: "doc-1",
      name: "Stage Plot & Technical Rider",
      type: "pdf",
      size: "2.4 MB",
      uploadDate: "2025-05-15"
    },
    {
      id: "doc-2",
      name: "Floor Plan",
      type: "pdf", 
      size: "1.8 MB",
      uploadDate: "2025-05-15"
    },
    {
      id: "doc-3",
      name: "Booking Policy",
      type: "pdf",
      size: "0.5 MB",
      uploadDate: "2025-05-15"
    }
  ]

  const documentsToShow = hasDocuments ? documents.slice(0, 3) : mockDocuments

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Documents</CardTitle>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-5" />
        </div>
      </CardHeader>
      <CardContent>
        {documentsToShow.length > 0 ? (
          <div className="space-y-3">
            {documentsToShow.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-purple-400 mr-3" />
                  <div>
                    <h3 className="font-medium text-white">{doc.name}</h3>
                    <p className="text-xs text-gray-400">
                      {doc.type.toUpperCase()} • {doc.size}
                      {doc.uploadDate && ` • ${formatSafeDate(doc.uploadDate)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">No documents uploaded</h3>
            <p className="text-xs text-gray-500">Upload your venue documents to get started</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" className="flex-1 text-purple-400 border-purple-800/50 hover:bg-purple-900/20">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
