"use client"

// Prevent pre-rendering since this page requires profile context
export const dynamic = 'force-dynamic'

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useProfile } from "../../../../context/profile-context"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, CreditCard, Bell, User } from "lucide-react"
import { motion } from "framer-motion"
import { venueDashboardTabListLightClass } from "@/app/venue/lib/dashboard-ui"

export default function VenueSettingsPage() {
  // Temporarily disable profile hook to avoid provider issues
  // const { profile } = useProfile()
  const profile = {
    name: "Test Venue",
    type: "Concert Hall",
    description: "A premier venue for live music events",
    location: "New York, NY",
    website: "https://testvenue.com",
    contactEmail: "contact@testvenue.com",
    phone: "+1 (555) 123-4567",
    capacity: "500",
    bookingSettings: {
      leadTime: "2 weeks",
      autoApprove: "never",
      requireDeposit: false,
      depositAmount: "",
      cancellationPolicy: "",
    },
    notifications: {
      newBookings: true,
      bookingUpdates: true,
      messages: true,
      marketing: false,
    },
    team: {
      members: [] as any[],
      roles: [] as any[],
    },
    payment: {
      acceptedMethods: [] as string[],
      taxRate: "",
      currency: "USD",
    },
  }
  const { toast } = useToast()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("profile")
  const [isSaving, setIsSaving] = useState(false)
  const [venueData, setVenueData] = useState({
    name: "",
    type: "",
    description: "",
    location: "",
    website: "",
    contactEmail: "",
    phone: "",
    capacity: "",
    bookingSettings: {
      leadTime: "2 weeks",
      autoApprove: "never",
      requireDeposit: false,
      depositAmount: "",
      cancellationPolicy: "",
    },
    notifications: {
      newBookings: true,
      bookingUpdates: true,
      messages: true,
      marketing: false,
    },
    team: {
      members: [] as any[],
      roles: [] as any[],
    },
    payment: {
      acceptedMethods: [] as string[],
      taxRate: "",
      currency: "USD",
    },
  })

  useEffect(() => {
    if (profile) {
      setVenueData({
        name: profile.name,
        type: profile.type,
        description: profile.description,
        location: profile.location,
        website: profile.website,
        contactEmail: profile.contactEmail,
        phone: profile.phone,
        capacity: profile.capacity,
        bookingSettings: {
          leadTime: profile.bookingSettings.leadTime,
          autoApprove: profile.bookingSettings.autoApprove,
          requireDeposit: profile.bookingSettings.requireDeposit,
          depositAmount: profile.bookingSettings.depositAmount,
          cancellationPolicy: profile.bookingSettings.cancellationPolicy,
        },
        notifications: {
          newBookings: profile.notifications.newBookings,
          bookingUpdates: profile.notifications.bookingUpdates,
          messages: profile.notifications.messages,
          marketing: profile.notifications.marketing,
        },
        team: {
          members: profile.team.members,
          roles: profile.team.roles,
        },
        payment: {
          acceptedMethods: profile.payment.acceptedMethods,
          taxRate: profile.payment.taxRate,
          currency: profile.payment.currency,
        },
      })
    }
  }, [profile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenueData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleBookingSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setVenueData((prev) => ({
      ...prev,
      bookingSettings: {
        ...prev.bookingSettings,
        [name]: value,
      },
    }))
  }

  const handleNotificationToggle = (name: string, checked: boolean) => {
    setVenueData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({
        title: "Settings Saved",
        description: "Your venue settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6 flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold break-words">Venue Settings</h1>
            <p className="mt-1 break-words text-gray-500">Manage your venue profile and preferences</p>
          </div>
          <Button className="shrink-0" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`mb-6 ${venueDashboardTabListLightClass}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="booking">Booking Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Venue Profile</CardTitle>
                <CardDescription>Update your venue's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="/placeholder-venue.jpg" alt={venueData.name} />
                    <AvatarFallback>
                      {venueData.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={venueData.name}
                      onChange={handleInputChange}
                      placeholder="Enter venue name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Venue Type</Label>
                    <Input
                      id="type"
                      name="type"
                      value={venueData.type}
                      onChange={handleInputChange}
                      placeholder="e.g., Concert Hall, Bar, Club"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={venueData.location}
                      onChange={handleInputChange}
                      placeholder="Enter venue address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      value={venueData.capacity}
                      onChange={handleInputChange}
                      placeholder="Enter venue capacity"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={venueData.website}
                      onChange={handleInputChange}
                      placeholder="https://your-venue.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      value={venueData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="contact@your-venue.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={venueData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={venueData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your venue..."
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking">
            <Card>
              <CardHeader>
                <CardTitle>Booking Settings</CardTitle>
                <CardDescription>Configure how artists can book your venue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Minimum Booking Lead Time</Label>
                    <select
                      id="leadTime"
                      name="leadTime"
                      value={venueData.bookingSettings.leadTime}
                      onChange={handleBookingSettingChange}
                      className="w-full rounded-md border border-gray-300 p-2"
                    >
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="2 months">2 months</option>
                      <option value="3 months">3 months</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="autoApprove">Auto-Approve Bookings</Label>
                    <select
                      id="autoApprove"
                      name="autoApprove"
                      value={venueData.bookingSettings.autoApprove}
                      onChange={handleBookingSettingChange}
                      className="w-full rounded-md border border-gray-300 p-2"
                    >
                      <option value="never">Never (Review all requests)</option>
                      <option value="trusted">For trusted clients only</option>
                      <option value="small">For small events (&lt;100 people)</option>
                      <option value="always">Always</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Require Deposit</h4>
                      <p className="text-sm text-gray-500">Require a deposit payment to confirm bookings</p>
                    </div>
                    <Switch
                      checked={venueData.bookingSettings.requireDeposit}
                      onCheckedChange={(checked) =>
                        setVenueData((prev) => ({
                          ...prev,
                          bookingSettings: { ...prev.bookingSettings, requireDeposit: checked },
                        }))
                      }
                    />
                  </div>

                  {venueData.bookingSettings.requireDeposit && (
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                      <Input
                        id="depositAmount"
                        name="depositAmount"
                        value={venueData.bookingSettings.depositAmount}
                        onChange={handleBookingSettingChange}
                        placeholder="Enter deposit amount"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                  <Textarea
                    id="cancellationPolicy"
                    name="cancellationPolicy"
                    value={venueData.bookingSettings.cancellationPolicy}
                    onChange={handleBookingSettingChange}
                    placeholder="Describe your cancellation policy..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">New Booking Requests</h4>
                    <p className="text-sm text-gray-500">Get notified when artists request to book your venue</p>
                  </div>
                  <Switch
                    checked={venueData.notifications.newBookings}
                    onCheckedChange={(checked) => handleNotificationToggle("newBookings", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Booking Updates</h4>
                    <p className="text-sm text-gray-500">Receive updates about existing bookings</p>
                  </div>
                  <Switch
                    checked={venueData.notifications.bookingUpdates}
                    onCheckedChange={(checked) => handleNotificationToggle("bookingUpdates", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Messages</h4>
                    <p className="text-sm text-gray-500">Get notified when you receive new messages</p>
                  </div>
                  <Switch
                    checked={venueData.notifications.messages}
                    onCheckedChange={(checked) => handleNotificationToggle("messages", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Marketing Updates</h4>
                    <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
                  </div>
                  <Switch
                    checked={venueData.notifications.marketing}
                    onCheckedChange={(checked) => handleNotificationToggle("marketing", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Manage your venue's team members and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
                  <p className="text-gray-500 mb-4">Add team members to help manage your venue</p>
                  <Button>Add Team Member</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Settings</CardTitle>
                <CardDescription>Configure your payment preferences and methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      name="taxRate"
                      value={venueData.payment.taxRate}
                      onChange={(e) =>
                        setVenueData((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, taxRate: e.target.value },
                        }))
                      }
                      placeholder="Enter tax rate"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      name="currency"
                      value={venueData.payment.currency}
                      onChange={(e) =>
                        setVenueData((prev) => ({
                          ...prev,
                          payment: { ...prev.payment, currency: e.target.value },
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 p-2"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Accepted Payment Methods</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="creditCard"
                        checked={venueData.payment.acceptedMethods.includes("credit_card")}
                        onChange={(e) =>
                          setVenueData((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              acceptedMethods: e.target.checked
                                ? [...prev.payment.acceptedMethods, "credit_card"]
                                : prev.payment.acceptedMethods.filter((m) => m !== "credit_card"),
                            },
                          }))
                        }
                      />
                      <Label htmlFor="creditCard">Credit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="bankTransfer"
                        checked={venueData.payment.acceptedMethods.includes("bank_transfer")}
                        onChange={(e) =>
                          setVenueData((prev) => ({
                            ...prev,
                            payment: {
                              ...prev.payment,
                              acceptedMethods: e.target.checked
                                ? [...prev.payment.acceptedMethods, "bank_transfer"]
                                : prev.payment.acceptedMethods.filter((m) => m !== "bank_transfer"),
                            },
                          }))
                        }
                      />
                      <Label htmlFor="bankTransfer">Bank Transfer</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
} 