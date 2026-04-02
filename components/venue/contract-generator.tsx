"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  FileText,
  Plus,
  Download,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  Signature,
  Calendar,
  DollarSign
} from "lucide-react"

interface Contract {
  id: string
  employeeName: string
  position: string
  department: string
  contractType: 'employment' | 'contractor' | 'nda' | 'performance'
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
  createdDate: string
  signedDate?: string
  terms: {
    salary: number
    salaryType: 'hourly' | 'salary' | 'daily'
    startDate: string
    benefits: string[]
  }
}

export default function ContractGenerator() {
  const { toast } = useToast()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  // Mock data for contracts
  const [contracts] = useState<Contract[]>([
    {
      id: "contract-1",
      employeeName: "Sarah Johnson",
      position: "Sound Engineer",
      department: "Technical",
      contractType: "employment",
      status: "signed",
      createdDate: "2024-01-15",
      signedDate: "2024-01-18",
      terms: {
        salary: 75000,
        salaryType: "salary",
        startDate: "2024-02-01",
        benefits: ["Health Insurance", "Dental", "Vision", "401k"]
      }
    },
    {
      id: "contract-2",
      employeeName: "Mike Rodriguez",
      position: "Security Guard",
      department: "Security",
      contractType: "employment",
      status: "pending_signature",
      createdDate: "2024-01-20",
      terms: {
        salary: 22,
        salaryType: "hourly",
        startDate: "2024-02-05",
        benefits: ["Health Insurance", "Paid Time Off"]
      }
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-500'
      case 'pending_signature': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const handleGenerateContract = () => {
    toast({
      title: "Contract Generated",
      description: "Employment contract has been generated and is ready for review",
    })
    setShowGenerateDialog(false)
  }

  const handleSendForSignature = (contractId: string) => {
    toast({
      title: "Contract Sent",
      description: "Contract has been sent for digital signature",
    })
  }

  const stats = {
    totalContracts: contracts.length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'pending_signature').length,
    draft: contracts.filter(c => c.status === 'draft').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Contract Generation
          </h1>
          <p className="text-slate-400 mt-1">Generate, manage, and track employment contracts</p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)} className="bg-gradient-to-r from-purple-500 to-pink-600">
          <Plus className="h-4 w-4 mr-2" />
          Generate Contract
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contracts", value: stats.totalContracts, icon: FileText, color: "from-purple-500 to-pink-500" },
          { label: "Signed", value: stats.signed, icon: CheckCircle, color: "from-green-500 to-emerald-500" },
          { label: "Pending Signature", value: stats.pending, icon: Clock, color: "from-yellow-500 to-orange-500" },
          { label: "Drafts", value: stats.draft, icon: Edit, color: "from-blue-500 to-cyan-500" }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contracts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contracts.map((contract) => (
          <Card key={contract.id} className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{contract.employeeName}</h3>
                    <p className="text-slate-400 text-sm">{contract.position}</p>
                    <Badge variant="outline" className="text-xs mt-1 bg-slate-700/50 border-slate-600">
                      {contract.department}
                    </Badge>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(contract.status)}`}></div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Compensation:</span>
                  <div className="flex items-center space-x-1 text-green-400">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">
                      {formatSafeCurrency(contract.terms.salary)}
                      {contract.terms.salaryType === 'salary' ? '/year' : `/${contract.terms.salaryType}`}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Start Date:</span>
                  <div className="flex items-center space-x-1 text-blue-400">
                    <Calendar className="h-4 w-4" />
                    <span>{formatSafeDate(contract.terms.startDate)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white capitalize">{contract.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-2">Benefits</div>
                <div className="flex flex-wrap gap-1">
                  {contract.terms.benefits.slice(0, 2).map((benefit, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-purple-500/20 border-purple-500/30 text-purple-400">
                      {benefit}
                    </Badge>
                  ))}
                  {contract.terms.benefits.length > 2 && (
                    <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                      +{contract.terms.benefits.length - 2}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                {contract.status === 'draft' ? (
                  <Button 
                    size="sm" 
                    onClick={() => handleSendForSignature(contract.id)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Signature className="h-4 w-4 mr-1" />
                    Send for Signature
                  </Button>
                ) : contract.status === 'pending_signature' ? (
                  <Button size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400">
                    <Clock className="h-4 w-4 mr-1" />
                    Awaiting Signature
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-green-500/50 text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Signed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Contract Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-purple-400">Generate New Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee-name">Employee Name</Label>
                <Input
                  id="employee-name"
                  placeholder="Enter employee name"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Enter position"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Select>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contract-type">Contract Type</Label>
                <Select>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="employment">Employment Contract</SelectItem>
                    <SelectItem value="contractor">Contractor Agreement</SelectItem>
                    <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="salary">Salary/Rate</Label>
                <Input
                  id="salary"
                  type="number"
                  placeholder="Enter amount"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="salary-type">Payment Type</Label>
                <Select>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Annual Salary</SelectItem>
                    <SelectItem value="daily">Daily Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="special-terms">Special Terms</Label>
              <Textarea
                id="special-terms"
                placeholder="Enter any special terms or conditions..."
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateContract} className="bg-purple-600 hover:bg-purple-700">
                Generate Contract
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 