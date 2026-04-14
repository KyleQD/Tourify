import { supabase } from '@/lib/supabase'
import type {
  StaffMember,
  JobApplication,
  OnboardingCandidate,
  StaffPerformanceMetrics,
  ShiftManagementStats,
  PerformanceStats
} from '@/types/admin-onboarding'

export class EnhancedStaffAnalyticsService {
  /**
   * Get comprehensive performance analytics
   */
  static async getPerformanceAnalytics(venueId: string, dateRange?: { start: string; end: string }) {
    try {
      console.log('🔧 [Enhanced Staff Analytics Service] Getting performance analytics...')
      
      // Get staff performance metrics
      const { data: performanceMetrics, error: metricsError } = await supabase
        .from('staff_performance_metrics')
        .select('*')
        .eq('venue_id', venueId)
        .gte('metric_date', dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('metric_date', dateRange?.end || new Date().toISOString())

      if (metricsError) throw metricsError

      // Calculate performance statistics
      const totalStaff = performanceMetrics?.length || 0
      const avgPerformanceRating = performanceMetrics?.length ? 
        performanceMetrics.reduce((sum, m) => sum + (m.performance_rating || 0), 0) / performanceMetrics.length : 0
      const avgAttendanceRate = performanceMetrics?.length ? 
        performanceMetrics.reduce((sum, m) => sum + (m.attendance_rate || 0), 0) / performanceMetrics.length : 0
      const totalIncidents = performanceMetrics?.reduce((sum, m) => sum + (m.incidents_count || 0), 0) || 0
      const totalCommendations = performanceMetrics?.reduce((sum, m) => sum + (m.commendations_count || 0), 0) || 0

      // Get training completion rates
      const trainingCompleted = performanceMetrics?.filter(m => m.training_completed).length || 0
      const trainingCompletionRate = totalStaff > 0 ? (trainingCompleted / totalStaff) * 100 : 0

      // Get certification validity rates
      const certificationsValid = performanceMetrics?.filter(m => m.certifications_valid).length || 0
      const certificationValidityRate = totalStaff > 0 ? (certificationsValid / totalStaff) * 100 : 0

      return {
        totalStaff,
        avgPerformanceRating: Math.round(avgPerformanceRating * 10) / 10,
        avgAttendanceRate: Math.round(avgAttendanceRate * 10) / 10,
        totalIncidents,
        totalCommendations,
        trainingCompletionRate: Math.round(trainingCompletionRate),
        certificationValidityRate: Math.round(certificationValidityRate),
        performanceMetrics: performanceMetrics || []
      }
    } catch (error) {
      console.error('❌ [Enhanced Staff Analytics Service] Error getting performance analytics:', error)
      throw error
    }
  }

  /**
   * Get predictive staffing analytics
   */
  static async getPredictiveStaffingAnalytics(venueId: string) {
    try {
      console.log('🔧 [Enhanced Staff Analytics Service] Getting predictive analytics...')
      
      // Get historical data for analysis
      const { data: historicalMetrics, error } = await supabase
        .from('staff_performance_metrics')
        .select('*')
        .eq('venue_id', venueId)
        .gte('metric_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('metric_date', { ascending: true })

      if (error) throw error

      // Calculate trends
      const trends = this.calculateTrends(historicalMetrics || [])
      
      // Predict staffing needs
      const predictions = this.predictStaffingNeeds(trends)
      
      // Calculate risk factors
      const riskFactors = this.calculateRiskFactors(historicalMetrics || [])

      return {
        trends,
        predictions,
        riskFactors,
        historicalData: historicalMetrics || []
      }
    } catch (error) {
      console.error('❌ [Enhanced Staff Analytics Service] Error getting predictive analytics:', error)
      throw error
    }
  }

  /**
   * Get shift optimization analytics
   */
  static async getShiftOptimizationAnalytics(venueId: string) {
    try {
      console.log('🔧 [Enhanced Staff Analytics Service] Getting shift optimization analytics...')
      
      // Get shift data
      const { data: shifts, error: shiftsError } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('venue_id', venueId)
        .gte('shift_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (shiftsError) throw shiftsError

      // Get zone data
      const { data: zones, error: zonesError } = await supabase
        .from('staff_zones')
        .select('*')
        .eq('venue_id', venueId)

      if (zonesError) throw zonesError

      // Calculate optimization metrics
      const optimizationMetrics = this.calculateShiftOptimization(shifts || [], zones || [])

      return {
        shifts: shifts || [],
        zones: zones || [],
        optimizationMetrics
      }
    } catch (error) {
      console.error('❌ [Enhanced Staff Analytics Service] Error getting shift optimization analytics:', error)
      throw error
    }
  }

  /**
   * Generate comprehensive reports
   */
  static async generateComprehensiveReport(venueId: string, reportType: 'performance' | 'staffing' | 'compliance' | 'all') {
    try {
      console.log('🔧 [Enhanced Staff Analytics Service] Generating comprehensive report...')
      
      const reportData: any = {}

      if (reportType === 'performance' || reportType === 'all') {
        reportData.performance = await this.getPerformanceAnalytics(venueId)
      }

      if (reportType === 'staffing' || reportType === 'all') {
        reportData.staffing = await this.getPredictiveStaffingAnalytics(venueId)
      }

      if (reportType === 'compliance' || reportType === 'all') {
        reportData.compliance = await this.getComplianceAnalytics(venueId)
      }

      if (reportType === 'all') {
        reportData.optimization = await this.getShiftOptimizationAnalytics(venueId)
      }

      return {
        reportType,
        generatedAt: new Date().toISOString(),
        venueId,
        data: reportData
      }
    } catch (error) {
      console.error('❌ [Enhanced Staff Analytics Service] Error generating comprehensive report:', error)
      throw error
    }
  }

  /**
   * Get compliance analytics
   */
  static async getComplianceAnalytics(venueId: string) {
    try {
      console.log('🔧 [Enhanced Staff Analytics Service] Getting compliance analytics...')
      
      // Get onboarding candidates with compliance data
      const { data: candidates, error } = await supabase
        .from('staff_onboarding_candidates')
        .select('*')
        .eq('venue_id', venueId)

      if (error) throw error

      // Calculate compliance metrics
      const totalCandidates = candidates?.length || 0
      const backgroundChecksCompleted = candidates?.filter(c => c.background_check_completed).length || 0
      const drugTestsCompleted = candidates?.filter(c => c.drug_test_completed).length || 0
      const certificationsVerified = candidates?.filter(c => c.certifications_verified).length || 0
      const trainingCompleted = candidates?.filter(c => c.training_completed).length || 0
      const uniformIssued = candidates?.filter(c => c.uniform_issued).length || 0

      return {
        totalCandidates,
        backgroundChecksCompleted,
        drugTestsCompleted,
        certificationsVerified,
        trainingCompleted,
        uniformIssued,
        backgroundCheckRate: totalCandidates > 0 ? (backgroundChecksCompleted / totalCandidates) * 100 : 0,
        drugTestRate: totalCandidates > 0 ? (drugTestsCompleted / totalCandidates) * 100 : 0,
        certificationRate: totalCandidates > 0 ? (certificationsVerified / totalCandidates) * 100 : 0,
        trainingRate: totalCandidates > 0 ? (trainingCompleted / totalCandidates) * 100 : 0,
        uniformRate: totalCandidates > 0 ? (uniformIssued / totalCandidates) * 100 : 0
      }
    } catch (error) {
      console.error('❌ [Enhanced Staff Analytics Service] Error getting compliance analytics:', error)
      throw error
    }
  }

  // Helper methods for analytics calculations
  private static calculateTrends(historicalMetrics: any[]) {
    if (historicalMetrics.length < 2) return {}

    const recentMetrics = historicalMetrics.slice(-7) // Last 7 days
    const previousMetrics = historicalMetrics.slice(-14, -7) // Previous 7 days

    const recentAvg = recentMetrics.reduce((sum, m) => sum + (m.performance_rating || 0), 0) / recentMetrics.length
    const previousAvg = previousMetrics.reduce((sum, m) => sum + (m.performance_rating || 0), 0) / previousMetrics.length

    return {
      performanceTrend: recentAvg - previousAvg,
      attendanceTrend: this.calculateAttendanceTrend(historicalMetrics),
      incidentTrend: this.calculateIncidentTrend(historicalMetrics)
    }
  }

  private static calculateAttendanceTrend(metrics: any[]) {
    if (metrics.length < 2) return 0

    const recent = metrics.slice(-7)
    const previous = metrics.slice(-14, -7)

    const recentAvg = recent.reduce((sum, m) => sum + (m.attendance_rate || 0), 0) / recent.length
    const previousAvg = previous.reduce((sum, m) => sum + (m.attendance_rate || 0), 0) / previous.length

    return recentAvg - previousAvg
  }

  private static calculateIncidentTrend(metrics: any[]) {
    if (metrics.length < 2) return 0

    const recent = metrics.slice(-7)
    const previous = metrics.slice(-14, -7)

    const recentTotal = recent.reduce((sum, m) => sum + (m.incidents_count || 0), 0)
    const previousTotal = previous.reduce((sum, m) => sum + (m.incidents_count || 0), 0)

    return recentTotal - previousTotal
  }

  private static predictStaffingNeeds(trends: any) {
    // Simple prediction based on trends
    const performanceFactor = trends.performanceTrend > 0 ? 1.1 : 0.9
    const attendanceFactor = trends.attendanceTrend > 0 ? 1.05 : 0.95
    const incidentFactor = trends.incidentTrend < 0 ? 1.1 : 0.9

    return {
      recommendedStaffIncrease: Math.round((performanceFactor * attendanceFactor * incidentFactor - 1) * 100),
      highPriorityAreas: trends.performanceTrend < 0 ? ['Training', 'Support'] : [],
      riskLevel: trends.incidentTrend > 0 ? 'High' : trends.performanceTrend < 0 ? 'Medium' : 'Low'
    }
  }

  private static calculateRiskFactors(metrics: any[]) {
    const highIncidentStaff = metrics.filter(m => (m.incidents_count || 0) > 2).length
    const lowPerformanceStaff = metrics.filter(m => (m.performance_rating || 0) < 3).length
    const lowAttendanceStaff = metrics.filter(m => (m.attendance_rate || 0) < 80).length

    return {
      highIncidentStaff,
      lowPerformanceStaff,
      lowAttendanceStaff,
      totalRiskStaff: highIncidentStaff + lowPerformanceStaff + lowAttendanceStaff,
      riskPercentage: metrics.length > 0 ? ((highIncidentStaff + lowPerformanceStaff + lowAttendanceStaff) / metrics.length) * 100 : 0
    }
  }

  private static calculateShiftOptimization(shifts: any[], zones: any[]) {
    const totalShifts = shifts.length
    const completedShifts = shifts.filter(s => s.status === 'completed').length
    const cancelledShifts = shifts.filter(s => s.status === 'cancelled').length
    const noShowShifts = shifts.filter(s => s.status === 'no_show').length

    return {
      totalShifts,
      completedShifts,
      cancelledShifts,
      noShowShifts,
      completionRate: totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0,
      cancellationRate: totalShifts > 0 ? (cancelledShifts / totalShifts) * 100 : 0,
      noShowRate: totalShifts > 0 ? (noShowShifts / totalShifts) * 100 : 0,
      zoneCoverage: zones.length > 0 ? (zones.filter(z => z.assigned_staff_count > 0).length / zones.length) * 100 : 0
    }
  }
} 