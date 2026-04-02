"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Star, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Edit, 
  Eye, 
  Download, 
  Plus,
  Briefcase,
  GraduationCap,
  Target,
  TrendingUp,
  Shield,
  Users,
  Building2,
  DollarSign,
  Activity,
  Zap,
  Heart,
  Brain,
  HandHeart,
  Wrench,
  Palette,
  Music,
  Camera,
  Video,
  Mic,
  Lightbulb,
  Settings,
  BarChart3,
  MessageSquare,
  Bell,
  BookOpen,
  FileCheck,
  CalendarDays,
  Clock4,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Crown,
  Medal,
  Trophy,
  Gem,
  Sparkles,
  Award
} from "lucide-react"
import { StaffProfileData } from "@/lib/services/enhanced-staff-profiles.service"

interface StaffProfileCardProps {
  staff: StaffProfileData
  onEdit?: (staffId: string) => void
  onView?: (staffId: string) => void
  isAdmin?: boolean
}

const roleCategoryIcons = {
  foh: Users,
  tech: Settings,
  security: Shield,
  bar: Building2,
  kitchen: Wrench,
  management: Crown,
  marketing: BarChart3,
  maintenance: Wrench,
  other: User
}

const roleLevelColors = {
  entry: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  mid: "bg-green-500/20 text-green-400 border-green-500/30",
  senior: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  manager: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  director: "bg-red-500/20 text-red-400 border-red-500/30"
}

const roleCategoryColors = {
  foh: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  tech: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  security: "bg-red-500/20 text-red-400 border-red-500/30",
  bar: "bg-green-500/20 text-green-400 border-green-500/30",
  kitchen: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  management: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  marketing: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  maintenance: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  other: "bg-slate-500/20 text-slate-400 border-slate-500/30"
}

