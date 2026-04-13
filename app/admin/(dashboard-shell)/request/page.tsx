"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Crown, 
  User, 
  Building, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useProfile } from "@/hooks/use-profile"
import { supabase } from "@/lib/supabase"

export default function AdminRequestPage() {
  const router = useRouter()
  const { user, profileData } = useProfile()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [request, setRequest] = useState({
    reason: "",
    experience: "",
    references: "",
    organization: "",
    role: ""
  })

  const handleInputChange = (field: string, value: string) => {
    setRequest(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create admin request record
      const { error } = await supabase
        .from('admin_requests')
        .insert([{
          user_id: user?.id,
          reason: request.reason,
          experience: request.experience,
          references: request.references,
          organization: request.organization,
          role: request.role,
          status: 'pending',
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting admin request:', error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card className="border-green-600/20 bg-green-600/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-green-600 text-white">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-2xl font-bold">Request Submitted</h2>
              <p className="text-gray-400">
                Your admin access request has been submitted successfully. Our team will review your application and get back to you within 3-5 business days.
              </p>
              <div className="flex space-x-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button onClick={() => router.push('/help/admin-process')}>
                  Learn About Admin Process
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-yellow-600/20 text-yellow-500">
            <Crown className="h-10 w-10" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Request Admin Access</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Admin accounts have elevated permissions to help manage the Tourify platform. 
          Please provide detailed information about why you need admin access.
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="border-yellow-600/20 bg-yellow-600/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Admin access requests are carefully reviewed. Only provide accurate information as this will be verified.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Responsibilities */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Shield className="h-4 w-4 mr-2" />
                Admin Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">User Management</h4>
                <p className="text-gray-400">Monitor user activity, handle reports, manage suspensions</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Content Moderation</h4>
                <p className="text-gray-400">Review flagged content, enforce community guidelines</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Platform Analytics</h4>
                <p className="text-gray-400">Access platform-wide analytics and insights</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">System Configuration</h4>
                <p className="text-gray-400">Manage platform settings and configurations</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2" />
                Review Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">1</Badge>
                <span>Application Review (2-3 days)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">2</Badge>
                <span>Reference Verification</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">3</Badge>
                <span>Background Check</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">4</Badge>
                <span>Final Decision</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Application</CardTitle>
              <CardDescription>
                Please fill out all fields completely and accurately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization/Company</Label>
                    <Input
                      id="organization"
                      value={request.organization}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                      placeholder="Company or organization name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Your Role/Title</Label>
                    <Input
                      id="role"
                      value={request.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      placeholder="Your current role or title"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Admin Access</Label>
                  <Textarea
                    id="reason"
                    value={request.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Explain why you need admin access and how you plan to use it to benefit the Tourify community..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Relevant Experience</Label>
                  <Textarea
                    id="experience"
                    value={request.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="Describe your experience with platform management, community moderation, or related fields..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="references">References</Label>
                  <Textarea
                    id="references"
                    value={request.references}
                    onChange={(e) => handleInputChange('references', e.target.value)}
                    placeholder="Provide contact information for 2-3 professional references who can vouch for your qualifications..."
                    rows={3}
                    required
                  />
                </div>

                {/* Current Profile Info */}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium mb-3">Your Current Profile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>General Account</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    {profileData?.artistProfile && (
                      <div className="flex items-center space-x-2">
                        <Crown className="h-4 w-4 text-purple-500" />
                        <span>Artist Account</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    )}
                    {profileData?.venueProfile && (
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-blue-500" />
                        <span>Venue Account</span>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 