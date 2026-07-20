export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Generated from the additive Music Trust Phase 1 schema. Kept as an
// intersection so the repository's older handwritten compatibility types
// remain available until the complete local schema is regenerated.
type GeneratedTable<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
}

type GeneratedMusicTrustTables = {
  music_upload_declarations: GeneratedTable<{
    id: string; track_id: string; user_id: string; declaration_version: number
    rights_confirmed: boolean; ai_use_category: string; ai_tools: Json
    ai_disclosure_details: string | null; synthesized_voice_or_likeness: boolean
    contributor_disclosures_confirmed: boolean; source_material_available: boolean
    training_use_policy: string; music_upload_policy_version: string
    human_music_policy_version: string; accepted_music_upload_policy: boolean
    accepted_human_music_policy: boolean; statement_text_hash: string
    idempotency_key: string; declared_at: string; superseded_at: string | null; created_at: string
  }>
  music_file_fingerprints: GeneratedTable<{
    id: string; track_id: string; user_id: string; declaration_id: string | null
    file_role: string; storage_bucket: string; storage_path: string; sha256: string | null
    acoustic_fingerprint: string | null; fingerprint_algorithm: string | null
    byte_size: number | null; mime_type: string | null; technical_metadata: Json
    match_signals: Json; processing_status: string; attempt_count: number; max_attempts: number
    next_attempt_at: string; locked_at: string | null; locked_by: string | null
    processing_error_code: string | null; processing_error: string | null
    processor_version: string | null; processed_at: string | null
    idempotency_key: string; created_at: string; updated_at: string
  }>
  music_origin_records: GeneratedTable<{
    id: string; public_id: string; track_id: string; user_id: string
    declaration_id: string; fingerprint_id: string; version: number; schema_version: string
    manifest_json: Json; manifest_hash: string; previous_manifest_hash: string | null
    status: string; is_public: boolean; recorded_at: string
    superseded_at: string | null; created_at: string
  }>
  music_origin_events: GeneratedTable<{
    id: string; track_id: string; origin_record_id: string | null; actor_user_id: string | null
    event_type: string; event_data: Json; request_id: string | null; created_at: string
  }>
  music_certification_cases: GeneratedTable<{
    id: string; public_id: string; track_id: string; user_id: string; case_version: number
    based_on_declaration_id: string; certification_type: string; standard_version: string
    status: string; requested_level: number; disclosures: Json; contributor_confirmation: boolean
    idempotency_key: string; submitted_at: string | null; review_started_at: string | null
    decided_at: string | null; withdrawn_at: string | null; created_at: string; updated_at: string
  }>
  music_certification_evidence: GeneratedTable<{
    id: string; case_id: string; track_id: string; user_id: string; evidence_type: string
    storage_bucket: string; storage_path: string; original_filename: string | null
    mime_type: string | null; byte_size: number | null; external_reference: string | null
    sha256: string | null; metadata: Json; status: string; locked_at: string | null
    created_at: string; reviewed_at: string | null
  }>
  music_certification_reviews: GeneratedTable<{
    id: string; case_id: string; reviewer_user_id: string | null; decision: string
    reason_codes: string[]; findings: Json; artist_message: string | null
    internal_notes: string | null; standard_version: string; idempotency_key: string; created_at: string
  }>
  music_certification_events: GeneratedTable<{
    id: string; case_id: string; actor_user_id: string | null; actor_type: string
    event_type: string; from_status: string | null; to_status: string | null
    event_data: Json; artist_visible: boolean; request_id: string | null; created_at: string
  }>
  music_certificates: GeneratedTable<{
    id: string; public_id: string; case_id: string; track_id: string; user_id: string
    origin_record_id: string | null; certificate_version: number; standard_version: string
    certification_level: number; manifest_json: Json; manifest_hash: string; status: string
    issued_at: string; suspended_at: string | null; reactivated_at: string | null
    revoked_at: string | null; superseded_at: string | null; superseded_by: string | null; created_at: string
  }>
  content_report_events: GeneratedTable<{
    id: string; report_id: string; actor_user_id: string | null; event_type: string
    from_status: string | null; to_status: string | null; event_data: Json; created_at: string
  }>
}