export function StaffProfileCard({ staff, onEdit, onView, isAdmin = false }: StaffProfileCardProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const RoleCategoryIcon = staff.role_category ? roleCategoryIcons[staff.role_category] : User

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-400"
    if (rating >= 4.0) return "text-blue-400"
    if (rating >= 3.5) return "text-yellow-400"
    return "text-red-400"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return "bg-green-500"
      case 'inactive': return "bg-gray-500"
      case 'terminated': return "bg-red-500"
      default: return "bg-gray-500"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    return formatSafeDate(dateString)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "Not set"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getExpiringCertifications = () => {
    if (!staff.certifications) return []
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return staff.certifications.filter(cert => {
      if (!cert.expiration_date) return false
      return new Date(cert.expiration_date) <= thirtyDaysFromNow
    })
  }

  const expiringCerts = getExpiringCertifications()

  return (
    <>
      <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 border-2 border-gray-700">
                <AvatarImage src={staff.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                  {staff.first_name?.[0]}{staff.last_name?.[0] || staff.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-white text-lg font-semibold">
                  {staff.first_name && staff.last_name 
                    ? `${staff.first_name} ${staff.last_name}`
                    : staff.name
                  }
                </CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <RoleCategoryIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">{staff.role}</span>
                  {staff.department && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 text-sm">{staff.department}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(staff.status)}`} />
              <Badge 
                variant="outline" 
                className={`text-xs ${roleLevelColors[staff.role_level || 'entry']}`}
              >
                {staff.role_level || 'entry'}
              </Badge>
              {staff.role_category && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${roleCategoryColors[staff.role_category]}`}
                >
                  {staff.role_category.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-semibold">
                  {staff.performance_rating ? staff.performance_rating.toFixed(1) : "N/A"}
                </span>
              </div>
              <p className="text-gray-400 text-xs">Performance</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-white font-semibold">
                  {staff.events_completed || 0}
                </span>
              </div>
              <p className="text-gray-400 text-xs">Events</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">{staff.email}</span>
            </div>
            {staff.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">{staff.phone}</span>
              </div>
            )}
            {staff.hire_date && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">Hired: {formatDate(staff.hire_date)}</span>
              </div>
            )}
          </div>

          {/* Alerts */}
          {expiringCerts.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm">
                  {expiringCerts.length} certification{expiringCerts.length > 1 ? 's' : ''} expiring soon
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View Profile
            </Button>
            {onEdit && (
              <Button 
                size="sm" 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={() => onEdit(staff.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Staff Profile: {staff.first_name && staff.last_name 
                ? `${staff.first_name} ${staff.last_name}`
                : staff.name
              }
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800 border-gray-700">
              <TabsTrigger value="overview" className="text-gray-300">Overview</TabsTrigger>
              <TabsTrigger value="certifications" className="text-gray-300">Certifications</TabsTrigger>
              <TabsTrigger value="performance" className="text-gray-300">Performance</TabsTrigger>
              <TabsTrigger value="skills" className="text-gray-300">Skills</TabsTrigger>
              <TabsTrigger value="documents" className="text-gray-300">Documents</TabsTrigger>
              <TabsTrigger value="availability" className="text-gray-300">Availability</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>Personal Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Full Name:</span>
                        <span className="text-white">
                          {staff.first_name && staff.last_name 
                            ? `${staff.first_name} ${staff.last_name}`
                            : staff.name
                          }
                        </span>
                      </div>
                      {staff.pronouns && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pronouns:</span>
                          <span className="text-white">{staff.pronouns}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Phone:</span>
                          <span className="text-white">{staff.phone}</span>
                        </div>
                      )}
                      {staff.date_of_birth && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date of Birth:</span>
                          <span className="text-white">{formatDate(staff.date_of_birth)}</span>
                        </div>
                      )}
                      {staff.address && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Address:</span>
                          <span className="text-white text-right">{staff.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Employment Information */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Briefcase className="h-5 w-5" />
                        <span>Employment Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Role:</span>
                        <span className="text-white">{staff.role}</span>
                      </div>
                      {staff.department && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Department:</span>
                          <span className="text-white">{staff.department}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Level:</span>
                        <Badge variant="outline" className={roleLevelColors[staff.role_level || 'entry']}>
                          {staff.role_level || 'entry'}
                        </Badge>
                      </div>
                      {staff.role_category && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Category:</span>
                          <Badge variant="outline" className={roleCategoryColors[staff.role_category]}>
                            {staff.role_category.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Employment Type:</span>
                        <span className="text-white capitalize">{staff.employment_type?.replace('_', ' ') || 'Not set'}</span>
                      </div>
                      {staff.hire_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Hire Date:</span>
                          <span className="text-white">{formatDate(staff.hire_date)}</span>
                        </div>
                      )}
                      {staff.hourly_rate && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Hourly Rate:</span>
                          <span className="text-white">{formatCurrency(staff.hourly_rate)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>Performance Metrics</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Performance Rating:</span>
                        <span className={`font-semibold ${getPerformanceColor(staff.performance_rating || 0)}`}>
                          {staff.performance_rating ? staff.performance_rating.toFixed(1) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reliability Score:</span>
                        <span className={`font-semibold ${getPerformanceColor(staff.reliability_score || 0)}`}>
                          {staff.reliability_score ? staff.reliability_score.toFixed(1) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Events Completed:</span>
                        <span className="text-white">{staff.events_completed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Hours:</span>
                        <span className="text-white">{staff.total_hours_worked || 0}</span>
                      </div>
                      {staff.last_performance_review && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Review:</span>
                          <span className="text-white">{formatDate(staff.last_performance_review)}</span>
                        </div>
                      )}
                      {staff.next_review_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Next Review:</span>
                          <span className="text-white">{formatDate(staff.next_review_date)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status & Availability */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Status & Availability</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(staff.status)} text-white border-current`}
                        >
                          {staff.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available:</span>
                        <Badge 
                          variant="outline" 
                          className={staff.is_available 
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {staff.is_available ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {staff.last_active && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Active:</span>
                          <span className="text-white">{formatDate(staff.last_active)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Onboarding:</span>
                        <Badge 
                          variant="outline" 
                          className={staff.onboarding_completed 
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {staff.onboarding_completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bio Section */}
                {staff.bio && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>Bio</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{staff.bio}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Emergency Contact */}
                {staff.emergency_contact && Object.keys(staff.emergency_contact).length > 0 && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Heart className="h-5 w-5" />
                        <span>Emergency Contact</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(staff.emergency_contact).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-white">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Certifications Tab */}
              <TabsContent value="certifications" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Certifications</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Certification
                  </Button>
                </div>
                
                {staff.certifications && staff.certifications.length > 0 ? (
                  <div className="space-y-3">
                    {staff.certifications.map((cert) => (
                      <Card key={cert.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Award className="h-5 w-5 text-blue-400" />
                                <h4 className="text-white font-semibold">{cert.certification_name}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={cert.is_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }
                                >
                                  {cert.is_verified ? "Verified" : "Pending"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Type:</span>
                                  <span className="text-white ml-2 capitalize">{cert.certification_type.replace('_', ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Issued:</span>
                                  <span className="text-white ml-2">{formatDate(cert.issue_date)}</span>
                                </div>
                                {cert.expiration_date && (
                                  <div>
                                    <span className="text-gray-400">Expires:</span>
                                    <span className={`ml-2 ${new Date(cert.expiration_date) <= new Date() ? 'text-red-400' : 'text-white'}`}>
                                      {formatDate(cert.expiration_date)}
                                    </span>
                                  </div>
                                )}
                                {cert.issuing_organization && (
                                  <div>
                                    <span className="text-gray-400">Issuer:</span>
                                    <span className="text-white ml-2">{cert.issuing_organization}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {cert.file_url && (
                                <Button size="sm" variant="outline" className="border-gray-600">
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="border-gray-600">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No certifications added yet</p>
                    <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Certification
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Performance Reviews</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Review
                  </Button>
                </div>
                
                {staff.performance_reviews && staff.performance_reviews.length > 0 ? (
                  <div className="space-y-3">
                    {staff.performance_reviews.map((review) => (
                      <Card key={review.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-white font-semibold">
                                Review: {formatDate(review.review_date)}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                Period: {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getPerformanceColor(review.overall_rating)}`}>
                                {review.overall_rating.toFixed(1)}
                              </div>
                              <p className="text-gray-400 text-sm">Overall Rating</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            {review.reliability_rating && (
                              <div className="text-center">
                                <div className={`text-lg font-semibold ${getPerformanceColor(review.reliability_rating)}`}>
                                  {review.reliability_rating.toFixed(1)}
                                </div>
                                <p className="text-gray-400 text-xs">Reliability</p>
                              </div>
                            )}
                            {review.teamwork_rating && (
                              <div className="text-center">
                                <div className={`text-lg font-semibold ${getPerformanceColor(review.teamwork_rating)}`}>
                                  {review.teamwork_rating.toFixed(1)}
                                </div>
                                <p className="text-gray-400 text-xs">Teamwork</p>
                              </div>
                            )}
                            {review.communication_rating && (
                              <div className="text-center">
                                <div className={`text-lg font-semibold ${getPerformanceColor(review.communication_rating)}`}>
                                  {review.communication_rating.toFixed(1)}
                                </div>
                                <p className="text-gray-400 text-xs">Communication</p>
                              </div>
                            )}
                            {review.technical_skills_rating && (
                              <div className="text-center">
                                <div className={`text-lg font-semibold ${getPerformanceColor(review.technical_skills_rating)}`}>
                                  {review.technical_skills_rating.toFixed(1)}
                                </div>
                                <p className="text-gray-400 text-xs">Technical</p>
                              </div>
                            )}
                          </div>

                          {review.comments && (
                            <div className="mb-3">
                              <h5 className="text-white font-medium mb-1">Comments:</h5>
                              <p className="text-gray-300 text-sm">{review.comments}</p>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="border-gray-600">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="border-gray-600">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No performance reviews yet</p>
                    <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Review
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Skills & Expertise</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Skill
                  </Button>
                </div>
                
                {staff.skills && staff.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {staff.skills.map((skill) => (
                      <Card key={skill.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Brain className="h-5 w-5 text-purple-400" />
                                <h4 className="text-white font-semibold">{skill.skill_name}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={skill.is_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }
                                >
                                  {skill.is_verified ? "Verified" : "Pending"}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Level:</span>
                                  <span className="text-white capitalize">{skill.proficiency_level}</span>
                                </div>
                                {skill.years_experience && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Experience:</span>
                                    <span className="text-white">{skill.years_experience} years</span>
                                  </div>
                                )}
                                {skill.skill_category && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Category:</span>
                                    <span className="text-white capitalize">{skill.skill_category.replace('_', ' ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="border-gray-600">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No skills added yet</p>
                    <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Skill
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Documents</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Upload Document
                  </Button>
                </div>
                
                {staff.documents && staff.documents.length > 0 ? (
                  <div className="space-y-3">
                    {staff.documents.map((doc) => (
                      <Card key={doc.id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <FileText className="h-5 w-5 text-blue-400" />
                                <h4 className="text-white font-semibold">{doc.document_name}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={doc.is_verified 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  }
                                >
                                  {doc.is_verified ? "Verified" : "Pending"}
                                </Badge>
                                {doc.is_required && (
                                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Type:</span>
                                  <span className="text-white ml-2 capitalize">{doc.document_type.replace('_', ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Uploaded:</span>
                                  <span className="text-white ml-2">{formatDate(doc.upload_date)}</span>
                                </div>
                                {doc.expiration_date && (
                                  <div>
                                    <span className="text-gray-400">Expires:</span>
                                    <span className={`ml-2 ${new Date(doc.expiration_date) <= new Date() ? 'text-red-400' : 'text-white'}`}>
                                      {formatDate(doc.expiration_date)}
                                    </span>
                                  </div>
                                )}
                                {doc.file_size && (
                                  <div>
                                    <span className="text-gray-400">Size:</span>
                                    <span className="text-white ml-2">{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="border-gray-600">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="border-gray-600">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No documents uploaded yet</p>
                    <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Upload First Document
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Weekly Availability</h3>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Availability
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                    const availability = staff.availability?.find(a => a.day_of_week === index)
                    return (
                      <Card key={day} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CalendarDays className="h-5 w-5 text-blue-400" />
                              <span className="text-white font-medium">{day}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              {availability ? (
                                <>
                                  <div className="text-center">
                                    <div className="text-white font-semibold">
                                      {availability.start_time ? availability.start_time : 'Not set'}
                                    </div>
                                    <div className="text-gray-400 text-xs">Start</div>
                                  </div>
                                  <div className="text-gray-400">-</div>
                                  <div className="text-center">
                                    <div className="text-white font-semibold">
                                      {availability.end_time ? availability.end_time : 'Not set'}
                                    </div>
                                    <div className="text-gray-400 text-xs">End</div>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={availability.is_available 
                                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                                      : "bg-red-500/20 text-red-400 border-red-500/30"
                                    }
                                  >
                                    {availability.is_available ? "Available" : "Unavailable"}
                                  </Badge>
                                </>
                              ) : (
                                <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                  Not Set
                                </Badge>
                              )}
                            </div>
                          </div>
                          {availability?.notes && (
                            <div className="mt-2 text-sm text-gray-400">
                              Note: {availability.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Time Off Requests */}
                {staff.time_off_requests && staff.time_off_requests.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Time Off Requests</h4>
                    <div className="space-y-3">
                      {staff.time_off_requests.map((request) => (
                        <Card key={request.id} className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Calendar className="h-5 w-5 text-blue-400" />
                                  <h5 className="text-white font-semibold capitalize">{request.request_type.replace('_', ' ')}</h5>
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      request.status === 'approved' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                      request.status === 'denied' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                      request.status === 'cancelled' ? "bg-gray-500/20 text-gray-400 border-gray-500/30" :
                                      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    }
                                  >
                                    {request.status}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">From:</span>
                                    <span className="text-white ml-2">{formatDate(request.start_date)}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">To:</span>
                                    <span className="text-white ml-2">{formatDate(request.end_date)}</span>
                                  </div>
                                  {request.reason && (
                                    <div className="col-span-2">
                                      <span className="text-gray-400">Reason:</span>
                                      <span className="text-white ml-2">{request.reason}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
} 