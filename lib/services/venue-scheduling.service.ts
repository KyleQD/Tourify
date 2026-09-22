import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  VenueShift,
  VenueShiftAssignment,
  VenueShiftTemplate,
  VenueRecurringShift,
  VenueShiftSwap,
  VenueShiftRequest,
  VenueShiftNote,
  VenueShiftCheckin,
  VenueCheckinQrCode,
  ShiftWithAssignments,
  ShiftAssignmentWithDetails,
  ShiftTemplateWithRecurring,
  ShiftSwapWithDetails,
  ShiftRequestWithDetails,
  CreateShiftData,
  UpdateShiftData,
  CreateShiftAssignmentData,
  CreateShiftTemplateData,
  CreateRecurringShiftData,
  CreateShiftSwapData,
  CreateShiftRequestData,
  CreateShiftNoteData,
  CreateCheckinData,
  CreateQrCodeData,
  ShiftScheduleResponse,
  ShiftCalendarResponse,
  ShiftAnalyticsResponse,
  ShiftConflictResponse,
  ShiftStatus,
  AssignmentStatus,
  RequestStatus,
  RecurrenceFrequency,
  VenueTeamMember
} from '@/types/database.types'
import { generateQRCode } from '@/lib/utils/qr-code'

export class VenueSchedulingService {
  private static _supabase: SupabaseClient | null = null

  private static get supabase() {
    if (!this._supabase) this._supabase = createServiceRoleClient()
    return this._supabase
  }

  // ============================================================================
  // SHIFT MANAGEMENT
  // ============================================================================

