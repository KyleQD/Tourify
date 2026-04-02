'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { verificationService, VerificationStatus, VerificationRequest, VerificationCriteria } from '@/lib/services/verification.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  Award,
  FileText,
  Link,
  Building,
  User,
  AlertCircle,
  Verified
} from 'lucide-react'
import { toast } from 'sonner'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface AccountVerificationProps {
  accountId: string
  accountType: string
  onVerificationComplete?: (status: VerificationStatus) => void
}

export function AccountVerification({ accountId, accountType, onVerificationComplete }: AccountVerificationProps) {
  const { user } = useAuth()
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [verificationCriteria, setVerificationCriteria] = useState<VerificationCriteria[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('status')

  // Form states
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    youtube: '',
    spotify: '',
    website: ''
  })
  
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    business_type: '',
    registration_number: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    established_date: ''
  })

  const [documents, setDocuments] = useState<File[]>([])

  useEffect(() => {
    loadVerificationData()
  }, [accountId])

  const loadVerificationData = async () => {
    try {
      setLoading(true)
      const [status, requests, criteria] = await Promise.all([
        verificationService.getVerificationStatus(accountId),
        verificationService.getVerificationRequests(accountId),
        verificationService.getVerificationCriteria(accountType)
      ])
      
      setVerificationStatus(status)
      setVerificationRequests(requests)
      setVerificationCriteria(criteria)
    } catch (error) {
      console.error('Error loading verification data:', error)
      toast.error('Failed to load verification data')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialVerification = async () => {
    try {
      setSubmitting(true)
      
      // Convert social links to verification data format
      const socialData = {
        instagram: socialLinks.instagram ? { 
          username: socialLinks.instagram, 
          followers: 0, 
          verified: false 
        } : undefined,
        twitter: socialLinks.twitter ? { 
          username: socialLinks.twitter, 
          followers: 0, 
          verified: false 
        } : undefined,
        youtube: socialLinks.youtube ? { 
          channel: socialLinks.youtube, 
          subscribers: 0, 
          verified: false 
        } : undefined,
        spotify: socialLinks.spotify ? { 
          artist_id: socialLinks.spotify, 
          monthly_listeners: 0, 
          verified: false 
        } : undefined,
        website: socialLinks.website ? { 
          url: socialLinks.website, 
          verified: false 
        } : undefined
      }

      await verificationService.submitSocialMediaVerification(accountId, socialData)
      
      toast.success('Social media verification submitted successfully!')
      await loadVerificationData()
      onVerificationComplete?.(verificationStatus!)
    } catch (error) {
      console.error('Error submitting social verification:', error)
      toast.error('Failed to submit social verification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBusinessVerification = async () => {
    try {
      setSubmitting(true)
      
      await verificationService.submitBusinessVerification(accountId, businessInfo)
      
      toast.success('Business verification submitted successfully!')
      await loadVerificationData()
      onVerificationComplete?.(verificationStatus!)
    } catch (error) {
      console.error('Error submitting business verification:', error)
      toast.error('Failed to submit business verification')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDocumentUpload = async (
    file: File, 
    documentType: 'id_card' | 'passport' | 'business_license' | 'tax_document' | 'social_proof' | 'portfolio' | 'press_kit' | 'other'
  ) => {
    try {
      // Find the most recent pending request
      const pendingRequest = verificationRequests.find(r => r.status === 'pending')
      if (!pendingRequest) {
        toast.error('No pending verification request found')
        return
      }

      const document = await verificationService.uploadVerificationDocument(
        file,
        pendingRequest.id,
        documentType
      )
      
      toast.success(`Document uploaded successfully: ${document.document_name}`)
      await loadVerificationData()
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'requires_info':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'requires_info': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {verificationStatus?.is_verified ? (
                  <Verified className="h-8 w-8 text-blue-500" />
                ) : (
                  <Shield className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="font-medium">
                {verificationStatus?.is_verified ? 'Verified' : 'Not Verified'}
              </p>
              <p className="text-sm text-gray-500">Account Status</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((verificationStatus?.verification_score || 0) * 100)}%
                </div>
              </div>
              <p className="font-medium">Verification Score</p>
              <Progress 
                value={(verificationStatus?.verification_score || 0) * 100} 
                className="mt-2"
              />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="font-medium">
                {verificationStatus?.badges.length || 0} Badge{verificationStatus?.badges.length !== 1 ? 's' : ''}
              </p>
              <div className="flex justify-center gap-1 mt-2">
                {verificationStatus?.badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {badge.badge_type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {verificationStatus?.pending_requests && verificationStatus.pending_requests > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {verificationStatus.pending_requests} pending verification request{verificationStatus.pending_requests !== 1 ? 's' : ''}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Verification Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Verification Requirements</h3>
                {verificationCriteria.map((criteria) => (
                  <div key={criteria.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{criteria.criteria_name.replace('_', ' ').toUpperCase()}</h4>
                      <p className="text-sm text-gray-600">{criteria.criteria_description}</p>
                      <div className="flex gap-2 mt-2">
                        {criteria.required_documents.map((doc) => (
                          <Badge key={doc} variant="outline" className="text-xs">
                            {doc.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(verificationStatus?.verification_score || 0) >= criteria.minimum_score ? 100 : 0}
                        className="w-20"
                      />
                      {(verificationStatus?.verification_score || 0) >= criteria.minimum_score ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}

                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Recent Verification Requests</h3>
                  {verificationRequests.length === 0 ? (
                    <p className="text-gray-500">No verification requests yet.</p>
                  ) : (
                    verificationRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <p className="font-medium">{request.request_type.toUpperCase()} Verification</p>
                            <p className="text-sm text-gray-600">
                              Submitted {formatSafeDate(request.created_at)}
                            </p>
                            {request.rejection_reason && (
                              <p className="text-sm text-red-600 mt-1">{request.rejection_reason}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Media Verification</h3>
                <p className="text-gray-600">
                  Link your social media accounts to improve your verification score.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram Username</Label>
                    <Input
                      id="instagram"
                      placeholder="@username"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter/X Username</Label>
                    <Input
                      id="twitter"
                      placeholder="@username"
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube Channel</Label>
                    <Input
                      id="youtube"
                      placeholder="Channel URL or ID"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="spotify">Spotify Artist ID</Label>
                    <Input
                      id="spotify"
                      placeholder="Artist ID or URL"
                      value={socialLinks.spotify}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, spotify: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">Official Website</Label>
                    <Input
                      id="website"
                      placeholder="https://yourwebsite.com"
                      value={socialLinks.website}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSocialVerification}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit Social Media Verification'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="business" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Business Verification</h3>
                <p className="text-gray-600">
                  Provide business information to verify your business account.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      value={businessInfo.business_name}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business_type">Business Type</Label>
                    <Input
                      id="business_type"
                      value={businessInfo.business_type}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_type: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number</Label>
                    <Input
                      id="registration_number"
                      value={businessInfo.registration_number}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, registration_number: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID</Label>
                    <Input
                      id="tax_id"
                      value={businessInfo.tax_id}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, tax_id: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Textarea
                      id="address"
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={businessInfo.phone}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleBusinessVerification}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit Business Verification'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Upload Verification Documents</h3>
                <p className="text-gray-600">
                  Upload required documents to support your verification request.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['id_card', 'passport', 'business_license', 'tax_document', 'social_proof', 'portfolio'].map((docType) => (
                    <div key={docType} className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="font-medium">{docType.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-sm text-gray-500 mb-3">
                          {docType === 'id_card' && 'Government-issued ID card'}
                          {docType === 'passport' && 'Valid passport'}
                          {docType === 'business_license' && 'Business registration document'}
                          {docType === 'tax_document' && 'Tax registration certificate'}
                          {docType === 'social_proof' && 'Social media verification screenshots'}
                          {docType === 'portfolio' && 'Work portfolio or press kit'}
                        </p>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleDocumentUpload(file, docType as any)
                            }
                          }}
                          className="hidden"
                          id={`upload-${docType}`}
                        />
                        <label htmlFor={`upload-${docType}`}>
                          <Button variant="outline" className="cursor-pointer" asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 