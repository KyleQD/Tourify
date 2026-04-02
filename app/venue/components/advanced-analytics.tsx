"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, LineChart, TrendingUp, Users, Zap } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"

// Mock analytics data
const mockAttendanceData = [
  { month: "Jan", attendance: 1250, capacity: 1500, percentFilled: 83 },
  { month: "Feb", attendance: 1320, capacity: 1500, percentFilled: 88 },
  { month: "Mar", attendance: 1400, capacity: 1500, percentFilled: 93 },
  { month: "Apr", attendance: 1380, capacity: 1500, percentFilled: 92 },
  { month: "May", attendance: 1450, capacity: 1500, percentFilled: 97 },
]

const mockRevenueData = [
  { month: "Jan", venueRental: 12500, equipmentRental: 2500, ticketSales: 6000, foodBeverage: 4500, total: 25500 },
  { month: "Feb", venueRental: 13200, equipmentRental: 2800, ticketSales: 6500, foodBeverage: 5000, total: 27500 },
  { month: "Mar", venueRental: 14000, equipmentRental: 3000, ticketSales: 7000, foodBeverage: 5500, total: 29500 },
  { month: "Apr", venueRental: 13800, equipmentRental: 2900, ticketSales: 6800, foodBeverage: 5200, total: 28700 },
  { month: "May", venueRental: 14500, equipmentRental: 3200, ticketSales: 7200, foodBeverage: 5800, total: 30700 },
]

const mockAudienceData = {
  ageGroups: [
    { name: "18-24", value: 25 },
    { name: "25-34", value: 35 },
    { name: "35-44", value: 20 },
    { name: "45-54", value: 12 },
    { name: "55+", value: 8 },
  ],
  gender: [
    { name: "Male", value: 52 },
    { name: "Female", value: 46 },
    { name: "Non-binary", value: 2 },
  ],
  location: [
    { name: "Local (< 10 miles)", value: 45 },
    { name: "Regional (10-50 miles)", value: 35 },
    { name: "Out of State", value: 20 },
  ],
}

const mockEventPerformance = [
  {
    id: "event-1",
    name: "Summer Jam Festival",
    date: "2024-06-15",
    attendance: 850,
    capacity: 850,
    percentFilled: 100,
    revenue: 25500,
    expenses: 15000,
    profit: 10500,
    rating: 4.8,
  },
  {
    id: "event-2",
    name: "Midnight Echo",
    date: "2024-06-22",
    attendance: 750,
    capacity: 850,
    percentFilled: 88,
    revenue: 18500,
    expenses: 12000,
    profit: 6500,
    rating: 4.6,
  },
  {
    id: "event-3",
    name: "Jazz Night",
    date: "2024-06-28",
    attendance: 650,
    capacity: 850,
    percentFilled: 76,
    revenue: 15500,
    expenses: 10000,
    profit: 5500,
    rating: 4.7,
  },
]

export function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedMonth, setSelectedMonth] = useState("may")
  const [selectedYear, setSelectedYear] = useState("2024")

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Advanced Analytics</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="events">Event Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Average Attendance</h3>
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {formatSafeNumber(
                      Math.round(
                        mockAttendanceData.reduce((sum, item) => sum + item.attendance, 0) / mockAttendanceData.length,
                      ),
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Per event</p>
                  <div className="mt-2 flex items-center text-xs">
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +5.2%
                    </Badge>
                    <span className="ml-2 text-gray-400">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Average Revenue</h3>
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {formatCurrency(
                      mockRevenueData.reduce((sum, item) => sum + item.total, 0) / mockRevenueData.length,
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Per event</p>
                  <div className="mt-2 flex items-center text-xs">
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +8.3%
                    </Badge>
                    <span className="ml-2 text-gray-400">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Capacity Utilization</h3>
                    <Zap className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {formatPercentage(
                      Math.round(
                        (mockAttendanceData.reduce((sum, item) => sum + item.percentFilled, 0) /
                          mockAttendanceData.length) *
                          100,
                      ) / 100,
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Average fill rate</p>
                  <div className="mt-2 flex items-center text-xs">
                    <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                      +3.5%
                    </Badge>
                    <span className="ml-2 text-gray-400">vs last period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Attendance Trends</CardTitle>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[100px] h-8 text-xs bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <LineChart className="h-16 w-16 mx-auto mb-4" />
                      <p>Chart visualization would appear here</p>
                      <p className="text-sm">Showing attendance trends over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Revenue Breakdown</CardTitle>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="may">May 2024</SelectItem>
                        <SelectItem value="april">April 2024</SelectItem>
                        <SelectItem value="march">March 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <LineChart className="h-16 w-16 mx-auto mb-4" />
                      <p>Chart visualization would appear here</p>
                      <p className="text-sm">Showing revenue sources over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