  static async createShift(shiftData: CreateShiftData): Promise<VenueShift> {
    const { data, error } = await this.supabase
      .from('venue_shifts')
      .insert([shiftData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShifts(
    venueId: string,
    options: {
      startDate?: string
      endDate?: string
      status?: ShiftStatus[]
      department?: string
      staffMemberId?: string
    } = {}
  ): Promise<VenueShift[]> {
    let query = this.supabase
      .from('venue_shifts')
      .select('*')
      .eq('venue_id', venueId)

    if (options.startDate) {
      query = query.gte('shift_date', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('shift_date', options.endDate)
    }
    if (options.status && options.status.length > 0) {
      query = query.in('shift_status', options.status)
    }
    if (options.department) {
      query = query.eq('department', options.department)
    }

    const { data, error } = await query.order('shift_date', { ascending: true })

    if (error) throw error

    // Filter by staff member if specified
    if (options.staffMemberId) {
      const assignments = await this.getShiftAssignmentsByStaff(options.staffMemberId)
      const assignedShiftIds = assignments.map(a => a.shift_id)
      return data.filter(shift => assignedShiftIds.includes(shift.id))
    }

    return data || []
  }

  static async getShiftWithDetails(shiftId: string): Promise<ShiftWithAssignments | null> {
    const { data: shift, error: shiftError } = await this.supabase
      .from('venue_shifts')
      .select('*')
      .eq('id', shiftId)
      .single()

    if (shiftError) throw shiftError
    if (!shift) return null

    const assignments = await this.getShiftAssignments(shiftId)
    const notes = await this.getShiftNotes(shiftId)

    const staffMemberIds = assignments.map(a => a.staff_member_id)
    const staffMembers = staffMemberIds.length > 0 
      ? await this.getStaffMembersByIds(staffMemberIds)
      : []

    return {
      ...shift,
      assignments,
      staff_members: staffMembers,
      notes
    }
  }

  static async updateShift(shiftId: string, updateData: UpdateShiftData): Promise<VenueShift> {
    const { data, error } = await this.supabase
      .from('venue_shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteShift(shiftId: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_shifts')
      .delete()
      .eq('id', shiftId)

    if (error) throw error
  }

  static async cloneShift(shiftId: string, newDate: string): Promise<VenueShift> {
    const originalShift = await this.getShiftWithDetails(shiftId)
    if (!originalShift) throw new Error('Shift not found')

    const { event_id, created_by, ...shiftData } = originalShift
    const newShiftData: CreateShiftData = {
      ...shiftData,
      shift_date: newDate,
      event_id: event_id || '',
      created_by
    }

    return await this.createShift(newShiftData)
  }

  // ============================================================================
  // SHIFT ASSIGNMENTS
  // ============================================================================

  static async assignStaffToShift(assignmentData: CreateShiftAssignmentData): Promise<VenueShiftAssignment> {
    // Check for scheduling conflicts
    const conflicts = await this.checkSchedulingConflicts(
      assignmentData.staff_member_id,
      assignmentData.shift_id
    )
    
    if (conflicts.length > 0) {
      throw new Error(`Scheduling conflicts detected: ${conflicts.map(c => c.conflict_details).join(', ')}`)
    }

    const { data, error } = await this.supabase
      .from('venue_shift_assignments')
      .insert([assignmentData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShiftAssignments(shiftId: string): Promise<VenueShiftAssignment[]> {
    const { data, error } = await this.supabase
      .from('venue_shift_assignments')
      .select('*')
      .eq('shift_id', shiftId)
      .order('assigned_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async getShiftAssignmentsByStaff(staffMemberId: string): Promise<VenueShiftAssignment[]> {
    const { data, error } = await this.supabase
      .from('venue_shift_assignments')
      .select('*')
      .eq('staff_member_id', staffMemberId)
      .order('assigned_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus,
    options: {
      declineReason?: string
      notes?: string
    } = {}
  ): Promise<VenueShiftAssignment> {
    const updateData: any = {
      assignment_status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString()
    } else if (status === 'declined') {
      updateData.declined_at = new Date().toISOString()
      updateData.decline_reason = options.declineReason
    }

    if (options.notes) {
      updateData.notes = options.notes
    }

    const { data, error } = await this.supabase
      .from('venue_shift_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async removeStaffFromShift(assignmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_shift_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) throw error
  }

  // ============================================================================
  // SHIFT TEMPLATES
  // ============================================================================

  static async createShiftTemplate(templateData: CreateShiftTemplateData): Promise<VenueShiftTemplate> {
    const { data, error } = await this.supabase
      .from('venue_shift_templates')
      .insert([templateData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShiftTemplates(venueId: string): Promise<VenueShiftTemplate[]> {
    const { data, error } = await this.supabase
      .from('venue_shift_templates')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('template_name', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async updateShiftTemplate(
    templateId: string,
    updateData: Partial<CreateShiftTemplateData>
  ): Promise<VenueShiftTemplate> {
    const { data, error } = await this.supabase
      .from('venue_shift_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteShiftTemplate(templateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_shift_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    if (error) throw error
  }

  // ============================================================================
  // RECURRING SHIFTS
  // ============================================================================

  static async createRecurringShift(recurringData: CreateRecurringShiftData): Promise<VenueRecurringShift> {
    const { data, error } = await this.supabase
      .from('venue_recurring_shifts')
      .insert([recurringData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getRecurringShifts(venueId: string): Promise<VenueRecurringShift[]> {
    const { data, error } = await this.supabase
      .from('venue_recurring_shifts')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateRecurringShift(
    recurringId: string,
    updateData: Partial<CreateRecurringShiftData>
  ): Promise<VenueRecurringShift> {
    const { data, error } = await this.supabase
      .from('venue_recurring_shifts')
      .update(updateData)
      .eq('id', recurringId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteRecurringShift(recurringId: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_recurring_shifts')
      .update({ is_active: false })
      .eq('id', recurringId)

    if (error) throw error
  }

  // ============================================================================
  // SHIFT SWAPS
  // ============================================================================

  static async requestShiftSwap(swapData: CreateShiftSwapData): Promise<VenueShiftSwap> {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/venue/shifts/swaps', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapData),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Failed to request shift swap')
      return payload.data
    }
    const { data, error } = await this.supabase
      .from('venue_shift_swaps')
      .insert([swapData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShiftSwaps(
    venueId: string,
    options: {
      status?: RequestStatus[]
      staffMemberId?: string
    } = {}
  ): Promise<ShiftSwapWithDetails[]> {
    let query = this.supabase
      .from('venue_shift_swaps')
      .select(`
        *,
        original_shift:venue_shifts(*),
        original_staff:venue_team_members!venue_shift_swaps_original_staff_id_fkey(*),
        requested_staff:venue_team_members!venue_shift_swaps_requested_staff_id_fkey(*)
      `)
      .eq('venue_id', venueId)

    if (options.status && options.status.length > 0) {
      query = query.in('request_status', options.status)
    }
    if (options.staffMemberId) {
      query = query.or(`original_staff_id.eq.${options.staffMemberId},requested_staff_id.eq.${options.staffMemberId}`)
    }

    const { data, error } = await query.order('requested_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async approveShiftSwap(swapId: string, approvedBy: string): Promise<VenueShiftSwap> {
    const swap = await this.getShiftSwapById(swapId)
    if (!swap) throw new Error('Shift swap not found')

    // Update the swap status
    const { data: updatedSwap, error: swapError } = await this.supabase
      .from('venue_shift_swaps')
      .update({
        request_status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', swapId)
      .select()
      .single()

    if (swapError) throw swapError

    // Update the shift assignments
    await this.updateAssignmentStatus(
      swap.original_shift_id,
      AssignmentStatus.CANCELLED,
      { notes: 'Cancelled due to shift swap' }
    )

    await this.assignStaffToShift({
      shift_id: swap.original_shift_id,
      staff_member_id: swap.requested_staff_id,
      assigned_by: approvedBy,
      notes: '',
      confirmed_at: null,
      decline_reason: null,
      assignment_status: AssignmentStatus.ASSIGNED,
      declined_at: null
    })

    return updatedSwap
  }

  static async denyShiftSwap(
    swapId: string,
    deniedBy: string,
    denialReason: string
  ): Promise<VenueShiftSwap> {
    const { data, error } = await this.supabase
      .from('venue_shift_swaps')
      .update({
        request_status: 'denied',
        denied_by: deniedBy,
        denied_at: new Date().toISOString(),
        denial_reason: denialReason
      })
      .eq('id', swapId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async getShiftSwapById(swapId: string): Promise<VenueShiftSwap | null> {
    const { data, error } = await this.supabase
      .from('venue_shift_swaps')
      .select('*')
      .eq('id', swapId)
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // SHIFT REQUESTS (DROP/PICKUP)
  // ============================================================================

  static async requestShiftChange(requestData: CreateShiftRequestData): Promise<VenueShiftRequest> {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/venue/shifts/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Failed to create shift request')
      return payload.data
    }
    const { data, error } = await this.supabase
      .from('venue_shift_requests')
      .insert([requestData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShiftRequests(
    venueId: string,
    options: {
      status?: RequestStatus[]
      staffMemberId?: string
    } = {}
  ): Promise<ShiftRequestWithDetails[]> {
    let query = this.supabase
      .from('venue_shift_requests')
      .select(`
        *,
        shift:venue_shifts(*),
        staff_member:venue_team_members(*)
      `)
      .eq('venue_id', venueId)

    if (options.status && options.status.length > 0) {
      query = query.in('request_status', options.status)
    }
    if (options.staffMemberId) {
      query = query.eq('staff_member_id', options.staffMemberId)
    }

    const { data, error } = await query.order('requested_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async approveShiftRequest(
    requestId: string,
    approvedBy: string
  ): Promise<VenueShiftRequest> {
    const request = await this.getShiftRequestById(requestId)
    if (!request) throw new Error('Shift request not found')

    const { data, error } = await this.supabase
      .from('venue_shift_requests')
      .update({
        request_status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    // Handle the request based on type
    if (request.request_type === 'drop') {
      // Remove staff from shift
      const assignment = await this.getAssignmentByShiftAndStaff(request.shift_id, request.staff_member_id)
      if (assignment) {
        await this.removeStaffFromShift(assignment.id)
      }
    } else if (request.request_type === 'pickup') {
      // Assign staff to shift
      await this.assignStaffToShift({
        shift_id: request.shift_id,
        staff_member_id: request.staff_member_id,
        assigned_by: approvedBy,
        notes: '',
        confirmed_at: null,
        decline_reason: null,
        assignment_status: AssignmentStatus.ASSIGNED,
        declined_at: null
      })
    }

    return data
  }

  static async denyShiftRequest(
    requestId: string,
    deniedBy: string,
    denialReason: string
  ): Promise<VenueShiftRequest> {
    const { data, error } = await this.supabase
      .from('venue_shift_requests')
      .update({
        request_status: 'denied',
        denied_by: deniedBy,
        denied_at: new Date().toISOString(),
        denial_reason: denialReason
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static async getShiftRequestById(requestId: string): Promise<VenueShiftRequest | null> {
    const { data, error } = await this.supabase
      .from('venue_shift_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (error) throw error
    return data
  }

  private static async getAssignmentByShiftAndStaff(
    shiftId: string,
    staffMemberId: string
  ): Promise<VenueShiftAssignment | null> {
    const { data, error } = await this.supabase
      .from('venue_shift_assignments')
      .select('*')
      .eq('shift_id', shiftId)
      .eq('staff_member_id', staffMemberId)
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // SHIFT NOTES
  // ============================================================================

  static async createShiftNote(noteData: CreateShiftNoteData): Promise<VenueShiftNote> {
    const { data, error } = await this.supabase
      .from('venue_shift_notes')
      .insert([noteData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getShiftNotes(shiftId: string): Promise<VenueShiftNote[]> {
    const { data, error } = await this.supabase
      .from('venue_shift_notes')
      .select('*')
      .eq('shift_id', shiftId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateShiftNote(
    noteId: string,
    updateData: Partial<CreateShiftNoteData>
  ): Promise<VenueShiftNote> {
    const { data, error } = await this.supabase
      .from('venue_shift_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteShiftNote(noteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('venue_shift_notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error
  }

  // ============================================================================
  // CHECK-IN / CHECK-OUT
  // ============================================================================

  static async checkInStaff(checkinData: CreateCheckinData): Promise<VenueShiftCheckin> {
    const { data, error } = await this.supabase
      .from('venue_shift_checkins')
      .insert([checkinData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async checkOutStaff(
    assignmentId: string,
    checkoutTime: string,
    location?: Record<string, any>
  ): Promise<VenueShiftCheckin> {
    const { data, error } = await this.supabase
      .from('venue_shift_checkins')
      .update({
        checkout_time: checkoutTime,
        checkout_location: location
      })
      .eq('shift_assignment_id', assignmentId)
      .is('checkout_time', null)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getCheckinsByAssignment(assignmentId: string): Promise<VenueShiftCheckin[]> {
    const { data, error } = await this.supabase
      .from('venue_shift_checkins')
      .select('*')
      .eq('shift_assignment_id', assignmentId)
      .order('checkin_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  static async generateCheckinQRCode(
    venueId: string,
    shiftId: string,
    createdBy: string
  ): Promise<VenueCheckinQrCode> {
    const qrCodeHash = await generateQRCode(`${venueId}-${shiftId}-${Date.now()}`)
    const qrCodeData = {
      venue_id: venueId,
      shift_id: shiftId,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    const { data, error } = await this.supabase
      .from('venue_checkin_qr_codes')
      .insert([{
        venue_id: venueId,
        shift_id: shiftId,
        qr_code_hash: qrCodeHash,
        qr_code_data: qrCodeData,
        is_active: true,
        expires_at: qrCodeData.expires_at,
        created_by: createdBy
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async validateQRCode(qrCodeHash: string): Promise<VenueCheckinQrCode | null> {
    const { data, error } = await this.supabase
      .from('venue_checkin_qr_codes')
      .select('*')
      .eq('qr_code_hash', qrCodeHash)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // SCHEDULING UTILITIES
  // ============================================================================

  static async checkSchedulingConflicts(
    staffMemberId: string,
    shiftId: string
  ): Promise<ShiftConflictResponse[]> {
    const shift = await this.getShiftWithDetails(shiftId)
    if (!shift) throw new Error('Shift not found')

    const conflicts: ShiftConflictResponse[] = []

    // Check for overlapping shifts
    const existingAssignments = await this.getShiftAssignmentsByStaff(staffMemberId)
    const overlappingShifts = await Promise.all(
      existingAssignments.map(async assignment => {
        const assignmentShift = await this.getShiftById(assignment.shift_id)
        if (!assignmentShift) return null

        const hasOverlap = (
          assignmentShift.shift_date === shift.shift_date &&
          assignmentShift.shift_status !== 'cancelled' &&
          assignment.assignment_status !== 'cancelled' &&
          (
            (assignmentShift.start_time < shift.end_time && assignmentShift.end_time > shift.start_time)
          )
        )

        return hasOverlap ? assignment : null
      })
    )

    const validOverlappingShifts = overlappingShifts.filter(Boolean)

    if (validOverlappingShifts.length > 0) {
      conflicts.push({
        shift_id: shiftId,
        staff_member_id: staffMemberId,
        conflict_type: 'overlap',
        conflict_details: 'Staff member has overlapping shifts',
        suggested_resolution: 'Reschedule one of the conflicting shifts'
      })
    }

    // Check availability (if implemented)
    // Check time off requests (if implemented)

    return conflicts
  }

  static async getScheduleAnalytics(
    venueId: string,
    startDate: string,
    endDate: string
  ): Promise<ShiftAnalyticsResponse> {
    const shifts = await this.getShifts(venueId, { startDate, endDate })
    
    const totalShifts = shifts.length
    const totalHours = shifts.reduce((sum, shift) => {
      const start = new Date(`2000-01-01T${shift.start_time}`)
      const end = new Date(`2000-01-01T${shift.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return sum + hours
    }, 0)

    const totalCost = shifts.reduce((sum, shift) => {
      if (shift.hourly_rate) {
        const start = new Date(`2000-01-01T${shift.start_time}`)
        const end = new Date(`2000-01-01T${shift.end_time}`)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return sum + (hours * shift.hourly_rate)
      }
      return sum + (shift.flat_rate || 0)
    }, 0)

    const completedShifts = shifts.filter(s => s.shift_status === 'completed').length
    const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0

    // Calculate department stats
    const departmentStats: Record<string, { shifts: number; hours: number; cost: number }> = {}
    shifts.forEach(shift => {
      if (!shift.department) return
      
      if (!departmentStats[shift.department]) {
        departmentStats[shift.department] = { shifts: 0, hours: 0, cost: 0 }
      }

      const start = new Date(`2000-01-01T${shift.start_time}`)
      const end = new Date(`2000-01-01T${shift.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      const cost = shift.hourly_rate ? hours * shift.hourly_rate : (shift.flat_rate || 0)

      departmentStats[shift.department].shifts++
      departmentStats[shift.department].hours += hours
      departmentStats[shift.department].cost += cost
    })

    return {
      total_shifts: totalShifts,
      total_hours: totalHours,
      total_cost: totalCost,
      average_attendance: totalShifts > 0 ? shifts.reduce((sum, s) => sum + s.staff_assigned, 0) / totalShifts : 0,
      completion_rate: completionRate,
      staff_utilization: {}, // Would need to calculate based on availability
      department_stats: departmentStats
    }
  }

  static async autoScheduleShifts(
    venueId: string,
    shiftIds: string[]
  ): Promise<VenueShiftAssignment[]> {
    const assignments: VenueShiftAssignment[] = []

    for (const shiftId of shiftIds) {
      const shift = await this.getShiftWithDetails(shiftId)
      if (!shift || shift.shift_status !== 'open') continue

      const availableStaff = await this.getAvailableStaffForShift(shift)
      const needed = shift.staff_needed - shift.staff_assigned

      for (let i = 0; i < Math.min(needed, availableStaff.length); i++) {
        const staff = availableStaff[i]
        const assignment = await this.assignStaffToShift({
          shift_id: shiftId,
          staff_member_id: staff.id,
          assigned_by: 'system',
          notes: '',
          confirmed_at: null,
          decline_reason: null,
          assignment_status: AssignmentStatus.ASSIGNED,
          declined_at: null
        })
        assignments.push(assignment)
      }
    }

    return assignments
  }

  private static async getShiftById(shiftId: string): Promise<VenueShift | null> {
    const { data, error } = await this.supabase
      .from('venue_shifts')
      .select('*')
      .eq('id', shiftId)
      .single()

    if (error) throw error
    return data
  }

  private static async getAvailableStaffForShift(shift: VenueShift): Promise<VenueTeamMember[]> {
    // Get all active staff members for the venue
    const { data: staffMembers, error } = await this.supabase
      .from('venue_team_members')
      .select('*')
      .eq('venue_id', shift.venue_id)
      .eq('status', 'active')
      .eq('is_available', true)

    if (error) throw error

    // Filter by department if specified
    let availableStaff = staffMembers || []
    if (shift.department) {
      availableStaff = availableStaff.filter(staff => staff.department === shift.department)
    }

    // Filter by role if specified
    if (shift.role_required) {
      availableStaff = availableStaff.filter(staff => staff.role === shift.role_required)
    }

    // Check availability and conflicts
    const conflictFreeStaff: VenueTeamMember[] = []
    for (const staff of availableStaff) {
      const conflicts = await this.checkSchedulingConflicts(staff.id, shift.id)
      if (conflicts.length === 0) {
        conflictFreeStaff.push(staff)
      }
    }

    // Sort by performance rating (if available)
    return conflictFreeStaff.sort((a, b) => (b.performance_rating || 0) - (a.performance_rating || 0))
  }

  private static async getStaffMembersByIds(staffMemberIds: string[]): Promise<VenueTeamMember[]> {
    if (staffMemberIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('venue_team_members')
      .select('*')
      .in('id', staffMemberIds)

    if (error) throw error
    return data || []
  }

  // ============================================================================
  // PERMISSION CHECKS
  // ============================================================================

  static async checkVenuePermission(
    userId: string,
    venueId: string,
    permission: string
  ): Promise<boolean> {
    try {
      // Check if user is a team member of the venue
      const { data: teamMember, error: teamError } = await this.supabase
        .from('venue_team_members')
        .select('*')
        .eq('venue_id', venueId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (teamError || !teamMember) {
        return false
      }

      // For now, allow all operations for team members
      // In a full implementation, this would check specific permissions
      return true
    } catch (error) {
      console.error('Error checking venue permission:', error)
      return false
    }
  }
}
