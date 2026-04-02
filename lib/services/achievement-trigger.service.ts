import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { achievementService } from './achievement.service'

export class AchievementTriggerService {
  private supabase = createClientComponentClient()

  private async recordMetric(args: {
    metricKey: string
    eventType: string
    delta?: number
    absoluteValue?: number
    eventData?: Record<string, any>
    relatedProjectId?: string
    relatedEventId?: string
    relatedCollaborationId?: string
  }) {
    await achievementService.recordAchievementProgress({
      metric_key: args.metricKey,
      metric_value: args.absoluteValue,
      evaluation_mode: args.absoluteValue !== undefined ? 'absolute' : 'increment',
      event_type: args.eventType,
      event_value: args.delta ?? 1,
      event_data: args.eventData ?? {},
      related_project_id: args.relatedProjectId,
      related_event_id: args.relatedEventId,
      related_collaboration_id: args.relatedCollaborationId
    })
  }

  // =============================================
  // PROFILE COMPLETION TRIGGERS
  // =============================================

  async triggerProfileCompletion(userId: string, profileType: string): Promise<void> {
    try {
      // Award "Profile Complete" badge
      await this.grantProfileCompletionBadge(userId, profileType)
      
      // Award "First Steps" achievement
      await this.recordMetric({
        metricKey: 'profile_completion_score',
        eventType: 'profile_completed',
        absoluteValue: 100,
        eventData: { profile_type: profileType }
      })

      console.log(`✅ Profile completion triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering profile completion:', error)
    }
  }

  private async grantProfileCompletionBadge(userId: string, profileType: string): Promise<void> {
    try {
      const badgeName = this.getProfileCompletionBadgeName(profileType)
      
      // Get the badge ID from the database
      const { data: badge } = await this.supabase
        .from('badges')
        .select('id')
        .eq('name', badgeName)
        .single()

      if (badge) {
        await achievementService.grantBadge({
          badge_id: badge.id,
          user_id: userId,
          granted_reason: `Completed ${profileType} profile setup`
        })
      }
    } catch (error) {
      console.error('Error granting profile completion badge:', error)
    }
  }

  private getProfileCompletionBadgeName(profileType: string): string {
    switch (profileType) {
      case 'artist':
        return 'Artist Profile Complete'
      case 'venue':
        return 'Venue Profile Complete'
      case 'industry':
        return 'Industry Profile Complete'
      case 'general':
        return 'Fan Profile Complete'
      default:
        return 'Profile Complete'
    }
  }

  // =============================================
  // JOB COMPLETION TRIGGERS
  // =============================================

  async triggerJobCompletion(userId: string, jobData: {
    jobId: string
    jobType: string
    clientRating?: number
    earnings?: number
    duration?: number
  }): Promise<void> {
    try {
      await this.recordMetric({
        metricKey: 'projects_completed_total',
        eventType: 'job_completed',
        delta: 1,
        relatedProjectId: jobData.jobId
      })

      // Check for high rating achievements
      if (jobData.clientRating && jobData.clientRating >= 4.5) {
        await this.recordMetric({
          metricKey: 'high_rating_events_total',
          eventType: 'high_rating_received',
          delta: 1,
          relatedProjectId: jobData.jobId
        })
      }

      // Check for earnings achievements
      if (jobData.earnings) {
        await this.recordMetric({
          metricKey: 'revenue_total',
          eventType: 'earnings_milestone',
          absoluteValue: jobData.earnings,
          relatedProjectId: jobData.jobId
        })
      }

      console.log(`✅ Job completion triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering job completion:', error)
    }
  }

  // =============================================
  // EVENT ATTENDANCE TRIGGERS
  // =============================================

  async triggerEventAttendance(userId: string, eventData: {
    eventId: string
    eventType: string
    isPerformer: boolean
    venueSize?: number
    attendance?: number
  }): Promise<void> {
    try {
      if (eventData.isPerformer) {
        await this.recordMetric({
          metricKey: 'events_completed_total',
          eventType: 'performance_completed',
          delta: 1,
          relatedEventId: eventData.eventId
        })

        // Check for sold out shows
        if (eventData.attendance && eventData.venueSize && eventData.attendance >= eventData.venueSize * 0.95) {
          await this.recordMetric({
            metricKey: 'sold_out_events_total',
            eventType: 'sold_out_show',
            delta: 1,
            relatedEventId: eventData.eventId
          })
        }

        // Check for festival headlining
        if (eventData.eventType === 'festival' && eventData.venueSize && eventData.venueSize >= 1000) {
          await this.recordMetric({
            metricKey: 'festival_headlines_total',
            eventType: 'festival_headlined',
            delta: 1,
            relatedEventId: eventData.eventId
          })
        }
      } else {
        await this.recordMetric({
          metricKey: 'events_attended_total',
          eventType: 'event_attended',
          delta: 1,
          relatedEventId: eventData.eventId
        })
      }

      console.log(`✅ Event attendance triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering event attendance:', error)
    }
  }

  // =============================================
  // COLLABORATION TRIGGERS
  // =============================================

  async triggerCollaboration(userId: string, collaborationData: {
    collaborationId: string
    collaborationType: string
    participants: number
    genres: string[]
    duration?: number
  }): Promise<void> {
    try {
      await this.recordMetric({
        metricKey: 'collaborations_completed_total',
        eventType: 'collaboration_completed',
        delta: 1,
        relatedCollaborationId: collaborationData.collaborationId
      })

      // Check for cross-genre collaboration
      if (collaborationData.genres.length >= 2) {
        await this.recordMetric({
          metricKey: 'cross_genre_collaborations_total',
          eventType: 'cross_genre_collaboration',
          delta: 1,
          relatedCollaborationId: collaborationData.collaborationId
        })
      }

      console.log(`✅ Collaboration triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering collaboration:', error)
    }
  }

  // =============================================
  // MUSIC UPLOAD TRIGGERS
  // =============================================

  async triggerMusicUpload(userId: string, musicData: {
    trackId: string
    isAlbum: boolean
    streams?: number
    genre: string
  }): Promise<void> {
    try {
      if (musicData.isAlbum) {
        await this.recordMetric({
          metricKey: 'albums_released_total',
          eventType: 'album_released',
          delta: 1,
          relatedProjectId: musicData.trackId
        })
      } else {
        await this.recordMetric({
          metricKey: 'tracks_public_total',
          eventType: 'track_uploaded',
          delta: 1,
          relatedProjectId: musicData.trackId
        })
      }

      // Check for streaming milestones
      if (musicData.streams) {
        await this.recordMetric({
          metricKey: 'track_plays_total',
          eventType: 'streams_reached',
          absoluteValue: musicData.streams,
          relatedProjectId: musicData.trackId
        })
      }

      console.log(`✅ Music upload triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering music upload:', error)
    }
  }

  // =============================================
  // COMMUNITY TRIGGERS
  // =============================================

  async triggerCommunityAction(userId: string, actionData: {
    actionType: 'help' | 'mentor' | 'follow'
    targetUserId?: string
    followersCount?: number
  }): Promise<void> {
    try {
      switch (actionData.actionType) {
        case 'help':
          await this.recordMetric({
            metricKey: 'artists_helped_total',
            eventType: 'artist_helped',
            delta: 1,
            eventData: { target_user_id: actionData.targetUserId }
          })
          break

        case 'mentor':
          await this.recordMetric({
            metricKey: 'artists_mentored_total',
            eventType: 'artist_mentored',
            delta: 1,
            eventData: { target_user_id: actionData.targetUserId }
          })
          break

        case 'follow':
          if (!actionData.followersCount) break
          await this.recordMetric({
            metricKey: 'followers_total',
            eventType: 'followers_gained',
            absoluteValue: actionData.followersCount
          })
          break
      }

      console.log(`✅ Community action triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering community action:', error)
    }
  }

  // =============================================
  // ENDORSEMENT TRIGGERS
  // =============================================

  async triggerEndorsement(userId: string, endorsementData: {
    skill: string
    level: number
    endorserId: string
  }): Promise<void> {
    try {
      await this.recordMetric({
        metricKey: 'endorsements_received_total',
        eventType: 'endorsement_received',
        delta: 1,
        eventData: {
          skill: endorsementData.skill,
          endorser_id: endorsementData.endorserId
        }
      })

      console.log(`✅ Endorsement triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering endorsement:', error)
    }
  }

  // =============================================
  // MILESTONE TRIGGERS
  // =============================================

  async triggerMilestone(userId: string, milestoneData: {
    milestoneType: string
    value: number
    projectId?: string
  }): Promise<void> {
    try {
      switch (milestoneData.milestoneType) {
        case 'projects_completed':
          await this.recordMetric({
            metricKey: 'projects_completed_total',
            eventType: 'projects_completed',
            absoluteValue: milestoneData.value,
            relatedProjectId: milestoneData.projectId
          })
          break

        case 'platform_years':
          await this.recordMetric({
            metricKey: 'platform_years',
            eventType: 'platform_years',
            absoluteValue: milestoneData.value
          })
          break
        case 'response_rate':
          await this.recordMetric({
            metricKey: 'response_rate',
            eventType: 'response_rate',
            absoluteValue: milestoneData.value
          })
          break
      }

      console.log(`✅ Milestone triggered for user ${userId}`)
    } catch (error) {
      console.error('Error triggering milestone:', error)
    }
  }
}

export const achievementTriggerService = new AchievementTriggerService() 