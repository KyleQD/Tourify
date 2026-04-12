"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Search, Mail, Phone, Ticket, DollarSign, Calendar } from "lucide-react"
import { FeatureUnavailable } from "@/components/ui/feature-unavailable"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  totalSpent: number
  ticketsPurchased: number
  lastPurchase: string
  upcomingEvents: number
}

// Mock data - replace with actual API calls
const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    totalSpent: 149.97,
    ticketsPurchased: 3,
    lastPurchase: "2024-03-07T10:30:00",
    upcomingEvents: 2
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "+1 (555) 987-6543",
    totalSpent: 89.98,
    ticketsPurchased: 2,
    lastPurchase: "2024-03-05T15:45:00",
    upcomingEvents: 1
  }
]

export default function BusinessCustomersPage() {
  const isBusinessCustomersEnabled = process.env.NEXT_PUBLIC_ENABLE_BUSINESS_CUSTOMERS === "true"
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)

  if (!isBusinessCustomersEnabled) {
    return (
      <FeatureUnavailable
        title="Business customers is temporarily unavailable"
        description="This screen currently uses placeholder data and is hidden until customer records and purchase history are fully connected."
        fallbackHref="/business"
        fallbackLabel="Back to business dashboard"
      />
    )
  }

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <p className="text-gray-400">Manage your customer relationships</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#13151c] border-gray-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-[#13151c] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Customer List</CardTitle>
              <CardDescription className="text-gray-400">
                View and manage your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-800/50"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{customer.name}</p>
                          <p className="text-sm text-gray-400">
                            {customer.upcomingEvents > 0 && (
                              <Badge className="bg-purple-600">
                                {customer.upcomingEvents} upcoming
                              </Badge>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-gray-400">
                            <Mail className="h-4 w-4 mr-2" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <Phone className="h-4 w-4 mr-2" />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-gray-400">
                          <Ticket className="h-4 w-4 mr-2" />
                          <span>{customer.ticketsPurchased} tickets</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-white font-medium">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>{customer.totalSpent.toFixed(2)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-[#13151c] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Customer Details</CardTitle>
              <CardDescription className="text-gray-400">
                {selectedCustomer ? "View customer information" : "Select a customer to view details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      {selectedCustomer.name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-400">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                      Purchase History
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-400">
                          <Ticket className="h-4 w-4 mr-2" />
                          <span>Tickets Purchased</span>
                        </div>
                        <span className="text-white">
                          {selectedCustomer.ticketsPurchased}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-400">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <span>Total Spent</span>
                        </div>
                        <span className="text-white">
                          ${selectedCustomer.totalSpent.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Last Purchase</span>
                        </div>
                        <span className="text-white">
                          {format(new Date(selectedCustomer.lastPurchase), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <Button className="w-full" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Ticket className="h-4 w-4 mr-2" />
                        View Tickets
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  Click on a customer to view their details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 