export interface Database {
  public: {
    Tables: GeneratedMusicTrustTables & {
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          type: string
          visibility: string
          location: string | null
          tagged_users: string[] | null
          hashtags: string[] | null
          media_urls: string[] | null
          posted_as_profile_id: string | null
          posted_as_type: string | null
          account_display_name: string | null
          account_username: string | null
          account_avatar_url: string | null
          content_ref_type: string | null
          content_ref_id: string | null
          metadata: Json | null
          poll_ends_at: string | null
          poll_total_votes: number
          likes_count: number
          comments_count: number
          shares_count: number
          views_count: number
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          type?: string
          visibility?: string
          location?: string | null
          tagged_users?: string[] | null
          hashtags?: string[] | null
          media_urls?: string[] | null
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          account_display_name?: string | null
          account_username?: string | null
          account_avatar_url?: string | null
          content_ref_type?: string | null
          content_ref_id?: string | null
          metadata?: Json | null
          poll_ends_at?: string | null
          poll_total_votes?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          views_count?: number
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          type?: string
          visibility?: string
          location?: string | null
          tagged_users?: string[] | null
          hashtags?: string[] | null
          media_urls?: string[] | null
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          account_display_name?: string | null
          account_username?: string | null
          account_avatar_url?: string | null
          content_ref_type?: string | null
          content_ref_id?: string | null
          metadata?: Json | null
          poll_ends_at?: string | null
          poll_total_votes?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          views_count?: number
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_comment_id: string | null
          content: string
          likes_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_comment_id?: string | null
          content: string
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          parent_comment_id?: string | null
          content?: string
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      comment_likes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          role: string
          is_verified: boolean
          followers_count: number
          following_count: number
          posts_count: number
          created_at: string
          updated_at: string
          stripe_connect_account_id: string | null
          stripe_connect_v2_account_id: string | null
          stripe_connect_account_kind: 'v1_express' | 'v2' | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          role?: string
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          created_at?: string
          updated_at?: string
          stripe_connect_account_id?: string | null
          stripe_connect_v2_account_id?: string | null
          stripe_connect_account_kind?: 'v1_express' | 'v2' | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          role?: string
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          created_at?: string
          updated_at?: string
          stripe_connect_account_id?: string | null
          stripe_connect_v2_account_id?: string | null
          stripe_connect_account_kind?: 'v1_express' | 'v2' | null
          stripe_customer_id?: string | null
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      hashtags: {
        Row: {
          id: string
          name: string
          posts_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          posts_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          posts_count?: number
          created_at?: string
        }
      }
      post_hashtags: {
        Row: {
          id: string
          post_id: string
          hashtag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          hashtag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          hashtag_id?: string
          created_at?: string
        }
      }
      post_media: {
        Row: {
          id: string
          post_id: string
          type: string
          url: string
          thumbnail_url: string | null
          alt_text: string | null
          duration: number | null
          file_size: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          type: string
          url: string
          thumbnail_url?: string | null
          alt_text?: string | null
          duration?: number | null
          file_size?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          type?: string
          url?: string
          thumbnail_url?: string | null
          alt_text?: string | null
          duration?: number | null
          file_size?: number | null
          order_index?: number
          created_at?: string
        }
      }
      post_shares: {
        Row: {
          id: string
          post_id: string
          user_id: string
          shared_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          shared_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          shared_to?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      music_tracks: {
        Row: Record<string, unknown> & {
          id: string; user_id: string; title: string; is_public: boolean; is_visible: boolean
          moderation_status: string; rights_confirmed: boolean; ai_use_category: string
          training_use_policy: string; origin_status: string; certification_status: string
          certification_level: number; certification_public_id: string | null
          certification_standard_version: string | null; certification_updated_at: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
