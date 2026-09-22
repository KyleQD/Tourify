export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_relationships: {
        Row: {
          account_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          owned_profile_id: string
          owner_profile_id: string | null
          owner_user_id: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          account_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owned_profile_id: string
          owner_profile_id?: string | null
          owner_user_id?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          owned_profile_id?: string
          owner_profile_id?: string | null
          owner_user_id?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_relationships_owned_profile_id_fkey"
            columns: ["owned_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "account_relationships_owned_profile_id_fkey"
            columns: ["owned_profile_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_relationships_owned_profile_id_fkey"
            columns: ["owned_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_relationships_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "account_relationships_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_relationships_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string | null
          display_name: string
          engagement_score: number | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          metadata: Json | null
          owner_user_id: string
          post_count: number | null
          profile_id: string
          profile_table: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_type: string
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          engagement_score?: number | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          owner_user_id: string
          post_count?: number | null
          profile_id: string
          profile_table: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          engagement_score?: number | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          owner_user_id?: string
          post_count?: number | null
          profile_id?: string
          profile_table?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      achievement_progress_events: {
        Row: {
          achievement_id: string | null
          created_at: string
          event_data: Json
          event_source: string | null
          event_type: string
          event_value: number
          id: string
          metric_key: string | null
          metric_value: number | null
          related_collaboration_id: string | null
          related_event_id: string | null
          related_project_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          event_data?: Json
          event_source?: string | null
          event_type: string
          event_value?: number
          id?: string
          metric_key?: string | null
          metric_value?: number | null
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          event_data?: Json
          event_source?: string | null
          event_type?: string
          event_value?: number
          id?: string
          metric_key?: string | null
          metric_value?: number | null
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_progress_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          bg_color: string | null
          border_color: string | null
          catalog_version: number
          category: string
          color: string | null
          created_at: string
          description: string
          display_order: number
          evaluation_mode: string
          group_key: string | null
          icon: string
          id: string
          is_active: boolean
          is_hidden: boolean
          level: number
          metadata: Json
          metric_key: string | null
          name: string
          points: number
          rarity: string
          requirements: Json
          subcategory: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          border_color?: string | null
          catalog_version?: number
          category: string
          color?: string | null
          created_at?: string
          description: string
          display_order?: number
          evaluation_mode?: string
          group_key?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          level?: number
          metadata?: Json
          metric_key?: string | null
          name: string
          points?: number
          rarity?: string
          requirements?: Json
          subcategory?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          border_color?: string | null
          catalog_version?: number
          category?: string
          color?: string | null
          created_at?: string
          description?: string
          display_order?: number
          evaluation_mode?: string
          group_key?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          level?: number
          metadata?: Json
          metric_key?: string | null
          name?: string
          points?: number
          rarity?: string
          requirements?: Json
          subcategory?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      advancing_documents: {
        Row: {
          backline_notes: string | null
          backline_provided: boolean | null
          catering_notes: string | null
          comps_count: number | null
          created_at: string
          deal_type: string | null
          dietary_restrictions: string[] | null
          door_percentage: number | null
          dressing_rooms_count: number | null
          estimated_expenses: number | null
          event_id: string | null
          foh_console: string | null
          guarantee_amount: number | null
          id: string
          local_promoter_name: string | null
          local_promoter_phone: string | null
          meal_count: number | null
          mon_console: string | null
          monitor_mixes_count: number | null
          monitor_type: string | null
          notes: string | null
          org_id: string
          parking_passes_count: number | null
          power_requirements: string | null
          production_manager_name: string | null
          production_manager_phone: string | null
          settlement_contact: string | null
          share_token: string | null
          sound_system_type: string | null
          stage_depth_ft: number | null
          stage_height_ft: number | null
          stage_width_ft: number | null
          status: string
          tour_id: string | null
          towels_count: number | null
          updated_at: string
          venue_contact_email: string | null
          venue_contact_name: string | null
          venue_contact_phone: string | null
          vs_expenses: boolean | null
        }
        Insert: {
          backline_notes?: string | null
          backline_provided?: boolean | null
          catering_notes?: string | null
          comps_count?: number | null
          created_at?: string
          deal_type?: string | null
          dietary_restrictions?: string[] | null
          door_percentage?: number | null
          dressing_rooms_count?: number | null
          estimated_expenses?: number | null
          event_id?: string | null
          foh_console?: string | null
          guarantee_amount?: number | null
          id?: string
          local_promoter_name?: string | null
          local_promoter_phone?: string | null
          meal_count?: number | null
          mon_console?: string | null
          monitor_mixes_count?: number | null
          monitor_type?: string | null
          notes?: string | null
          org_id: string
          parking_passes_count?: number | null
          power_requirements?: string | null
          production_manager_name?: string | null
          production_manager_phone?: string | null
          settlement_contact?: string | null
          share_token?: string | null
          sound_system_type?: string | null
          stage_depth_ft?: number | null
          stage_height_ft?: number | null
          stage_width_ft?: number | null
          status?: string
          tour_id?: string | null
          towels_count?: number | null
          updated_at?: string
          venue_contact_email?: string | null
          venue_contact_name?: string | null
          venue_contact_phone?: string | null
          vs_expenses?: boolean | null
        }
        Update: {
          backline_notes?: string | null
          backline_provided?: boolean | null
          catering_notes?: string | null
          comps_count?: number | null
          created_at?: string
          deal_type?: string | null
          dietary_restrictions?: string[] | null
          door_percentage?: number | null
          dressing_rooms_count?: number | null
          estimated_expenses?: number | null
          event_id?: string | null
          foh_console?: string | null
          guarantee_amount?: number | null
          id?: string
          local_promoter_name?: string | null
          local_promoter_phone?: string | null
          meal_count?: number | null
          mon_console?: string | null
          monitor_mixes_count?: number | null
          monitor_type?: string | null
          notes?: string | null
          org_id?: string
          parking_passes_count?: number | null
          power_requirements?: string | null
          production_manager_name?: string | null
          production_manager_phone?: string | null
          settlement_contact?: string | null
          share_token?: string | null
          sound_system_type?: string | null
          stage_depth_ft?: number | null
          stage_height_ft?: number | null
          stage_width_ft?: number | null
          status?: string
          tour_id?: string | null
          towels_count?: number | null
          updated_at?: string
          venue_contact_email?: string | null
          venue_contact_name?: string | null
          venue_contact_phone?: string | null
          vs_expenses?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "advancing_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advancing_documents_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_artists: {
        Row: {
          agency_id: string
          artist_id: string
          created_at: string | null
        }
        Insert: {
          agency_id: string
          artist_id: string
          created_at?: string | null
        }
        Update: {
          agency_id?: string
          artist_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_artists_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "performance_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      agreement_acceptances: {
        Row: {
          accepted_at: string
          context: string | null
          id: string
          ip: string | null
          metadata: Json
          organization_id: string | null
          signature_method: string | null
          template_id: string | null
          template_version: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          context?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          organization_id?: string | null
          signature_method?: string | null
          template_id?: string | null
          template_version: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          context?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          organization_id?: string | null
          signature_method?: string | null
          template_id?: string | null
          template_version?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_acceptances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "agreement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_templates: {
        Row: {
          body_markdown: string | null
          created_at: string
          id: string
          jurisdiction_hint: string | null
          organization_id: string | null
          slug: string
          title: string
          version: number
        }
        Insert: {
          body_markdown?: string | null
          created_at?: string
          id?: string
          jurisdiction_hint?: string | null
          organization_id?: string | null
          slug: string
          title: string
          version?: number
        }
        Update: {
          body_markdown?: string | null
          created_at?: string
          id?: string
          jurisdiction_hint?: string | null
          organization_id?: string | null
          slug?: string
          title?: string
          version?: number
        }
        Relationships: []
      }
      album_likes: {
        Row: {
          album_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          album_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          album_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_likes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      application_form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          fields: Json
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      artist_blog_posts: {
        Row: {
          account_avatar_url: string | null
          account_display_name: string | null
          account_is_verified: boolean | null
          account_username: string | null
          artist_profile_id: string | null
          categories: string[] | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          posted_as_profile_id: string | null
          posted_as_type: string | null
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          stats: Json | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_avatar_url?: string | null
          account_display_name?: string | null
          account_is_verified?: boolean | null
          account_username?: string | null
          artist_profile_id?: string | null
          categories?: string[] | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          stats?: Json | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_avatar_url?: string | null
          account_display_name?: string | null
          account_is_verified?: boolean | null
          account_username?: string | null
          artist_profile_id?: string | null
          categories?: string[] | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          stats?: Json | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_blog_posts_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_blog_posts_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      artist_contracts: {
        Row: {
          amount: number | null
          client_company: string | null
          client_email: string | null
          client_name: string
          counterparty_user_id: string | null
          created_at: string
          currency: string | null
          document_url: string | null
          end_date: string | null
          id: string
          metadata: Json
          notes: string | null
          sent_at: string | null
          start_date: string
          status: string
          template_id: string | null
          terms: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          client_company?: string | null
          client_email?: string | null
          client_name: string
          counterparty_user_id?: string | null
          created_at?: string
          currency?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          sent_at?: string | null
          start_date: string
          status?: string
          template_id?: string | null
          terms?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          client_company?: string | null
          client_email?: string | null
          client_name?: string
          counterparty_user_id?: string | null
          created_at?: string
          currency?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          sent_at?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          terms?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_dashboard_layouts: {
        Row: {
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_epk_settings: {
        Row: {
          artist_profile_id: string | null
          created_at: string
          custom_domain: string | null
          epk_slug: string | null
          id: string
          is_public: boolean
          seo_description: string | null
          seo_title: string | null
          settings: Json
          template: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_profile_id?: string | null
          created_at?: string
          custom_domain?: string | null
          epk_slug?: string | null
          id?: string
          is_public?: boolean
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json
          template?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_profile_id?: string | null
          created_at?: string
          custom_domain?: string | null
          epk_slug?: string | null
          id?: string
          is_public?: boolean
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json
          template?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_epk_settings_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_epk_settings_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      artist_events: {
        Row: {
          artist_profile_id: string | null
          capacity: number | null
          created_at: string
          description: string | null
          doors_open: string | null
          end_time: string | null
          event_date: string | null
          expected_attendance: number | null
          global_search_vector: unknown | null
          id: string
          is_public: boolean | null
          notes: string | null
          poster_url: string | null
          setlist: string[] | null
          start_time: string | null
          status: string | null
          ticket_price_max: number | null
          ticket_price_min: number | null
          ticket_url: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          venue_address: string | null
          venue_city: string | null
          venue_coordinates: Json | null
          venue_country: string | null
          venue_name: string | null
          venue_state: string | null
        }
        Insert: {
          artist_profile_id?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          doors_open?: string | null
          end_time?: string | null
          event_date?: string | null
          expected_attendance?: number | null
          global_search_vector?: unknown | null
          id?: string
          is_public?: boolean | null
          notes?: string | null
          poster_url?: string | null
          setlist?: string[] | null
          start_time?: string | null
          status?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_url?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          venue_address?: string | null
          venue_city?: string | null
          venue_coordinates?: Json | null
          venue_country?: string | null
          venue_name?: string | null
          venue_state?: string | null
        }
        Update: {
          artist_profile_id?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          doors_open?: string | null
          end_time?: string | null
          event_date?: string | null
          expected_attendance?: number | null
          global_search_vector?: unknown | null
          id?: string
          is_public?: boolean | null
          notes?: string | null
          poster_url?: string | null
          setlist?: string[] | null
          start_time?: string | null
          status?: string | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_url?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          venue_address?: string | null
          venue_city?: string | null
          venue_coordinates?: Json | null
          venue_country?: string | null
          venue_name?: string | null
          venue_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_events_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_events_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      artist_financial_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          occurred_at: string
          source_id: string | null
          source_table: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          occurred_at?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_job_applications: {
        Row: {
          additional_files: string[] | null
          applicant_id: string
          applied_at: string
          artist_profile_id: string | null
          availability_notes: string | null
          contact_email: string
          contact_phone: string | null
          cover_letter: string | null
          demo_reel_url: string | null
          experience_description: string | null
          feedback: string | null
          id: string
          job_id: string
          portfolio_links: string[] | null
          preferred_contact_method: string | null
          rating: number | null
          responded_at: string | null
          resume_url: string | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          additional_files?: string[] | null
          applicant_id: string
          applied_at?: string
          artist_profile_id?: string | null
          availability_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          cover_letter?: string | null
          demo_reel_url?: string | null
          experience_description?: string | null
          feedback?: string | null
          id?: string
          job_id: string
          portfolio_links?: string[] | null
          preferred_contact_method?: string | null
          rating?: number | null
          responded_at?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          additional_files?: string[] | null
          applicant_id?: string
          applied_at?: string
          artist_profile_id?: string | null
          availability_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          cover_letter?: string | null
          demo_reel_url?: string | null
          experience_description?: string | null
          feedback?: string | null
          id?: string
          job_id?: string
          portfolio_links?: string[] | null
          preferred_contact_method?: string | null
          rating?: number | null
          responded_at?: string | null
          resume_url?: string | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_job_applications_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_job_applications_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "artist_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "artist_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_job_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_job_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "artist_job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_job_saves: {
        Row: {
          id: string
          job_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          job_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          job_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_job_saves_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "artist_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_job_views: {
        Row: {
          id: string
          job_id: string
          viewed_at: string
          viewer_id: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          job_id: string
          viewed_at?: string
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          viewed_at?: string
          viewer_id?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_job_views_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "artist_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_jobs: {
        Row: {
          age_requirement: string | null
          applications_count: number | null
          attachments: Json | null
          benefits: string[] | null
          category_id: string
          city: string | null
          collaboration_details: Json | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string
          duration_hours: number | null
          event_date: string | null
          event_time: string | null
          expires_at: string | null
          external_link: string | null
          featured: boolean | null
          genre: string | null
          global_search_vector: unknown | null
          id: string
          instruments_needed: string[] | null
          job_type: string
          location: string | null
          location_type: string | null
          payment_amount: number | null
          payment_currency: string | null
          payment_description: string | null
          payment_type: string
          posted_by: string
          posted_by_profile_id: string | null
          posted_by_type: string
          poster_profile_id: string | null
          priority: string | null
          required_equipment: string[] | null
          required_experience: string | null
          required_genres: string[] | null
          required_skills: string[] | null
          special_requirements: string | null
          state: string | null
          status: string | null
          title: string
          tour_id: string | null
          tour_name: string | null
          updated_at: string
          views_count: number | null
        }
        Insert: {
          age_requirement?: string | null
          applications_count?: number | null
          attachments?: Json | null
          benefits?: string[] | null
          category_id: string
          city?: string | null
          collaboration_details?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          duration_hours?: number | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          external_link?: string | null
          featured?: boolean | null
          genre?: string | null
          global_search_vector?: unknown | null
          id?: string
          instruments_needed?: string[] | null
          job_type: string
          location?: string | null
          location_type?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_description?: string | null
          payment_type: string
          posted_by: string
          posted_by_profile_id?: string | null
          posted_by_type: string
          poster_profile_id?: string | null
          priority?: string | null
          required_equipment?: string[] | null
          required_experience?: string | null
          required_genres?: string[] | null
          required_skills?: string[] | null
          special_requirements?: string | null
          state?: string | null
          status?: string | null
          title: string
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          age_requirement?: string | null
          applications_count?: number | null
          attachments?: Json | null
          benefits?: string[] | null
          category_id?: string
          city?: string | null
          collaboration_details?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          duration_hours?: number | null
          event_date?: string | null
          event_time?: string | null
          expires_at?: string | null
          external_link?: string | null
          featured?: boolean | null
          genre?: string | null
          global_search_vector?: unknown | null
          id?: string
          instruments_needed?: string[] | null
          job_type?: string
          location?: string | null
          location_type?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_description?: string | null
          payment_type?: string
          posted_by?: string
          posted_by_profile_id?: string | null
          posted_by_type?: string
          poster_profile_id?: string | null
          priority?: string | null
          required_equipment?: string[] | null
          required_experience?: string | null
          required_genres?: string[] | null
          required_skills?: string[] | null
          special_requirements?: string | null
          state?: string | null
          status?: string | null
          title?: string
          tour_id?: string | null
          tour_name?: string | null
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "artist_job_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_jobs_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_marketing_campaigns: {
        Row: {
          budget: number | null
          content_types: string[] | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          metrics: Json | null
          name: string
          objectives: string[] | null
          platforms: string[] | null
          spent: number | null
          start_date: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          content_types?: string[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name: string
          objectives?: string[] | null
          platforms?: string[] | null
          spent?: number | null
          start_date?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          content_types?: string[] | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          metrics?: Json | null
          name?: string
          objectives?: string[] | null
          platforms?: string[] | null
          spent?: number | null
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_music: {
        Row: {
          access_mode: string
          allow_downloads: boolean
          allow_library_add: boolean
          allow_profile_feature: boolean
          apple_music_url: string | null
          artist_profile_id: string | null
          cover_art_url: string | null
          created_at: string
          credits: Json | null
          description: string | null
          duration: number | null
          file_url: string | null
          genre: string | null
          global_search_vector: unknown | null
          id: string
          is_featured: boolean | null
          is_pinned: boolean
          is_public: boolean | null
          is_visible: boolean
          listing_sync_error: string | null
          listing_sync_status: string
          lyrics: string | null
          metadata: Json | null
          moderation_status: string
          preview_duration_seconds: number
          preview_error: string | null
          preview_file_url: string | null
          preview_generated_at: string | null
          preview_mode: string
          preview_status: string
          preview_storage_bucket: string | null
          preview_storage_path: string | null
          release_date: string | null
          rights_confirmed: boolean
          rights_confirmed_at: string | null
          soundcloud_url: string | null
          spotify_url: string | null
          stats: Json | null
          storage_bucket: string | null
          storage_path: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          access_mode?: string
          allow_downloads?: boolean
          allow_library_add?: boolean
          allow_profile_feature?: boolean
          apple_music_url?: string | null
          artist_profile_id?: string | null
          cover_art_url?: string | null
          created_at?: string
          credits?: Json | null
          description?: string | null
          duration?: number | null
          file_url?: string | null
          genre?: string | null
          global_search_vector?: unknown | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean
          is_public?: boolean | null
          is_visible?: boolean
          listing_sync_error?: string | null
          listing_sync_status?: string
          lyrics?: string | null
          metadata?: Json | null
          moderation_status?: string
          preview_duration_seconds?: number
          preview_error?: string | null
          preview_file_url?: string | null
          preview_generated_at?: string | null
          preview_mode?: string
          preview_status?: string
          preview_storage_bucket?: string | null
          preview_storage_path?: string | null
          release_date?: string | null
          rights_confirmed?: boolean
          rights_confirmed_at?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stats?: Json | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          access_mode?: string
          allow_downloads?: boolean
          allow_library_add?: boolean
          allow_profile_feature?: boolean
          apple_music_url?: string | null
          artist_profile_id?: string | null
          cover_art_url?: string | null
          created_at?: string
          credits?: Json | null
          description?: string | null
          duration?: number | null
          file_url?: string | null
          genre?: string | null
          global_search_vector?: unknown | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean
          is_public?: boolean | null
          is_visible?: boolean
          listing_sync_error?: string | null
          listing_sync_status?: string
          lyrics?: string | null
          metadata?: Json | null
          moderation_status?: string
          preview_duration_seconds?: number
          preview_error?: string | null
          preview_file_url?: string | null
          preview_generated_at?: string | null
          preview_mode?: string
          preview_status?: string
          preview_storage_bucket?: string | null
          preview_storage_path?: string | null
          release_date?: string | null
          rights_confirmed?: boolean
          rights_confirmed_at?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          stats?: Json | null
          storage_bucket?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_music_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_music_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      artist_profiles: {
        Row: {
          artist_name: string | null
          bio: string | null
          created_at: string
          genres: string[] | null
          global_search_vector: unknown | null
          id: string
          settings: Json
          social_links: Json | null
          updated_at: string
          url_slug: string | null
          user_id: string
        }
        Insert: {
          artist_name?: string | null
          bio?: string | null
          created_at?: string
          genres?: string[] | null
          global_search_vector?: unknown | null
          id?: string
          settings?: Json
          social_links?: Json | null
          updated_at?: string
          url_slug?: string | null
          user_id: string
        }
        Update: {
          artist_name?: string | null
          bio?: string | null
          created_at?: string
          genres?: string[] | null
          global_search_vector?: unknown | null
          id?: string
          settings?: Json
          social_links?: Json | null
          updated_at?: string
          url_slug?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artist_social_integrations: {
        Row: {
          access_token: string | null
          account_handle: string
          analytics: Json | null
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync: string | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_handle: string
          analytics?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_handle?: string
          analytics?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_social_posts: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string
          hashtags: string[] | null
          id: string
          media_type: string
          media_url: string | null
          mentions: string[] | null
          metrics: Json | null
          platform: string
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_type: string
          media_url?: string | null
          mentions?: string[] | null
          metrics?: Json | null
          platform: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_type?: string
          media_url?: string | null
          mentions?: string[] | null
          metrics?: Json | null
          platform?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "artist_marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_subscription_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          interval: string
          name: string
          price: number
          status: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          subscriber_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          name: string
          price: number
          status?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          name?: string
          price?: number
          status?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          subscriber_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          analysis_completed: boolean | null
          bitrate: number | null
          bpm: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          key: string | null
          markers: Json | null
          project_file_id: string
          sample_rate: number | null
          waveform_data: Json | null
          waveform_generated: boolean | null
        }
        Insert: {
          analysis_completed?: boolean | null
          bitrate?: number | null
          bpm?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          key?: string | null
          markers?: Json | null
          project_file_id: string
          sample_rate?: number | null
          waveform_data?: Json | null
          waveform_generated?: boolean | null
        }
        Update: {
          analysis_completed?: boolean | null
          bitrate?: number | null
          bpm?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          key?: string | null
          markers?: Json | null
          project_file_id?: string
          sample_rate?: number | null
          waveform_data?: Json | null
          waveform_generated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_project_file_id_fkey"
            columns: ["project_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string
          entity_kind: string
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id: string
          entity_kind: string
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string
          entity_kind?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          auto_grant_conditions: Json
          bg_color: string | null
          border_color: string | null
          category: string
          color: string | null
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          is_auto_granted: boolean
          is_verification_badge: boolean
          level: number
          metadata: Json
          name: string
          rarity: string
          requirements: Json
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          auto_grant_conditions?: Json
          bg_color?: string | null
          border_color?: string | null
          category: string
          color?: string | null
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_auto_granted?: boolean
          is_verification_badge?: boolean
          level?: number
          metadata?: Json
          name: string
          rarity?: string
          requirements?: Json
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          auto_grant_conditions?: Json
          bg_color?: string | null
          border_color?: string | null
          category?: string
          color?: string | null
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          is_auto_granted?: boolean
          is_verification_badge?: boolean
          level?: number
          metadata?: Json
          name?: string
          rarity?: string
          requirements?: Json
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          artist_id: string | null
          artist_user_id: string | null
          booking_details: Json | null
          created_at: string | null
          email: string | null
          event_id: string | null
          id: string
          phone: string | null
          request_type: string | null
          response_message: string | null
          status: string | null
          token: string | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id?: string | null
          artist_user_id?: string | null
          booking_details?: Json | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          phone?: string | null
          request_type?: string | null
          response_message?: string | null
          status?: string | null
          token?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string | null
          artist_user_id?: string | null
          booking_details?: Json | null
          created_at?: string | null
          email?: string | null
          event_id?: string | null
          id?: string
          phone?: string | null
          request_type?: string | null
          response_message?: string | null
          status?: string | null
          token?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "booking_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          category: string
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          notes: string | null
          org_id: string
          spent_amount: number
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          category: string
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          spent_amount?: number
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          category?: string
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          spent_amount?: number
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          venue_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          venue_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendars_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendars_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_applications: {
        Row: {
          applicant_id: string
          applied_at: string
          available_instruments: string[] | null
          collaboration_interest: string | null
          contact_email: string
          contact_phone: string | null
          id: string
          job_id: string
          message: string | null
          preferred_contact_method: string | null
          previous_collaborations: string | null
          responded_at: string | null
          response_message: string | null
          reviewed_at: string | null
          sample_attachments: Json | null
          status: string | null
        }
        Insert: {
          applicant_id: string
          applied_at?: string
          available_instruments?: string[] | null
          collaboration_interest?: string | null
          contact_email: string
          contact_phone?: string | null
          id?: string
          job_id: string
          message?: string | null
          preferred_contact_method?: string | null
          previous_collaborations?: string | null
          responded_at?: string | null
          response_message?: string | null
          reviewed_at?: string | null
          sample_attachments?: Json | null
          status?: string | null
        }
        Update: {
          applicant_id?: string
          applied_at?: string
          available_instruments?: string[] | null
          collaboration_interest?: string | null
          contact_email?: string
          contact_phone?: string | null
          id?: string
          job_id?: string
          message?: string | null
          preferred_contact_method?: string | null
          previous_collaborations?: string | null
          responded_at?: string | null
          response_message?: string | null
          reviewed_at?: string | null
          sample_attachments?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "artist_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          from_user_id: string
          id: string
          invitation_message: string | null
          project_id: string
          proposed_role: string | null
          responded_at: string | null
          response_message: string | null
          status: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          from_user_id: string
          id?: string
          invitation_message?: string | null
          project_id: string
          proposed_role?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          from_user_id?: string
          id?: string
          invitation_message?: string | null
          project_id?: string
          proposed_role?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_projects: {
        Row: {
          communication_channel_id: string | null
          created_at: string | null
          description: string | null
          genre: string[] | null
          id: string
          name: string
          owner_id: string
          privacy: string | null
          start_date: string | null
          status: string | null
          target_completion: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          communication_channel_id?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string[] | null
          id?: string
          name: string
          owner_id: string
          privacy?: string | null
          start_date?: string | null
          status?: string | null
          target_completion?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          communication_channel_id?: string | null
          created_at?: string | null
          description?: string | null
          genre?: string[] | null
          id?: string
          name?: string
          owner_id?: string
          privacy?: string | null
          start_date?: string | null
          status?: string | null
          target_completion?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_projects_communication_channel_id_fkey"
            columns: ["communication_channel_id"]
            isOneToOne: false
            referencedRelation: "communication_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_channels: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      connect_sessions: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          confirmed_at: string | null
          created_at: string
          expires_at: string
          handshake_method: string
          id: string
          last_device_context: Json | null
          last_transport_proof: Json | null
          one_time_claim: boolean
          profile_preview: Json
          sharer_user_id: string
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          expires_at: string
          handshake_method: string
          id: string
          last_device_context?: Json | null
          last_transport_proof?: Json | null
          one_time_claim?: boolean
          profile_preview?: Json
          sharer_user_id: string
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          handshake_method?: string
          id?: string
          last_device_context?: Json | null
          last_transport_proof?: Json | null
          one_time_claim?: boolean
          profile_preview?: Json
          sharer_user_id?: string
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      connect_telemetry_events: {
        Row: {
          app_version: string | null
          connect_session_id: string | null
          created_at: string
          device_model: string | null
          event_name: string
          id: number
          metadata: Json
          os_version: string | null
          platform: string
          request_id: string
          session_id: string | null
          user_id_hash: string | null
        }
        Insert: {
          app_version?: string | null
          connect_session_id?: string | null
          created_at?: string
          device_model?: string | null
          event_name: string
          id?: never
          metadata?: Json
          os_version?: string | null
          platform?: string
          request_id: string
          session_id?: string | null
          user_id_hash?: string | null
        }
        Update: {
          app_version?: string | null
          connect_session_id?: string | null
          created_at?: string
          device_model?: string | null
          event_name?: string
          id?: never
          metadata?: Json
          os_version?: string | null
          platform?: string
          request_id?: string
          session_id?: string | null
          user_id_hash?: string | null
        }
        Relationships: []
      }
      content_kind: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      content_refs: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          target_id: string | null
          target_url: string | null
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json | null
          target_id?: string | null
          target_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          target_id?: string | null
          target_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_refs_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "content_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_owner_user_id: string | null
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_user_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_owner_user_id?: string | null
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_owner_user_id?: string | null
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_id: string | null
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_id?: string | null
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_id?: string | null
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_last_message"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      day_sheet_receipts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          event_id: string
          id: string
          metadata: Json
          recipient_email: string | null
          recipient_user_id: string | null
          sent_at: string
          status: string
          version: number
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          version?: number
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          recipient_email?: string | null
          recipient_user_id?: string | null
          sent_at?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "day_sheet_receipts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      day_sheets: {
        Row: {
          catering_location: string | null
          catering_notes: string | null
          created_at: string
          curfew_time: string | null
          distributed_at: string | null
          doors_open_time: string | null
          event_id: string | null
          general_notes: string | null
          headliner_set_time: string | null
          id: string
          load_in_time: string | null
          org_id: string
          parking_notes: string | null
          production_advance_time: string | null
          recipients: string[] | null
          site_map_id: string | null
          sound_check_time: string | null
          support_set_time: string | null
          updated_at: string
          venue_address: string | null
          venue_city: string | null
          venue_name: string | null
          venue_phone: string | null
          version: number
        }
        Insert: {
          catering_location?: string | null
          catering_notes?: string | null
          created_at?: string
          curfew_time?: string | null
          distributed_at?: string | null
          doors_open_time?: string | null
          event_id?: string | null
          general_notes?: string | null
          headliner_set_time?: string | null
          id?: string
          load_in_time?: string | null
          org_id: string
          parking_notes?: string | null
          production_advance_time?: string | null
          recipients?: string[] | null
          site_map_id?: string | null
          sound_check_time?: string | null
          support_set_time?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_city?: string | null
          venue_name?: string | null
          venue_phone?: string | null
          version?: number
        }
        Update: {
          catering_location?: string | null
          catering_notes?: string | null
          created_at?: string
          curfew_time?: string | null
          distributed_at?: string | null
          doors_open_time?: string | null
          event_id?: string | null
          general_notes?: string | null
          headliner_set_time?: string | null
          id?: string
          load_in_time?: string | null
          org_id?: string
          parking_notes?: string | null
          production_advance_time?: string | null
          recipients?: string[] | null
          site_map_id?: string | null
          sound_check_time?: string | null
          support_set_time?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_city?: string | null
          venue_name?: string | null
          venue_phone?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "day_sheets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_sheets_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_assignments: {
        Row: {
          assignment_kind: string
          created_at: string
          department: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          ends_at: string | null
          event_id: string | null
          id: string
          job_application_id: string | null
          job_posting_id: string | null
          organizer_id: string | null
          permissions: Json
          position: string | null
          role_title: string
          source: string | null
          staff_member_id: string | null
          staff_shift_id: string | null
          starts_at: string | null
          status: string
          tour_id: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          assignment_kind?: string
          created_at?: string
          department?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          job_application_id?: string | null
          job_posting_id?: string | null
          organizer_id?: string | null
          permissions?: Json
          position?: string | null
          role_title: string
          source?: string | null
          staff_member_id?: string | null
          staff_shift_id?: string | null
          starts_at?: string | null
          status?: string
          tour_id?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          assignment_kind?: string
          created_at?: string
          department?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          ends_at?: string | null
          event_id?: string | null
          id?: string
          job_application_id?: string | null
          job_posting_id?: string | null
          organizer_id?: string | null
          permissions?: Json
          position?: string | null
          role_title?: string
          source?: string | null
          staff_member_id?: string | null
          staff_shift_id?: string | null
          starts_at?: string | null
          status?: string
          tour_id?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "unified_staff_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_staff_shift_id_fkey"
            columns: ["staff_shift_id"]
            isOneToOne: false
            referencedRelation: "staff_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "employment_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsements: {
        Row: {
          category: string | null
          collaboration_id: string | null
          comment: string | null
          created_at: string
          endorsee_id: string
          endorser_id: string
          event_id: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          job_id: string | null
          level: number | null
          project_id: string | null
          skill: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category?: string | null
          collaboration_id?: string | null
          comment?: string | null
          created_at?: string
          endorsee_id: string
          endorser_id: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          job_id?: string | null
          level?: number | null
          project_id?: string | null
          skill: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string | null
          collaboration_id?: string | null
          comment?: string | null
          created_at?: string
          endorsee_id?: string
          endorser_id?: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          job_id?: string | null
          level?: number | null
          project_id?: string | null
          skill?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      entity_managers: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      epk_telemetry: {
        Row: {
          created_at: string
          epk_slug: string
          event_type: string
          id: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          epk_slug: string
          event_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          epk_slug?: string
          event_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      equipment_assets: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_available: boolean | null
          metadata: Json | null
          name: string
          owner_id: string
          owner_type: string
          serial_number: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          metadata?: Json | null
          name: string
          owner_id: string
          owner_type: string
          serial_number?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          owner_type?: string
          serial_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_catalog: {
        Row: {
          availability_status: string | null
          category: string
          created_at: string | null
          created_by: string | null
          custom_shape_data: Json | null
          daily_rate: number | null
          description: string | null
          dimensions: Json | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_portable: boolean | null
          maintenance_notes: string | null
          manual_url: string | null
          manufacturer: string | null
          model: string | null
          name: string
          power_consumption: number | null
          requires_internet: boolean | null
          requires_power: boolean | null
          requires_setup: boolean | null
          requires_water: boolean | null
          security_deposit: number | null
          setup_instructions: string | null
          setup_time_minutes: number | null
          subcategory: string | null
          symbol_color: string | null
          symbol_size: number | null
          symbol_type: string | null
          updated_at: string | null
          vendor_id: string | null
          voltage_requirements: string | null
          weather_resistant: boolean | null
          weekly_rate: number | null
          weight: number | null
        }
        Insert: {
          availability_status?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          custom_shape_data?: Json | null
          daily_rate?: number | null
          description?: string | null
          dimensions?: Json | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_portable?: boolean | null
          maintenance_notes?: string | null
          manual_url?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          power_consumption?: number | null
          requires_internet?: boolean | null
          requires_power?: boolean | null
          requires_setup?: boolean | null
          requires_water?: boolean | null
          security_deposit?: number | null
          setup_instructions?: string | null
          setup_time_minutes?: number | null
          subcategory?: string | null
          symbol_color?: string | null
          symbol_size?: number | null
          symbol_type?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          voltage_requirements?: string | null
          weather_resistant?: boolean | null
          weekly_rate?: number | null
          weight?: number | null
        }
        Update: {
          availability_status?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          custom_shape_data?: Json | null
          daily_rate?: number | null
          description?: string | null
          dimensions?: Json | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_portable?: boolean | null
          maintenance_notes?: string | null
          manual_url?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          power_consumption?: number | null
          requires_internet?: boolean | null
          requires_power?: boolean | null
          requires_setup?: boolean | null
          requires_water?: boolean | null
          security_deposit?: number | null
          setup_instructions?: string | null
          setup_time_minutes?: number | null
          subcategory?: string | null
          symbol_color?: string | null
          symbol_size?: number | null
          symbol_type?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          voltage_requirements?: string | null
          weather_resistant?: boolean | null
          weekly_rate?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_instances: {
        Row: {
          asset_tag: string | null
          assigned_at: string | null
          assigned_to_user_id: string | null
          catalog_id: string
          connected_to_network: boolean | null
          created_at: string | null
          customer_contact: string | null
          customer_name: string | null
          height: number | null
          id: string
          instance_name: string | null
          last_inspection_date: string | null
          maintenance_notes: string | null
          next_inspection_date: string | null
          power_cable_length: number | null
          power_source_id: string | null
          rental_end_date: string | null
          rental_rate: number | null
          rental_start_date: string | null
          rotation: number | null
          serial_number: string | null
          setup_completed_time: string | null
          setup_notes: string | null
          setup_start_time: string | null
          site_map_id: string
          status: string | null
          updated_at: string | null
          width: number | null
          x: number
          y: number
        }
        Insert: {
          asset_tag?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          catalog_id: string
          connected_to_network?: boolean | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          height?: number | null
          id?: string
          instance_name?: string | null
          last_inspection_date?: string | null
          maintenance_notes?: string | null
          next_inspection_date?: string | null
          power_cable_length?: number | null
          power_source_id?: string | null
          rental_end_date?: string | null
          rental_rate?: number | null
          rental_start_date?: string | null
          rotation?: number | null
          serial_number?: string | null
          setup_completed_time?: string | null
          setup_notes?: string | null
          setup_start_time?: string | null
          site_map_id: string
          status?: string | null
          updated_at?: string | null
          width?: number | null
          x: number
          y: number
        }
        Update: {
          asset_tag?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          catalog_id?: string
          connected_to_network?: boolean | null
          created_at?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          height?: number | null
          id?: string
          instance_name?: string | null
          last_inspection_date?: string | null
          maintenance_notes?: string | null
          next_inspection_date?: string | null
          power_cable_length?: number | null
          power_source_id?: string | null
          rental_end_date?: string | null
          rental_rate?: number | null
          rental_start_date?: string | null
          rotation?: number | null
          serial_number?: string | null
          setup_completed_time?: string | null
          setup_notes?: string | null
          setup_start_time?: string | null
          site_map_id?: string
          status?: string | null
          updated_at?: string | null
          width?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipment_instances_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_instances_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_instances_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_instances_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_instances_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_locations: {
        Row: {
          address: string | null
          created_at: string
          equipment_id: string | null
          id: string
          latitude: number | null
          location_name: string
          location_type: string | null
          longitude: number | null
          notes: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          latitude?: number | null
          location_name: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          equipment_id?: string | null
          id?: string
          latitude?: number | null
          location_name?: string
          location_type?: string | null
          longitude?: number | null
          notes?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_locations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_power_connections: {
        Row: {
          cable_length: number | null
          connected_at: string | null
          connection_type: string | null
          created_at: string | null
          disconnected_at: string | null
          equipment_instance_id: string
          id: string
          is_connected: boolean | null
          is_gfci_protected: boolean | null
          last_safety_check: string | null
          power_draw_watts: number
          power_source_id: string
          safety_check_notes: string | null
          updated_at: string | null
          voltage_required: string | null
        }
        Insert: {
          cable_length?: number | null
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          equipment_instance_id: string
          id?: string
          is_connected?: boolean | null
          is_gfci_protected?: boolean | null
          last_safety_check?: string | null
          power_draw_watts: number
          power_source_id: string
          safety_check_notes?: string | null
          updated_at?: string | null
          voltage_required?: string | null
        }
        Update: {
          cable_length?: number | null
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          equipment_instance_id?: string
          id?: string
          is_connected?: boolean | null
          is_gfci_protected?: boolean | null
          last_safety_check?: string | null
          power_draw_watts?: number
          power_source_id?: string
          safety_check_notes?: string | null
          updated_at?: string | null
          voltage_required?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_power_connections_equipment_instance_id_fkey"
            columns: ["equipment_instance_id"]
            isOneToOne: false
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_power_connections_power_source_id_fkey"
            columns: ["power_source_id"]
            isOneToOne: false
            referencedRelation: "power_distribution"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_qr_codes: {
        Row: {
          created_by: string | null
          equipment_instance_id: string
          generated_at: string | null
          id: string
          is_active: boolean | null
          last_scanned: string | null
          qr_code: string
          qr_data: Json
          scan_count: number | null
        }
        Insert: {
          created_by?: string | null
          equipment_instance_id: string
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned?: string | null
          qr_code: string
          qr_data: Json
          scan_count?: number | null
        }
        Update: {
          created_by?: string | null
          equipment_instance_id?: string
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scanned?: string | null
          qr_code?: string
          qr_data?: Json
          scan_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_qr_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_qr_codes_equipment_instance_id_fkey"
            columns: ["equipment_instance_id"]
            isOneToOne: false
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_setup_tasks: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_to: string | null
          completion_notes: string | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          equipment_instance_id: string | null
          estimated_duration_minutes: number | null
          id: string
          issues_encountered: string | null
          order_index: number | null
          photos: string[] | null
          priority: number | null
          required_skills: string[] | null
          required_tools: string[] | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          status: string | null
          task_name: string
          task_type: string | null
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          completion_notes?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          equipment_instance_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          issues_encountered?: string | null
          order_index?: number | null
          photos?: string[] | null
          priority?: number | null
          required_skills?: string[] | null
          required_tools?: string[] | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          status?: string | null
          task_name: string
          task_type?: string | null
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_to?: string | null
          completion_notes?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          equipment_instance_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          issues_encountered?: string | null
          order_index?: number | null
          photos?: string[] | null
          priority?: number | null
          required_skills?: string[] | null
          required_tools?: string[] | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          status?: string | null
          task_name?: string
          task_type?: string | null
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_setup_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_setup_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_tasks_equipment_instance_id_fkey"
            columns: ["equipment_instance_id"]
            isOneToOne: false
            referencedRelation: "equipment_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "equipment_setup_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_setup_workflows: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_team_leader: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_template: boolean | null
          name: string
          priority: number | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          site_map_id: string
          status: string | null
          team_members: string[] | null
          updated_at: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_team_leader?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_template?: boolean | null
          name: string
          priority?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          site_map_id: string
          status?: string | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_team_leader?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_template?: boolean | null
          name?: string
          priority?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          site_map_id?: string
          status?: string | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_setup_workflows_assigned_team_leader_fkey"
            columns: ["assigned_team_leader"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_assigned_team_leader_fkey"
            columns: ["assigned_team_leader"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_assigned_team_leader_fkey"
            columns: ["assigned_team_leader"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_setup_workflows_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bulletins: {
        Row: {
          acknowledged_by: string[] | null
          author_id: string
          content: string
          created_at: string | null
          event_id: string
          id: string
          moderation_status: string
          pinned: boolean | null
          priority: string | null
          read_by: string[] | null
          requires_acknowledgment: boolean | null
          title: string
          updated_at: string | null
          visible_to: string[] | null
        }
        Insert: {
          acknowledged_by?: string[] | null
          author_id: string
          content: string
          created_at?: string | null
          event_id: string
          id?: string
          moderation_status?: string
          pinned?: boolean | null
          priority?: string | null
          read_by?: string[] | null
          requires_acknowledgment?: boolean | null
          title: string
          updated_at?: string | null
          visible_to?: string[] | null
        }
        Update: {
          acknowledged_by?: string[] | null
          author_id?: string
          content?: string
          created_at?: string | null
          event_id?: string
          id?: string
          moderation_status?: string
          pinned?: boolean | null
          priority?: string | null
          read_by?: string[] | null
          requires_acknowledgment?: boolean | null
          title?: string
          updated_at?: string | null
          visible_to?: string[] | null
        }
        Relationships: []
      }
      event_calendar_items: {
        Row: {
          assigned_to: string[] | null
          color: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string | null
          event_id: string
          id: string
          is_all_day: boolean | null
          location: string | null
          metadata: Json | null
          start_time: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          metadata?: Json | null
          start_time: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string[] | null
          color?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          metadata?: Json | null
          start_time?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_documents: {
        Row: {
          author_id: string
          content: string
          created_at: string
          document_type: string
          event_id: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
          visible_to: string[]
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          document_type?: string
          event_id: string
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
          visible_to?: string[]
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          document_type?: string
          event_id?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          visible_to?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      event_group_chats: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_id: string
          group_type: string
          id: string
          is_admin_only: boolean
          member_ids: string[]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_id: string
          group_type?: string
          id?: string
          is_admin_only?: boolean
          member_ids?: string[]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_id?: string
          group_type?: string
          id?: string
          is_admin_only?: boolean
          member_ids?: string[]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_group_chats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      event_group_messages: {
        Row: {
          content: string
          created_at: string
          event_id: string
          group_id: string
          id: string
          message_type: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          group_id: string
          id?: string
          message_type?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          group_id?: string
          id?: string
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_group_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      event_guestlist: {
        Row: {
          checked_in_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          event_id: string
          full_name: string | null
          guests_count: number | null
          id: string
          invite_code: string | null
          invited_by: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          event_id: string
          full_name?: string | null
          guests_count?: number | null
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          event_id?: string
          full_name?: string | null
          guests_count?: number | null
          id?: string
          invite_code?: string | null
          invited_by?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_guestlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          created_at: string | null
          event_id: string
          is_primary: boolean | null
          location_id: string
          location_type: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          is_primary?: boolean | null
          location_id: string
          location_type: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          is_primary?: boolean | null
          location_id?: string
          location_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_package_assets: {
        Row: {
          created_at: string | null
          equipment_asset_id: string
          event_package_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_asset_id: string
          event_package_id: string
        }
        Update: {
          created_at?: string | null
          equipment_asset_id?: string
          event_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_package_assets_equipment_asset_id_fkey"
            columns: ["equipment_asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_package_assets_event_package_id_fkey"
            columns: ["event_package_id"]
            isOneToOne: false
            referencedRelation: "event_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_package_services: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          event_package_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          event_package_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          event_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_package_services_event_package_id_fkey"
            columns: ["event_package_id"]
            isOneToOne: false
            referencedRelation: "event_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string | null
          event_id: string
          participant_id: string
          participant_type: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          participant_id: string
          participant_type: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          participant_id?: string
          participant_type?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_resources: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_id: string
          id: string
          metadata: Json | null
          pinned: boolean | null
          title: string
          type: string
          updated_at: string | null
          url: string | null
          visible_to: string[] | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_id: string
          id?: string
          metadata?: Json | null
          pinned?: boolean | null
          title: string
          type?: string
          updated_at?: string | null
          url?: string | null
          visible_to?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_id?: string
          id?: string
          metadata?: Json | null
          pinned?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string | null
          visible_to?: string[] | null
        }
        Relationships: []
      }
      event_secure_uploads: {
        Row: {
          access_log: Json
          category: string
          classification: string
          created_at: string
          event_id: string
          file_hash: string
          file_size: number
          id: string
          mime_type: string
          original_name: string
          storage_path: string
          task_message_id: string | null
          uploaded_by: string
        }
        Insert: {
          access_log?: Json
          category?: string
          classification?: string
          created_at?: string
          event_id: string
          file_hash: string
          file_size: number
          id?: string
          mime_type: string
          original_name: string
          storage_path: string
          task_message_id?: string | null
          uploaded_by: string
        }
        Update: {
          access_log?: Json
          category?: string
          classification?: string
          created_at?: string
          event_id?: string
          file_hash?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_name?: string
          storage_path?: string
          task_message_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_secure_uploads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_secure_uploads_task_message_id_fkey"
            columns: ["task_message_id"]
            isOneToOne: false
            referencedRelation: "event_task_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_task_messages: {
        Row: {
          action_url: string
          completed_by: string[]
          created_at: string
          description: string | null
          due_date: string | null
          event_id: string
          id: string
          is_sensitive: boolean
          priority: string
          recipient_ids: string[]
          require_completion: boolean
          sender_id: string
          sender_name: string
          status: string
          task_action: string
          title: string
          updated_at: string
        }
        Insert: {
          action_url: string
          completed_by?: string[]
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id: string
          id?: string
          is_sensitive?: boolean
          priority?: string
          recipient_ids?: string[]
          require_completion?: boolean
          sender_id: string
          sender_name?: string
          status?: string
          task_action: string
          title: string
          updated_at?: string
        }
        Update: {
          action_url?: string
          completed_by?: string[]
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_id?: string
          id?: string
          is_sensitive?: boolean
          priority?: string
          recipient_ids?: string[]
          require_completion?: boolean
          sender_id?: string
          sender_name?: string
          status?: string
          task_action?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_task_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          created_at: string | null
          currency: string | null
          event_id: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          quantity_sold: number
          quantity_total: number
          sales_end: string | null
          sales_start: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          quantity_sold?: number
          quantity_total: number
          sales_end?: string | null
          sales_start?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          event_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          quantity_sold?: number
          quantity_total?: number
          sales_end?: string | null
          sales_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_vendor_requests: {
        Row: {
          actual_cost: number | null
          budget_estimate: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          notes: string | null
          org_id: string
          service_type: string
          status: string
          updated_at: string
          vendor_name: string
        }
        Insert: {
          actual_cost?: number | null
          budget_estimate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          notes?: string | null
          org_id: string
          service_type: string
          status?: string
          updated_at?: string
          vendor_name: string
        }
        Update: {
          actual_cost?: number | null
          budget_estimate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          service_type?: string
          status?: string
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vendor_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vendor_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          artist_id: string
          capacity: number
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          creator_account_type: string | null
          date: string
          description: string | null
          doors_open: string | null
          end_time: string | null
          event_date: string | null
          event_type: string | null
          expected_attendance: number | null
          genre: string | null
          genre_tags: Json | null
          global_search_vector: unknown | null
          id: string
          is_public: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string | null
          poster_url: string | null
          producer_settings: Json | null
          promoted_event_v2_id: string | null
          revenue: number | null
          setlist: Json | null
          slug: string | null
          start_time: string | null
          state: string | null
          status: string | null
          tags: Json | null
          ticket_price_max: number | null
          ticket_price_min: number | null
          ticket_url: string | null
          tickets_sold: number | null
          time: string
          title: string
          tour_id: string | null
          type: string
          updated_at: string
          user_id: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          artist_id: string
          capacity: number
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          creator_account_type?: string | null
          date: string
          description?: string | null
          doors_open?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: number | null
          genre?: string | null
          genre_tags?: Json | null
          global_search_vector?: unknown | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name?: string | null
          poster_url?: string | null
          producer_settings?: Json | null
          promoted_event_v2_id?: string | null
          revenue?: number | null
          setlist?: Json | null
          slug?: string | null
          start_time?: string | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_url?: string | null
          tickets_sold?: number | null
          time: string
          title: string
          tour_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          artist_id?: string
          capacity?: number
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          creator_account_type?: string | null
          date?: string
          description?: string | null
          doors_open?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: string | null
          expected_attendance?: number | null
          genre?: string | null
          genre_tags?: Json | null
          global_search_vector?: unknown | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string | null
          poster_url?: string | null
          producer_settings?: Json | null
          promoted_event_v2_id?: string | null
          revenue?: number | null
          setlist?: Json | null
          slug?: string | null
          start_time?: string | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          ticket_price_max?: number | null
          ticket_price_min?: number | null
          ticket_url?: string | null
          tickets_sold?: number | null
          time?: string
          title?: string
          tour_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_promoted_event_v2_id_fkey"
            columns: ["promoted_event_v2_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_venue_id"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "fk_events_venue_id"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events_v2: {
        Row: {
          age_restrictions: string | null
          capacity: number | null
          created_at: string
          created_by: string
          end_at: string | null
          global_search_vector: unknown | null
          id: string
          org_id: string
          quick_start_batch_id: string | null
          quick_start_ordinal: number | null
          settings: Json
          slug: string
          start_at: string | null
          status: string
          timezone: string
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          age_restrictions?: string | null
          capacity?: number | null
          created_at?: string
          created_by: string
          end_at?: string | null
          global_search_vector?: unknown | null
          id?: string
          org_id: string
          quick_start_batch_id?: string | null
          quick_start_ordinal?: number | null
          settings?: Json
          slug: string
          start_at?: string | null
          status: string
          timezone?: string
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          age_restrictions?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string
          end_at?: string | null
          global_search_vector?: unknown | null
          id?: string
          org_id?: string
          quick_start_batch_id?: string | null
          quick_start_ordinal?: number | null
          settings?: Json
          slug?: string
          start_at?: string | null
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_v2_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_v2_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          rollout_percentage: number
          target_org_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          rollout_percentage?: number
          target_org_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          rollout_percentage?: number
          target_org_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_events: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          rank_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          rank_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          rank_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "promotion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          org_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          receipt_url: string | null
          tour_id: string | null
          type: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          org_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          receipt_url?: string | null
          tour_id?: string | null
          type: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          org_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          receipt_url?: string | null
          tour_id?: string | null
          type?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_coordination: {
        Row: {
          aircraft_type: string | null
          airline: string
          arrival_airport: string
          arrival_time: string
          assigned_by: string | null
          available_seats: number | null
          booked_seats: number | null
          booking_reference: string | null
          created_at: string | null
          departure_airport: string
          departure_time: string
          event_id: string | null
          fare_type: string | null
          flight_number: string
          gate: string | null
          group_id: string | null
          id: string
          is_group_flight: boolean | null
          payment_status: string | null
          status: string | null
          terminal: string | null
          ticket_class: string | null
          ticket_cost: number | null
          total_cost: number | null
          total_seats: number | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          aircraft_type?: string | null
          airline: string
          arrival_airport: string
          arrival_time: string
          assigned_by?: string | null
          available_seats?: number | null
          booked_seats?: number | null
          booking_reference?: string | null
          created_at?: string | null
          departure_airport: string
          departure_time: string
          event_id?: string | null
          fare_type?: string | null
          flight_number: string
          gate?: string | null
          group_id?: string | null
          id?: string
          is_group_flight?: boolean | null
          payment_status?: string | null
          status?: string | null
          terminal?: string | null
          ticket_class?: string | null
          ticket_cost?: number | null
          total_cost?: number | null
          total_seats?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          aircraft_type?: string | null
          airline?: string
          arrival_airport?: string
          arrival_time?: string
          assigned_by?: string | null
          available_seats?: number | null
          booked_seats?: number | null
          booking_reference?: string | null
          created_at?: string | null
          departure_airport?: string
          departure_time?: string
          event_id?: string | null
          fare_type?: string | null
          flight_number?: string
          gate?: string | null
          group_id?: string | null
          id?: string
          is_group_flight?: boolean | null
          payment_status?: string | null
          status?: string | null
          terminal?: string | null
          ticket_class?: string | null
          ticket_cost?: number | null
          total_cost?: number | null
          total_seats?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_coordination_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_coordination_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "travel_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_coordination_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_passenger_assignments: {
        Row: {
          boarding_group: string | null
          boarding_time: string | null
          checked_in: boolean | null
          checked_in_time: string | null
          created_at: string | null
          flight_id: string
          group_member_id: string
          id: string
          seat_class: string | null
          seat_number: string | null
          special_assistance: boolean | null
          special_meal: string | null
          status: string | null
          ticket_cost: number | null
          ticket_number: string | null
          ticket_status: string | null
          updated_at: string | null
          wheelchair_assistance: boolean | null
        }
        Insert: {
          boarding_group?: string | null
          boarding_time?: string | null
          checked_in?: boolean | null
          checked_in_time?: string | null
          created_at?: string | null
          flight_id: string
          group_member_id: string
          id?: string
          seat_class?: string | null
          seat_number?: string | null
          special_assistance?: boolean | null
          special_meal?: string | null
          status?: string | null
          ticket_cost?: number | null
          ticket_number?: string | null
          ticket_status?: string | null
          updated_at?: string | null
          wheelchair_assistance?: boolean | null
        }
        Update: {
          boarding_group?: string | null
          boarding_time?: string | null
          checked_in?: boolean | null
          checked_in_time?: string | null
          created_at?: string | null
          flight_id?: string
          group_member_id?: string
          id?: string
          seat_class?: string | null
          seat_number?: string | null
          special_assistance?: boolean | null
          special_meal?: string | null
          status?: string | null
          ticket_cost?: number | null
          ticket_number?: string | null
          ticket_status?: string | null
          updated_at?: string | null
          wheelchair_assistance?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_passenger_assignments_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flight_coordination"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_passenger_assignments_group_member_id_fkey"
            columns: ["group_member_id"]
            isOneToOne: false
            referencedRelation: "travel_group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: string
          target_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          target_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          parent_comment_id: string | null
          score: number
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          score?: number
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          score?: number
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_kind: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      forum_moderators: {
        Row: {
          created_at: string
          forum_id: string
          granted_by: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          forum_id: string
          granted_by: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          forum_id?: string
          granted_by?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_moderators_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          content_md: string
          created_at: string
          created_by: string
          depth: number
          id: string
          is_deleted: boolean
          parent_id: string | null
          path: string
          score: number
          thread_id: string
          updated_at: string
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          path?: string
          score?: number
          thread_id: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          path?: string
          score?: number
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_hot_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_top_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts_v2: {
        Row: {
          content_md: string
          created_at: string
          created_by: string
          depth: number
          id: string
          is_deleted: boolean
          parent_id: string | null
          path: string
          score: number
          thread_id: string
          updated_at: string
        }
        Insert: {
          content_md: string
          created_at?: string
          created_by: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          path?: string
          score?: number
          thread_id: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          created_by?: string
          depth?: number
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          path?: string
          score?: number
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_v2_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_hot_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_top_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      forum_subscriptions: {
        Row: {
          created_at: string
          forum_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          forum_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          forum_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_subscriptions_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_subscriptions_v2: {
        Row: {
          created_at: string
          forum_id: string | null
          id: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          forum_id?: string | null
          id?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          forum_id?: string | null
          id?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_subscriptions_v2_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_subscriptions_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_hot_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_subscriptions_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_top_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_subscriptions_v2_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_tags: {
        Row: {
          color: string | null
          forum_id: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          color?: string | null
          forum_id: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          color?: string | null
          forum_id?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_tags_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_thread_tags: {
        Row: {
          tag_id: string
          thread_id: string
        }
        Insert: {
          tag_id: string
          thread_id: string
        }
        Update: {
          tag_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_thread_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "forum_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_thread_tags_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_hot_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_thread_tags_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_top_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_thread_tags_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          body: string | null
          comments_count: number
          created_at: string
          forum_id: string
          id: string
          media_urls: string[]
          score: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          comments_count?: number
          created_at?: string
          forum_id: string
          id?: string
          media_urls?: string[]
          score?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          comments_count?: number
          created_at?: string
          forum_id?: string
          id?: string
          media_urls?: string[]
          score?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads_v2: {
        Row: {
          comments_count: number
          content_md: string | null
          content_ref_id: string | null
          created_at: string
          created_by: string
          forum_id: string
          hot_score: number
          id: string
          is_deleted: boolean
          is_locked: boolean
          is_pinned: boolean
          kind: string
          link_url: string | null
          score: number
          title: string
          tsv: unknown | null
          updated_at: string
          views_count: number
        }
        Insert: {
          comments_count?: number
          content_md?: string | null
          content_ref_id?: string | null
          created_at?: string
          created_by: string
          forum_id: string
          hot_score?: number
          id?: string
          is_deleted?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          kind?: string
          link_url?: string | null
          score?: number
          title: string
          tsv?: unknown | null
          updated_at?: string
          views_count?: number
        }
        Update: {
          comments_count?: number
          content_md?: string | null
          content_ref_id?: string | null
          created_at?: string
          created_by?: string
          forum_id?: string
          hot_score?: number
          id?: string
          is_deleted?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          kind?: string
          link_url?: string | null
          score?: number
          title?: string
          tsv?: unknown | null
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_v2_content_ref_id_fkey"
            columns: ["content_ref_id"]
            isOneToOne: false
            referencedRelation: "content_refs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_v2_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_v2_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "post_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          thread_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          thread_id?: string | null
          user_id: string
          value: number
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          thread_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes_v2: {
        Row: {
          created_at: string
          id: string
          kind: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          target_id: string
          target_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_v2_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "vote_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          icon_url: string | null
          id: string
          is_nsfw: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_nsfw?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_nsfw?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      forums_v2: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          kind: string
          slug: string
          subscribers_count: number
          threads_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          slug: string
          subscribers_count?: number
          threads_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          slug?: string
          subscribers_count?: number
          threads_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forums_v2_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "forum_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      glamping_tents: {
        Row: {
          base_price: number | null
          capacity: number
          check_in_date: string | null
          check_out_date: string | null
          created_at: string | null
          current_price: number | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          has_cooling: boolean | null
          has_heating: boolean | null
          has_power: boolean | null
          has_private_bathroom: boolean | null
          has_wifi: boolean | null
          height: number | null
          id: string
          last_cleaned: string | null
          maintenance_notes: string | null
          rotation: number | null
          site_map_id: string
          size_category: string | null
          special_requirements: string | null
          status: string | null
          tent_number: string
          tent_type: string
          updated_at: string | null
          width: number | null
          x: number | null
          y: number | null
          zone_id: string | null
        }
        Insert: {
          base_price?: number | null
          capacity: number
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          current_price?: number | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          has_cooling?: boolean | null
          has_heating?: boolean | null
          has_power?: boolean | null
          has_private_bathroom?: boolean | null
          has_wifi?: boolean | null
          height?: number | null
          id?: string
          last_cleaned?: string | null
          maintenance_notes?: string | null
          rotation?: number | null
          site_map_id: string
          size_category?: string | null
          special_requirements?: string | null
          status?: string | null
          tent_number: string
          tent_type: string
          updated_at?: string | null
          width?: number | null
          x?: number | null
          y?: number | null
          zone_id?: string | null
        }
        Update: {
          base_price?: number | null
          capacity?: number
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string | null
          current_price?: number | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          has_cooling?: boolean | null
          has_heating?: boolean | null
          has_power?: boolean | null
          has_private_bathroom?: boolean | null
          has_wifi?: boolean | null
          height?: number | null
          id?: string
          last_cleaned?: string | null
          maintenance_notes?: string | null
          rotation?: number | null
          site_map_id?: string
          size_category?: string | null
          special_requirements?: string | null
          status?: string | null
          tent_number?: string
          tent_type?: string
          updated_at?: string | null
          width?: number | null
          x?: number | null
          y?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "glamping_tents_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glamping_tents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "site_map_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ground_transportation_coordination: {
        Row: {
          actual_dropoff_time: string | null
          assigned_by: string | null
          assigned_passengers: number | null
          cost_per_person: number | null
          created_at: string | null
          current_location: string | null
          driver_license: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string
          estimated_dropoff_time: string
          event_id: string | null
          flight_id: string | null
          group_id: string | null
          id: string
          payment_status: string | null
          pickup_location: string
          pickup_time: string
          provider_name: string | null
          status: string | null
          total_cost: number | null
          tour_id: string | null
          tracking_enabled: boolean | null
          transport_type: string
          updated_at: string | null
          vehicle_capacity: number | null
          vehicle_details: Json | null
          vehicle_plate: string | null
        }
        Insert: {
          actual_dropoff_time?: string | null
          assigned_by?: string | null
          assigned_passengers?: number | null
          cost_per_person?: number | null
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location: string
          estimated_dropoff_time: string
          event_id?: string | null
          flight_id?: string | null
          group_id?: string | null
          id?: string
          payment_status?: string | null
          pickup_location: string
          pickup_time: string
          provider_name?: string | null
          status?: string | null
          total_cost?: number | null
          tour_id?: string | null
          tracking_enabled?: boolean | null
          transport_type: string
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_details?: Json | null
          vehicle_plate?: string | null
        }
        Update: {
          actual_dropoff_time?: string | null
          assigned_by?: string | null
          assigned_passengers?: number | null
          cost_per_person?: number | null
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string
          estimated_dropoff_time?: string
          event_id?: string | null
          flight_id?: string | null
          group_id?: string | null
          id?: string
          payment_status?: string | null
          pickup_location?: string
          pickup_time?: string
          provider_name?: string | null
          status?: string | null
          total_cost?: number | null
          tour_id?: string | null
          tracking_enabled?: boolean | null
          transport_type?: string
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_details?: Json | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ground_transportation_coordination_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ground_transportation_coordination_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flight_coordination"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ground_transportation_coordination_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "travel_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ground_transportation_coordination_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          mentions: string[]
          message_type: string
          read_by: string[]
          sender_id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentions?: string[]
          message_type?: string
          read_by?: string[]
          sender_id: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentions?: string[]
          message_type?: string
          read_by?: string[]
          sender_id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      group_threads: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_admin_only: boolean
          last_message_id: string | null
          name: string
          thread_type: string
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_admin_only?: boolean
          last_message_id?: string | null
          name: string
          thread_type?: string
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_admin_only?: boolean
          last_message_id?: string | null
          name?: string
          thread_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          posts_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          posts_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          posts_count?: number | null
        }
        Relationships: []
      }
      hiring_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          application_id: string
          content: string | null
          created_at: string
          employer_entity_id: string | null
          employer_entity_type: string | null
          from_status: string
          id: string
          job_id: string | null
          metadata: Json | null
          title: string | null
          to_status: string
          venue_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          application_id: string
          content?: string | null
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          from_status: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          title?: string | null
          to_status: string
          venue_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          application_id?: string
          content?: string | null
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          from_status?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          title?: string | null
          to_status?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      hiring_eligibility_snapshots: {
        Row: {
          actor_user_id: string | null
          applicant_id: string
          application_id: string
          blocking_reasons: Json
          checklist: Json
          created_at: string
          employer_entity_id: string | null
          employer_entity_type: string | null
          evidence: Json
          id: string
          is_eligible: boolean
          job_posting_id: string | null
          mode: string
          venue_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          applicant_id: string
          application_id: string
          blocking_reasons?: Json
          checklist?: Json
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          evidence?: Json
          id?: string
          is_eligible: boolean
          job_posting_id?: string | null
          mode?: string
          venue_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          applicant_id?: string
          application_id?: string
          blocking_reasons?: Json
          checklist?: Json
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          evidence?: Json
          id?: string
          is_eligible?: boolean
          job_posting_id?: string | null
          mode?: string
          venue_id?: string | null
        }
        Relationships: []
      }
      holds: {
        Row: {
          calendar_id: string
          color: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          end_at: string
          id: string
          note: string | null
          org_id: string
          start_at: string
          status: string
        }
        Insert: {
          calendar_id: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          end_at: string
          id?: string
          note?: string | null
          org_id: string
          start_at: string
          status: string
        }
        Update: {
          calendar_id?: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          end_at?: string
          id?: string
          note?: string | null
          org_id?: string
          start_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holds_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_assignments: {
        Row: {
          accessibility_needs: string[] | null
          accessibility_required: boolean | null
          actual_check_in_time: string | null
          actual_check_out_time: string | null
          bed_configuration: string | null
          check_in_status: string | null
          check_out_status: string | null
          created_at: string | null
          dietary_restrictions: string[] | null
          floor_preference: string | null
          group_member_id: string
          id: string
          lodging_booking_id: string
          room_number: string | null
          room_type: string | null
          roommate_preference: string | null
          special_requests: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          accessibility_required?: boolean | null
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          bed_configuration?: string | null
          check_in_status?: string | null
          check_out_status?: string | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          floor_preference?: string | null
          group_member_id: string
          id?: string
          lodging_booking_id: string
          room_number?: string | null
          room_type?: string | null
          roommate_preference?: string | null
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          accessibility_required?: boolean | null
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          bed_configuration?: string | null
          check_in_status?: string | null
          check_out_status?: string | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          floor_preference?: string | null
          group_member_id?: string
          id?: string
          lodging_booking_id?: string
          room_number?: string | null
          room_type?: string | null
          roommate_preference?: string | null
          special_requests?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_assignments_group_member_id_fkey"
            columns: ["group_member_id"]
            isOneToOne: false
            referencedRelation: "travel_group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_room_assignments_lodging_booking_id_fkey"
            columns: ["lodging_booking_id"]
            isOneToOne: false
            referencedRelation: "lodging_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          org_id: string
          reported_by: string | null
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          org_id: string
          reported_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          reported_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          adhoc_venue_id: string | null
          applicant_email: string | null
          applicant_id: string | null
          applicant_name: string | null
          applicant_phone: string | null
          applied_at: string
          auto_screening_result: Json | null
          created_at: string
          decision_note: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          feedback: string | null
          form_responses: Json | null
          id: string
          interview_scheduled: boolean | null
          is_starred: boolean
          job_posting_id: string | null
          offer_details: Json | null
          offer_made: boolean | null
          profile_shared_at: string | null
          profile_snapshot: Json | null
          profile_snapshot_version: string | null
          rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          screening_issues: string[] | null
          screening_recommendations: string[] | null
          starred_at: string | null
          starred_by: string | null
          status: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applied_at?: string
          auto_screening_result?: Json | null
          created_at?: string
          decision_note?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          feedback?: string | null
          form_responses?: Json | null
          id?: string
          interview_scheduled?: boolean | null
          is_starred?: boolean
          job_posting_id?: string | null
          offer_details?: Json | null
          offer_made?: boolean | null
          profile_shared_at?: string | null
          profile_snapshot?: Json | null
          profile_snapshot_version?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          screening_issues?: string[] | null
          screening_recommendations?: string[] | null
          starred_at?: string | null
          starred_by?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applied_at?: string
          auto_screening_result?: Json | null
          created_at?: string
          decision_note?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          feedback?: string | null
          form_responses?: Json | null
          id?: string
          interview_scheduled?: boolean | null
          is_starred?: boolean
          job_posting_id?: string | null
          offer_details?: Json | null
          offer_made?: boolean | null
          profile_shared_at?: string | null
          profile_snapshot?: Json | null
          profile_snapshot_version?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          screening_issues?: string[] | null
          screening_recommendations?: string[] | null
          starred_at?: string | null
          starred_by?: string | null
          status?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_templates: {
        Row: {
          adhoc_venue_id: string | null
          age_requirement: number | null
          allow_applicant_messages: boolean
          application_form_template_id: string | null
          applications_count: number
          background_check_required: boolean | null
          benefits: string[] | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          drug_test_required: boolean | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          employment_type: string | null
          event_date: string | null
          event_id: string | null
          experience_level: string | null
          global_search_vector: unknown | null
          id: string
          location: string | null
          number_of_positions: number | null
          onboarding_template_id: string | null
          position: string | null
          remote: boolean | null
          required_certifications: string[] | null
          requirements: string[] | null
          responsibilities: string[] | null
          role_type: string | null
          salary_range: Json | null
          shift_duration: number | null
          skills: string[] | null
          status: string
          title: string
          tour_id: string | null
          training_provided: boolean | null
          uniform_provided: boolean | null
          updated_at: string
          urgent: boolean | null
          venue_id: string | null
          views_count: number
        }
        Insert: {
          adhoc_venue_id?: string | null
          age_requirement?: number | null
          allow_applicant_messages?: boolean
          application_form_template_id?: string | null
          applications_count?: number
          background_check_required?: boolean | null
          benefits?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          drug_test_required?: boolean | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          event_date?: string | null
          event_id?: string | null
          experience_level?: string | null
          global_search_vector?: unknown | null
          id?: string
          location?: string | null
          number_of_positions?: number | null
          onboarding_template_id?: string | null
          position?: string | null
          remote?: boolean | null
          required_certifications?: string[] | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          role_type?: string | null
          salary_range?: Json | null
          shift_duration?: number | null
          skills?: string[] | null
          status?: string
          title: string
          tour_id?: string | null
          training_provided?: boolean | null
          uniform_provided?: boolean | null
          updated_at?: string
          urgent?: boolean | null
          venue_id?: string | null
          views_count?: number
        }
        Update: {
          adhoc_venue_id?: string | null
          age_requirement?: number | null
          allow_applicant_messages?: boolean
          application_form_template_id?: string | null
          applications_count?: number
          background_check_required?: boolean | null
          benefits?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          drug_test_required?: boolean | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          event_date?: string | null
          event_id?: string | null
          experience_level?: string | null
          global_search_vector?: unknown | null
          id?: string
          location?: string | null
          number_of_positions?: number | null
          onboarding_template_id?: string | null
          position?: string | null
          remote?: boolean | null
          required_certifications?: string[] | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          role_type?: string | null
          salary_range?: Json | null
          shift_duration?: number | null
          skills?: string[] | null
          status?: string
          title?: string
          tour_id?: string | null
          training_provided?: boolean | null
          uniform_provided?: boolean | null
          updated_at?: string
          urgent?: boolean | null
          venue_id?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_templates_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_templates_application_form_template_id_fkey"
            columns: ["application_form_template_id"]
            isOneToOne: false
            referencedRelation: "application_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          coordinates: Json | null
          created_at: string | null
          id: string
          location_type: string
          meta: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          location_type: string
          meta?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          location_type?: string
          meta?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lodging_availability: {
        Row: {
          base_rate: number | null
          block_reason: string | null
          blocked_by: string | null
          created_at: string | null
          date_from: string
          date_to: string
          id: string
          is_blocked: boolean | null
          provider_id: string
          rate_notes: string | null
          room_type_id: string
          rooms_available: number
          rooms_blocked: number | null
          rooms_reserved: number | null
          special_rate: number | null
          updated_at: string | null
        }
        Insert: {
          base_rate?: number | null
          block_reason?: string | null
          blocked_by?: string | null
          created_at?: string | null
          date_from: string
          date_to: string
          id?: string
          is_blocked?: boolean | null
          provider_id: string
          rate_notes?: string | null
          room_type_id: string
          rooms_available: number
          rooms_blocked?: number | null
          rooms_reserved?: number | null
          special_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          base_rate?: number | null
          block_reason?: string | null
          blocked_by?: string | null
          created_at?: string | null
          date_from?: string
          date_to?: string
          id?: string
          is_blocked?: boolean | null
          provider_id?: string
          rate_notes?: string | null
          room_type_id?: string
          rooms_available?: number
          rooms_blocked?: number | null
          rooms_reserved?: number | null
          special_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "lodging_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "lodging_room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_bookings: {
        Row: {
          accessibility_needs: string[] | null
          assigned_by: string | null
          booking_number: string
          booking_source: string | null
          cancellation_deadline: string | null
          cancellation_policy: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          check_out_time: string | null
          confirmation_number: string | null
          created_at: string | null
          deposit_amount: number | null
          dietary_restrictions: string[] | null
          discount_amount: number | null
          event_id: string | null
          fees: number | null
          guests_per_room: number | null
          id: string
          managed_by: string | null
          paid_amount: number | null
          payment_status: string | null
          primary_guest_email: string | null
          primary_guest_name: string
          primary_guest_phone: string | null
          provider_id: string
          rate_per_night: number
          room_type_id: string
          rooms_booked: number | null
          special_requests: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          total_guests: number
          total_nights: number
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          assigned_by?: string | null
          booking_number: string
          booking_source?: string | null
          cancellation_deadline?: string | null
          cancellation_policy?: string | null
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          check_out_time?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          dietary_restrictions?: string[] | null
          discount_amount?: number | null
          event_id?: string | null
          fees?: number | null
          guests_per_room?: number | null
          id?: string
          managed_by?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          primary_guest_email?: string | null
          primary_guest_name: string
          primary_guest_phone?: string | null
          provider_id: string
          rate_per_night: number
          room_type_id: string
          rooms_booked?: number | null
          special_requests?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          total_guests: number
          total_nights: number
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          assigned_by?: string | null
          booking_number?: string
          booking_source?: string | null
          cancellation_deadline?: string | null
          cancellation_policy?: string | null
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          check_out_time?: string | null
          confirmation_number?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          dietary_restrictions?: string[] | null
          discount_amount?: number | null
          event_id?: string | null
          fees?: number | null
          guests_per_room?: number | null
          id?: string
          managed_by?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          primary_guest_email?: string | null
          primary_guest_name?: string
          primary_guest_phone?: string | null
          provider_id?: string
          rate_per_night?: number
          room_type_id?: string
          rooms_booked?: number | null
          special_requests?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          total_guests?: number
          total_nights?: number
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "lodging_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "lodging_room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_calendar_events: {
        Row: {
          booking_id: string
          calendar_type: string | null
          created_at: string | null
          description: string | null
          end_time: string
          external_calendar_id: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          notification_sent: boolean | null
          reminder_minutes: number[] | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          calendar_type?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          external_calendar_id?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          notification_sent?: boolean | null
          reminder_minutes?: number[] | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          calendar_type?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          external_calendar_id?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          notification_sent?: boolean | null
          reminder_minutes?: number[] | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_calendar_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "lodging_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_guest_assignments: {
        Row: {
          accessibility_needs: string[] | null
          actual_check_in: string | null
          actual_check_out: string | null
          bed_preference: string | null
          booking_id: string
          check_in_notes: string | null
          check_out_notes: string | null
          created_at: string | null
          dietary_restrictions: string[] | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guest_type: string | null
          id: string
          room_number: string | null
          roommate_preference: string | null
          special_requests: string | null
          status: string | null
          team_member_id: string | null
          updated_at: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          actual_check_in?: string | null
          actual_check_out?: string | null
          bed_preference?: string | null
          booking_id: string
          check_in_notes?: string | null
          check_out_notes?: string | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guest_type?: string | null
          id?: string
          room_number?: string | null
          roommate_preference?: string | null
          special_requests?: string | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          actual_check_in?: string | null
          actual_check_out?: string | null
          bed_preference?: string | null
          booking_id?: string
          check_in_notes?: string | null
          check_out_notes?: string | null
          created_at?: string | null
          dietary_restrictions?: string[] | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guest_type?: string | null
          id?: string
          room_number?: string | null
          roommate_preference?: string | null
          special_requests?: string | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_guest_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "lodging_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lodging_guest_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "venue_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          processed_by: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          processed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_type?: string
          processed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "lodging_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      lodging_providers: {
        Row: {
          address: string
          amenities: string[] | null
          breakfast_included: boolean | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          gym_available: boolean | null
          id: string
          last_booking_date: string | null
          max_capacity: number | null
          name: string
          notes: string | null
          parking_available: boolean | null
          parking_spaces: number | null
          payment_terms: string | null
          phone: string | null
          pool_available: boolean | null
          postal_code: string | null
          preferred_vendor: boolean | null
          rating: number | null
          room_types: string[] | null
          special_requirements: string | null
          state: string
          status: string | null
          tax_id: string | null
          total_bookings: number | null
          type: string
          updated_at: string | null
          website: string | null
          wifi_available: boolean | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          breakfast_included?: boolean | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          gym_available?: boolean | null
          id?: string
          last_booking_date?: string | null
          max_capacity?: number | null
          name: string
          notes?: string | null
          parking_available?: boolean | null
          parking_spaces?: number | null
          payment_terms?: string | null
          phone?: string | null
          pool_available?: boolean | null
          postal_code?: string | null
          preferred_vendor?: boolean | null
          rating?: number | null
          room_types?: string[] | null
          special_requirements?: string | null
          state: string
          status?: string | null
          tax_id?: string | null
          total_bookings?: number | null
          type: string
          updated_at?: string | null
          website?: string | null
          wifi_available?: boolean | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          breakfast_included?: boolean | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          gym_available?: boolean | null
          id?: string
          last_booking_date?: string | null
          max_capacity?: number | null
          name?: string
          notes?: string | null
          parking_available?: boolean | null
          parking_spaces?: number | null
          payment_terms?: string | null
          phone?: string | null
          pool_available?: boolean | null
          postal_code?: string | null
          preferred_vendor?: boolean | null
          rating?: number | null
          room_types?: string[] | null
          special_requirements?: string | null
          state?: string
          status?: string | null
          tax_id?: string | null
          total_bookings?: number | null
          type?: string
          updated_at?: string | null
          website?: string | null
          wifi_available?: boolean | null
        }
        Relationships: []
      }
      lodging_room_types: {
        Row: {
          amenities: string[] | null
          available_quantity: number | null
          base_rate: number
          bed_configuration: string | null
          capacity: number
          created_at: string | null
          description: string | null
          group_rate: number | null
          holiday_rate: number | null
          id: string
          is_active: boolean | null
          max_stay: number | null
          min_stay: number | null
          name: string
          provider_id: string
          updated_at: string | null
          weekend_rate: number | null
        }
        Insert: {
          amenities?: string[] | null
          available_quantity?: number | null
          base_rate: number
          bed_configuration?: string | null
          capacity: number
          created_at?: string | null
          description?: string | null
          group_rate?: number | null
          holiday_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_stay?: number | null
          min_stay?: number | null
          name: string
          provider_id: string
          updated_at?: string | null
          weekend_rate?: number | null
        }
        Update: {
          amenities?: string[] | null
          available_quantity?: number | null
          base_rate?: number
          bed_configuration?: string | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          group_rate?: number | null
          holiday_rate?: number | null
          id?: string
          is_active?: boolean | null
          max_stay?: number | null
          min_stay?: number | null
          name?: string
          provider_id?: string
          updated_at?: string | null
          weekend_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lodging_room_types_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "lodging_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          prev_status: string | null
          task_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          prev_status?: string | null
          task_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          prev_status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_task_equipment: {
        Row: {
          created_at: string | null
          end_time: string | null
          equipment_asset_id: string
          id: string
          quantity: number
          start_time: string | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          equipment_asset_id: string
          id?: string
          quantity?: number
          start_time?: string | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          equipment_asset_id?: string
          id?: string
          quantity?: number
          start_time?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_task_equipment_equipment_asset_id_fkey"
            columns: ["equipment_asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_task_equipment_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "logistics_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_tasks: {
        Row: {
          actual_cost: number | null
          assigned_to_user_id: string | null
          budget: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          notes: string | null
          priority: string
          status: string
          tags: string[] | null
          title: string
          tour_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to_user_id?: string | null
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          tour_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to_user_id?: string | null
          budget?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          tour_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_tasks_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      map_issues: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          id: string
          issue_type: string
          notes: string | null
          photos: string[] | null
          reported_by: string | null
          resolved_at: string | null
          severity: string
          site_map_id: string
          status: string | null
          title: string
          updated_at: string | null
          x: number
          y: number
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type: string
          notes?: string | null
          photos?: string[] | null
          reported_by?: string | null
          resolved_at?: string | null
          severity: string
          site_map_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          x: number
          y: number
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          issue_type?: string
          notes?: string | null
          photos?: string[] | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          site_map_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "map_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_issues_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "map_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_issues_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_layers: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_locked: boolean | null
          is_visible: boolean | null
          layer_type: string
          name: string
          opacity: number | null
          site_map_id: string
          updated_at: string | null
          z_index: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          is_visible?: boolean | null
          layer_type: string
          name: string
          opacity?: number | null
          site_map_id: string
          updated_at?: string | null
          z_index?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_locked?: boolean | null
          is_visible?: boolean | null
          layer_type?: string
          name?: string
          opacity?: number | null
          site_map_id?: string
          updated_at?: string | null
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "map_layers_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_measurements: {
        Row: {
          color: string | null
          compliance_notes: string | null
          created_at: string | null
          end_x: number | null
          end_y: number | null
          height: number | null
          id: string
          is_compliant: boolean | null
          label: string | null
          measurement_type: string
          site_map_id: string
          start_x: number
          start_y: number
          unit: string | null
          updated_at: string | null
          value: number | null
          width: number | null
        }
        Insert: {
          color?: string | null
          compliance_notes?: string | null
          created_at?: string | null
          end_x?: number | null
          end_y?: number | null
          height?: number | null
          id?: string
          is_compliant?: boolean | null
          label?: string | null
          measurement_type: string
          site_map_id: string
          start_x: number
          start_y: number
          unit?: string | null
          updated_at?: string | null
          value?: number | null
          width?: number | null
        }
        Update: {
          color?: string | null
          compliance_notes?: string | null
          created_at?: string | null
          end_x?: number | null
          end_y?: number | null
          height?: number | null
          id?: string
          is_compliant?: boolean | null
          label?: string | null
          measurement_type?: string
          site_map_id?: string
          start_x?: number
          start_y?: number
          unit?: string | null
          updated_at?: string | null
          value?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "map_measurements_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_task_assignments: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assigned_user_id: string | null
          created_at: string | null
          element_id: string
          element_type: string
          id: string
          priority: number | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          site_map_id: string
          status: string | null
          task_description: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          element_id: string
          element_type: string
          id?: string
          priority?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          site_map_id: string
          status?: string | null
          task_description?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          element_id?: string
          element_type?: string
          id?: string
          priority?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          site_map_id?: string
          status?: string | null
          task_description?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_task_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "map_task_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_task_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_task_assignments_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      map_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "map_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "map_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      map_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_current: boolean | null
          site_map_id: string
          updated_at: string | null
          version_name: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          site_map_id: string
          updated_at?: string | null
          version_name: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_current?: boolean | null
          site_map_id?: string
          updated_at?: string | null
          version_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "map_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_versions_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_entitlements: {
        Row: {
          asset_bucket: string | null
          asset_path: string | null
          asset_url: string
          buyer_user_id: string | null
          created_at: string
          download_count: number
          id: string
          last_downloaded_at: string | null
          listing_id: string | null
          max_downloads: number
          music_track_id: string | null
          order_item_id: string
          preview_bucket: string | null
          preview_path: string | null
          signed_url: string | null
          signed_url_expires_at: string | null
          status: string
          updated_at: string
          watermarked_asset_url: string | null
        }
        Insert: {
          asset_bucket?: string | null
          asset_path?: string | null
          asset_url: string
          buyer_user_id?: string | null
          created_at?: string
          download_count?: number
          id?: string
          last_downloaded_at?: string | null
          listing_id?: string | null
          max_downloads?: number
          music_track_id?: string | null
          order_item_id: string
          preview_bucket?: string | null
          preview_path?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          updated_at?: string
          watermarked_asset_url?: string | null
        }
        Update: {
          asset_bucket?: string | null
          asset_path?: string | null
          asset_url?: string
          buyer_user_id?: string | null
          created_at?: string
          download_count?: number
          id?: string
          last_downloaded_at?: string | null
          listing_id?: string | null
          max_downloads?: number
          music_track_id?: string | null
          order_item_id?: string
          preview_bucket?: string | null
          preview_path?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          status?: string
          updated_at?: string
          watermarked_asset_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_entitlements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_entitlements_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_entitlements_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          external_account_id: string | null
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token: string | null
          seller_user_id: string
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token?: string | null
          seller_user_id: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token?: string | null
          seller_user_id?: string
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_listing_variants: {
        Row: {
          created_at: string
          id: string
          inventory_count: number | null
          is_default: boolean
          listing_id: string
          metadata: Json
          option_values: Json
          price: number
          sku: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_count?: number | null
          is_default?: boolean
          listing_id: string
          metadata?: Json
          option_values?: Json
          price?: number
          sku?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_count?: number | null
          is_default?: boolean
          listing_id?: string
          metadata?: Json
          option_values?: Json
          price?: number
          sku?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_variants_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          base_price: number | null
          category: string
          compare_at_price: number | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          featured_rank: number | null
          has_unlimited_inventory: boolean
          id: string
          inventory_count: number | null
          license_type: string
          media_urls: string[]
          metadata: Json
          moderation_status: string
          music_track_id: string | null
          product_type: string
          rights_confirmed: boolean
          rights_confirmed_at: string | null
          seller_user_id: string
          status: string
          storefront_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category: string
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_rank?: number | null
          has_unlimited_inventory?: boolean
          id?: string
          inventory_count?: number | null
          license_type?: string
          media_urls?: string[]
          metadata?: Json
          moderation_status?: string
          music_track_id?: string | null
          product_type: string
          rights_confirmed?: boolean
          rights_confirmed_at?: string | null
          seller_user_id: string
          status?: string
          storefront_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category?: string
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured_rank?: number | null
          has_unlimited_inventory?: boolean
          id?: string
          inventory_count?: number | null
          license_type?: string
          media_urls?: string[]
          metadata?: Json
          moderation_status?: string
          music_track_id?: string | null
          product_type?: string
          rights_confirmed?: boolean
          rights_confirmed_at?: string | null
          seller_user_id?: string
          status?: string
          storefront_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "marketplace_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_moderation_queue: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          order_id: string | null
          reason: string
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          order_id?: string | null
          reason: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          order_id?: string | null
          reason?: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_moderation_queue_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_moderation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          fulfillment_provider: string | null
          fulfillment_reference: string | null
          fulfillment_status: string
          id: string
          line_total: number
          listing_id: string
          metadata: Json
          music_track_id: string | null
          order_id: string
          product_type: string
          quantity: number
          service_status: string | null
          title: string
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          fulfillment_provider?: string | null
          fulfillment_reference?: string | null
          fulfillment_status?: string
          id?: string
          line_total: number
          listing_id: string
          metadata?: Json
          music_track_id?: string | null
          order_id: string
          product_type: string
          quantity?: number
          service_status?: string | null
          title: string
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          fulfillment_provider?: string | null
          fulfillment_reference?: string | null
          fulfillment_status?: string
          id?: string
          line_total?: number
          listing_id?: string
          metadata?: Json
          music_track_id?: string | null
          order_id?: string
          product_type?: string
          quantity?: number
          service_status?: string | null
          title?: string
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listing_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_user_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          payment_provider: string
          payment_reference: string | null
          payment_status: string
          platform_fee_amount: number
          seller_user_id: string
          shipping_address: Json | null
          status: string
          stripe_checkout_session_id: string | null
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_user_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_provider?: string
          payment_reference?: string | null
          payment_status?: string
          platform_fee_amount?: number
          seller_user_id: string
          shipping_address?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_user_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          payment_provider?: string
          payment_reference?: string | null
          payment_status?: string
          platform_fee_amount?: number
          seller_user_id?: string
          shipping_address?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_payout_ledger: {
        Row: {
          available_at: string | null
          created_at: string
          gross_amount: number
          id: string
          metadata: Json
          net_amount: number
          order_id: string
          paid_at: string | null
          payout_provider: string
          payout_reference: string | null
          payout_status: string
          platform_fee_amount: number
          seller_user_id: string
          updated_at: string
        }
        Insert: {
          available_at?: string | null
          created_at?: string
          gross_amount: number
          id?: string
          metadata?: Json
          net_amount: number
          order_id: string
          paid_at?: string | null
          payout_provider?: string
          payout_reference?: string | null
          payout_status?: string
          platform_fee_amount: number
          seller_user_id: string
          updated_at?: string
        }
        Update: {
          available_at?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          metadata?: Json
          net_amount?: number
          order_id?: string
          paid_at?: string | null
          payout_provider?: string
          payout_reference?: string | null
          payout_status?: string
          platform_fee_amount?: number
          seller_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_payout_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_service_milestones: {
        Row: {
          created_at: string
          delivered_at: string | null
          description: string | null
          due_at: string | null
          id: string
          order_item_id: string
          revision_count: number
          revision_limit: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_item_id: string
          revision_count?: number
          revision_limit?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_item_id?: string
          revision_count?: number
          revision_limit?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_service_milestones_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_storefronts: {
        Row: {
          accepted_seller_agreement_at: string | null
          created_at: string
          display_name: string
          external_links: Json
          id: string
          is_active: boolean
          rating_average: number
          rating_count: number
          response_time_hours: number | null
          sections: Json
          seller_agreement_version: string | null
          seller_type: string | null
          seller_user_id: string
          slug: string | null
          tagline: string | null
          theme_config: Json
          updated_at: string
        }
        Insert: {
          accepted_seller_agreement_at?: string | null
          created_at?: string
          display_name: string
          external_links?: Json
          id?: string
          is_active?: boolean
          rating_average?: number
          rating_count?: number
          response_time_hours?: number | null
          sections?: Json
          seller_agreement_version?: string | null
          seller_type?: string | null
          seller_user_id: string
          slug?: string | null
          tagline?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Update: {
          accepted_seller_agreement_at?: string | null
          created_at?: string
          display_name?: string
          external_links?: Json
          id?: string
          is_active?: boolean
          rating_average?: number
          rating_count?: number
          response_time_hours?: number | null
          sections?: Json
          seller_agreement_version?: string | null
          seller_type?: string | null
          seller_user_id?: string
          slug?: string | null
          tagline?: string | null
          theme_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          music_id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          music_id: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          music_id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_comments_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_comments_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "music_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      music_engagement_events: {
        Row: {
          access_level: string | null
          actor_user_id: string | null
          artist_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          music_id: string
          source: string | null
        }
        Insert: {
          access_level?: string | null
          actor_user_id?: string | null
          artist_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          music_id: string
          source?: string | null
        }
        Update: {
          access_level?: string | null
          actor_user_id?: string | null
          artist_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          music_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_engagement_events_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_engagement_events_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_likes: {
        Row: {
          created_at: string
          id: string
          music_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          music_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          music_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_likes_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_likes_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlist_items: {
        Row: {
          added_by_user_id: string
          created_at: string
          id: string
          music_track_id: string
          note: string | null
          playlist_id: string
          position: number
          updated_at: string
        }
        Insert: {
          added_by_user_id: string
          created_at?: string
          id?: string
          music_track_id: string
          note?: string | null
          playlist_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          added_by_user_id?: string
          created_at?: string
          id?: string
          music_track_id?: string
          note?: string | null
          playlist_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_items_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_playlist_items_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlist_shares: {
        Row: {
          created_at: string
          feed_post_id: string | null
          id: string
          playlist_id: string
          shared_by_user_id: string
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          feed_post_id?: string | null
          id?: string
          playlist_id: string
          shared_by_user_id: string
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          feed_post_id?: string | null
          id?: string
          playlist_id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_playlist_shares_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_playlist_shares_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      music_playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          owner_user_id: string
          share_slug: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_user_id: string
          share_slug?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_user_id?: string
          share_slug?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      music_plays: {
        Row: {
          access_level: string
          artist_user_id: string | null
          completed: boolean
          created_at: string
          id: string
          ip_address: string | null
          listen_seconds: number | null
          music_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_level?: string
          artist_user_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          listen_seconds?: number | null
          music_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_level?: string
          artist_user_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          listen_seconds?: number | null
          music_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_plays_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_plays_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      music_preview_generation_jobs: {
        Row: {
          artist_user_id: string
          attempts: number
          completed_at: string | null
          created_at: string
          duration_seconds: number
          error: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          metadata: Json
          music_id: string
          preview_bucket: string
          preview_path: string | null
          source_bucket: string
          source_path: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_user_id: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          music_id: string
          preview_bucket?: string
          preview_path?: string | null
          source_bucket?: string
          source_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_user_id?: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          metadata?: Json
          music_id?: string
          preview_bucket?: string
          preview_path?: string | null
          source_bucket?: string
          source_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_preview_generation_jobs_artist_user_id_fkey"
            columns: ["artist_user_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "music_preview_generation_jobs_artist_user_id_fkey"
            columns: ["artist_user_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_preview_generation_jobs_artist_user_id_fkey"
            columns: ["artist_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_preview_generation_jobs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_preview_generation_jobs_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          channels: Json
          created_at: string
          delivered_at: string | null
          id: string
          notification_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          delivered_at?: string | null
          id?: string
          notification_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          delivered_at?: string | null
          id?: string
          notification_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          enable_bookings: boolean | null
          enable_comments: boolean | null
          enable_email: boolean | null
          enable_events: boolean | null
          enable_follows: boolean | null
          enable_in_app: boolean | null
          enable_likes: boolean | null
          enable_messages: boolean | null
          enable_push: boolean | null
          enable_system: boolean | null
          id: string
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enable_bookings?: boolean | null
          enable_comments?: boolean | null
          enable_email?: boolean | null
          enable_events?: boolean | null
          enable_follows?: boolean | null
          enable_in_app?: boolean | null
          enable_likes?: boolean | null
          enable_messages?: boolean | null
          enable_push?: boolean | null
          enable_system?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enable_bookings?: boolean | null
          enable_comments?: boolean | null
          enable_email?: boolean | null
          enable_events?: boolean | null
          enable_follows?: boolean | null
          enable_in_app?: boolean | null
          enable_likes?: boolean | null
          enable_messages?: boolean | null
          enable_push?: boolean | null
          enable_system?: boolean | null
          id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json
          priority: string | null
          read: boolean | null
          read_at: string | null
          related_content_id: string | null
          related_content_type: string | null
          related_user_id: string | null
          summary: string | null
          target_account_type: string | null
          target_profile_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          related_content_id?: string | null
          related_content_type?: string | null
          related_user_id?: string | null
          summary?: string | null
          target_account_type?: string | null
          target_profile_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          related_content_id?: string | null
          related_content_type?: string | null
          related_user_id?: string | null
          summary?: string | null
          target_account_type?: string | null
          target_profile_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications_v2: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          payload: Json
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          payload?: Json
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          payload?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          artist_contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          event_id: string
          id: string
          pdf_url: string | null
          status: string
          terms: Json
          updated_at: string
        }
        Insert: {
          artist_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          event_id: string
          id?: string
          pdf_url?: string | null
          status?: string
          terms?: Json
          updated_at?: string
        }
        Update: {
          artist_contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          event_id?: string
          id?: string
          pdf_url?: string | null
          status?: string
          terms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding: {
        Row: {
          active_profile_type: string | null
          artist_profile_completed: boolean | null
          completed: boolean | null
          created_at: string | null
          general_profile_completed: boolean | null
          id: string
          on_tour: boolean | null
          purpose: string | null
          role: string | null
          steps: Json | null
          updated_at: string | null
          user_id: string
          venue_profile_completed: boolean | null
        }
        Insert: {
          active_profile_type?: string | null
          artist_profile_completed?: boolean | null
          completed?: boolean | null
          created_at?: string | null
          general_profile_completed?: boolean | null
          id?: string
          on_tour?: boolean | null
          purpose?: string | null
          role?: string | null
          steps?: Json | null
          updated_at?: string | null
          user_id: string
          venue_profile_completed?: boolean | null
        }
        Update: {
          active_profile_type?: string | null
          artist_profile_completed?: boolean | null
          completed?: boolean | null
          created_at?: string | null
          general_profile_completed?: boolean | null
          id?: string
          on_tour?: boolean | null
          purpose?: string | null
          role?: string | null
          steps?: Json | null
          updated_at?: string | null
          user_id?: string
          venue_profile_completed?: boolean | null
        }
        Relationships: []
      }
      onboarding_flows: {
        Row: {
          completed_at: string | null
          created_at: string | null
          flow_type: string
          id: string
          metadata: Json | null
          responses: Json | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          flow_type: string
          id?: string
          metadata?: Json | null
          responses?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          flow_type?: string
          id?: string
          metadata?: Json | null
          responses?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          assigned_to: string | null
          category: string
          completion_criteria: string[] | null
          depends_on: string[] | null
          description: string | null
          documents: string[] | null
          due_date_offset: number | null
          estimated_hours: number
          id: string
          instructions: string | null
          required: boolean
          step_order: number
          step_type: string
          title: string
          workflow_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          completion_criteria?: string[] | null
          depends_on?: string[] | null
          description?: string | null
          documents?: string[] | null
          due_date_offset?: number | null
          estimated_hours?: number
          id?: string
          instructions?: string | null
          required?: boolean
          step_order?: number
          step_type: string
          title: string
          workflow_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completion_criteria?: string[] | null
          depends_on?: string[] | null
          description?: string | null
          documents?: string[] | null
          due_date_offset?: number | null
          estimated_hours?: number
          id?: string
          instructions?: string | null
          required?: boolean
          step_order?: number
          step_type?: string
          title?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "onboarding_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string | null
          description: string | null
          fields: Json | null
          flow_type: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          flow_type: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fields?: Json | null
          flow_type?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      onboarding_workflows: {
        Row: {
          adhoc_venue_id: string | null
          assignees: string[] | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          estimated_days: number | null
          id: string
          is_default: boolean | null
          name: string
          position: string | null
          required_documents: string[] | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          assignees?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          estimated_days?: number | null
          id?: string
          is_default?: boolean | null
          name: string
          position?: string | null
          required_documents?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          assignees?: string[] | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          estimated_days?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          position?: string | null
          required_documents?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_workflows_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_workflows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          external_id: string
          id: string
          location_text: string | null
          metadata: Json
          opportunity_score: number
          opportunity_type: string
          published_at: string
          source_category: string
          source_name: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          location_text?: string | null
          metadata?: Json
          opportunity_score?: number
          opportunity_type: string
          published_at?: string
          source_category?: string
          source_name: string
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          location_text?: string | null
          metadata?: Json
          opportunity_score?: number
          opportunity_type?: string
          published_at?: string
          source_category?: string
          source_name?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          org_id: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          invited_by: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_role_permissions: {
        Row: {
          perms: string[]
          role: string
        }
        Insert: {
          perms: string[]
          role: string
        }
        Update: {
          perms?: string[]
          role?: string
        }
        Relationships: []
      }
      organization_artist_members: {
        Row: {
          artist_profile_id: string
          created_at: string
          id: string
          invited_by: string | null
          organizer_account_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          organizer_account_id: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          organizer_account_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_artist_members_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_artist_members_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "organization_artist_members_organizer_account_id_fkey"
            columns: ["organizer_account_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_social_integrations: {
        Row: {
          access_token: string | null
          account_handle: string
          analytics: Json
          connected_by: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_sync: string | null
          ops_org_id: string
          organizer_account_id: string
          platform: string
          refresh_token: string | null
          refresh_token_envelope: Json | null
          token_envelope: Json | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_handle?: string
          analytics?: Json
          connected_by?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          ops_org_id: string
          organizer_account_id: string
          platform: string
          refresh_token?: string | null
          refresh_token_envelope?: Json | null
          token_envelope?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_handle?: string
          analytics?: Json
          connected_by?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync?: string | null
          ops_org_id?: string
          organizer_account_id?: string
          platform?: string
          refresh_token?: string | null
          refresh_token_envelope?: Json | null
          token_envelope?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_social_integrations_organizer_account_id_fkey"
            columns: ["organizer_account_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_social_media_insights: {
        Row: {
          caption: string | null
          comments: number
          created_at: string
          engagement: number
          id: string
          impressions: number
          integration_id: string
          likes: number
          media_id: string
          media_type: string | null
          ops_org_id: string
          organizer_account_id: string
          permalink: string | null
          platform: string
          posted_at: string | null
          raw: Json
          reach: number
          shares: number
          synced_at: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          comments?: number
          created_at?: string
          engagement?: number
          id?: string
          impressions?: number
          integration_id: string
          likes?: number
          media_id: string
          media_type?: string | null
          ops_org_id: string
          organizer_account_id: string
          permalink?: string | null
          platform: string
          posted_at?: string | null
          raw?: Json
          reach?: number
          shares?: number
          synced_at?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          comments?: number
          created_at?: string
          engagement?: number
          id?: string
          impressions?: number
          integration_id?: string
          likes?: number
          media_id?: string
          media_type?: string | null
          ops_org_id?: string
          organizer_account_id?: string
          permalink?: string | null
          platform?: string
          posted_at?: string | null
          raw?: Json
          reach?: number
          shares?: number
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_social_media_insights_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "organization_social_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_social_media_insights_organizer_account_id_fkey"
            columns: ["organizer_account_id"]
            isOneToOne: false
            referencedRelation: "organizer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          settings: Json
          slug: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          settings?: Json
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
      organizer_accounts: {
        Row: {
          admin_level: string | null
          avatar_url: string | null
          banner_url: string | null
          contact_info: Json | null
          created_at: string
          description: string | null
          global_search_vector: unknown | null
          id: string
          is_active: boolean | null
          is_public: boolean
          ops_org_id: string | null
          organization_name: string
          organization_type: string
          social_links: Json | null
          specialties: string[] | null
          subtype: string | null
          updated_at: string
          url_slug: string | null
          user_id: string
        }
        Insert: {
          admin_level?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          global_search_vector?: unknown | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          ops_org_id?: string | null
          organization_name: string
          organization_type?: string
          social_links?: Json | null
          specialties?: string[] | null
          subtype?: string | null
          updated_at?: string
          url_slug?: string | null
          user_id: string
        }
        Update: {
          admin_level?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          contact_info?: Json | null
          created_at?: string
          description?: string | null
          global_search_vector?: unknown | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          ops_org_id?: string | null
          organization_name?: string
          organization_type?: string
          social_links?: Json | null
          specialties?: string[] | null
          subtype?: string | null
          updated_at?: string
          url_slug?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_accounts_ops_org_id_fkey"
            columns: ["ops_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_pages: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          is_verified: boolean | null
          slug: string
          socials: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          slug: string
          socials?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          slug?: string
          socials?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_agencies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      photo_albums: {
        Row: {
          account_type: string
          category: string | null
          cover_photo_id: string | null
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          metadata: Json | null
          photo_count: number | null
          tags: string[] | null
          title: string
          total_likes: number | null
          total_views: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type: string
          category?: string | null
          cover_photo_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          photo_count?: number | null
          tags?: string[] | null
          title: string
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          category?: string | null
          cover_photo_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          photo_count?: number | null
          tags?: string[] | null
          title?: string
          total_likes?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_photo_albums_cover_photo"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          likes: number | null
          parent_comment_id: string | null
          photo_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          likes?: number | null
          parent_comment_id?: string | null
          photo_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          likes?: number | null
          parent_comment_id?: string | null
          photo_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "photo_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_likes: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_purchases: {
        Row: {
          buyer_user_id: string
          download_count: number | null
          download_expires_at: string | null
          download_url: string | null
          id: string
          license_agreement: string | null
          license_end_date: string | null
          license_start_date: string | null
          license_type: string
          max_downloads: number | null
          metadata: Json | null
          payment_method: string | null
          payment_status: string | null
          photo_id: string
          platform_fee: number | null
          purchase_price: number
          purchased_at: string | null
          seller_payout: number
          seller_user_id: string
          stripe_payment_intent_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_user_id: string
          download_count?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          license_agreement?: string | null
          license_end_date?: string | null
          license_start_date?: string | null
          license_type: string
          max_downloads?: number | null
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          photo_id: string
          platform_fee?: number | null
          purchase_price: number
          purchased_at?: string | null
          seller_payout: number
          seller_user_id: string
          stripe_payment_intent_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_user_id?: string
          download_count?: number | null
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          license_agreement?: string | null
          license_end_date?: string | null
          license_start_date?: string | null
          license_type?: string
          max_downloads?: number | null
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: string | null
          photo_id?: string
          platform_fee?: number | null
          purchase_price?: number
          purchased_at?: string | null
          seller_payout?: number
          seller_user_id?: string
          stripe_payment_intent_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_purchases_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          photo_id: string
          position_x: number | null
          position_y: number | null
          tag_text: string | null
          tag_type: string
          tagged_event_id: string | null
          tagged_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          photo_id: string
          position_x?: number | null
          position_y?: number | null
          tag_text?: string | null
          tag_type: string
          tagged_event_id?: string | null
          tagged_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          photo_id?: string
          position_x?: number | null
          position_y?: number | null
          tag_text?: string | null
          tag_type?: string
          tagged_event_id?: string | null
          tagged_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          account_type: string
          album_id: string | null
          alt_text: string | null
          camera_info: Json | null
          category: string | null
          created_at: string | null
          description: string | null
          dimensions: Json
          downloads: number | null
          event_id: string | null
          exif_data: Json | null
          file_format: string | null
          file_size: number
          full_res_size: number | null
          full_res_url: string
          has_watermark: boolean | null
          id: string
          is_featured: boolean | null
          is_for_sale: boolean | null
          is_public: boolean | null
          license_type: string | null
          likes: number | null
          location: string | null
          metadata: Json | null
          order_index: number | null
          photographer_name: string | null
          preview_url: string
          purchases: number | null
          sale_price: number | null
          shot_date: string | null
          tags: string[] | null
          thumbnail_url: string
          title: string | null
          updated_at: string | null
          usage_rights: string | null
          user_id: string
          views: number | null
          watermark_position: string | null
          watermark_text: string | null
        }
        Insert: {
          account_type: string
          album_id?: string | null
          alt_text?: string | null
          camera_info?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions: Json
          downloads?: number | null
          event_id?: string | null
          exif_data?: Json | null
          file_format?: string | null
          file_size: number
          full_res_size?: number | null
          full_res_url: string
          has_watermark?: boolean | null
          id?: string
          is_featured?: boolean | null
          is_for_sale?: boolean | null
          is_public?: boolean | null
          license_type?: string | null
          likes?: number | null
          location?: string | null
          metadata?: Json | null
          order_index?: number | null
          photographer_name?: string | null
          preview_url: string
          purchases?: number | null
          sale_price?: number | null
          shot_date?: string | null
          tags?: string[] | null
          thumbnail_url: string
          title?: string | null
          updated_at?: string | null
          usage_rights?: string | null
          user_id: string
          views?: number | null
          watermark_position?: string | null
          watermark_text?: string | null
        }
        Update: {
          account_type?: string
          album_id?: string | null
          alt_text?: string | null
          camera_info?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json
          downloads?: number | null
          event_id?: string | null
          exif_data?: Json | null
          file_format?: string | null
          file_size?: number
          full_res_size?: number | null
          full_res_url?: string
          has_watermark?: boolean | null
          id?: string
          is_featured?: boolean | null
          is_for_sale?: boolean | null
          is_public?: boolean | null
          license_type?: string | null
          likes?: number | null
          location?: string | null
          metadata?: Json | null
          order_index?: number | null
          photographer_name?: string | null
          preview_url?: string
          purchases?: number | null
          sale_price?: number | null
          shot_date?: string | null
          tags?: string[] | null
          thumbnail_url?: string
          title?: string | null
          updated_at?: string | null
          usage_rights?: string | null
          user_id?: string
          views?: number | null
          watermark_position?: string | null
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          links: Json | null
          media: Json | null
          order_index: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          links?: Json | null
          media?: Json | null
          order_index?: number | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          links?: Json | null
          media?: Json | null
          order_index?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_collaborators: {
        Row: {
          can_reshare: boolean | null
          collaborator_id: string
          collaborator_type: string
          created_at: string | null
          id: string
          post_id: string
          role: string | null
          status: string | null
        }
        Insert: {
          can_reshare?: boolean | null
          collaborator_id: string
          collaborator_type: string
          created_at?: string | null
          id?: string
          post_id: string
          role?: string | null
          status?: string | null
        }
        Update: {
          can_reshare?: boolean | null
          collaborator_id?: string
          collaborator_type?: string
          created_at?: string | null
          id?: string
          post_id?: string
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "promotion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_comment_id: string | null
          post_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          created_at: string | null
          hashtag_id: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          created_at?: string | null
          hashtag_id?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          created_at?: string | null
          hashtag_id?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_kind: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          duration: number | null
          file_size: number | null
          id: string
          order_index: number | null
          post_id: string | null
          thumbnail_url: string | null
          type: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          order_index?: number | null
          post_id?: string | null
          thumbnail_url?: string | null
          type: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          order_index?: number | null
          post_id?: string | null
          thumbnail_url?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          shared_to: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          shared_to?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          shared_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          account_avatar_url: string | null
          account_display_name: string | null
          account_username: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          global_search_vector: unknown | null
          hashtags: string[] | null
          id: string
          is_pinned: boolean | null
          is_visible: boolean
          likes_count: number | null
          location: string | null
          media_urls: string[] | null
          moderation_status: string
          posted_as_profile_id: string | null
          posted_as_type: string | null
          shares_count: number | null
          tagged_users: string[] | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          account_avatar_url?: string | null
          account_display_name?: string | null
          account_username?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          global_search_vector?: unknown | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          is_visible?: boolean
          likes_count?: number | null
          location?: string | null
          media_urls?: string[] | null
          moderation_status?: string
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          shares_count?: number | null
          tagged_users?: string[] | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          account_avatar_url?: string | null
          account_display_name?: string | null
          account_username?: string | null
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          global_search_vector?: unknown | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          is_visible?: boolean
          likes_count?: number | null
          location?: string | null
          media_urls?: string[] | null
          moderation_status?: string
          posted_as_profile_id?: string | null
          posted_as_type?: string | null
          shares_count?: number | null
          tagged_users?: string[] | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
      power_distribution: {
        Row: {
          available_capacity_watts: number
          created_at: string | null
          current_connections: number | null
          estimated_runtime_hours: number | null
          fuel_level_percentage: number | null
          fuel_type: string | null
          height: number | null
          id: string
          last_maintenance_date: string | null
          maintenance_notes: string | null
          max_connections: number | null
          name: string
          next_maintenance_date: string | null
          phase_type: string | null
          power_type: string
          site_map_id: string
          status: string | null
          total_capacity_watts: number
          updated_at: string | null
          voltage_output: string
          width: number | null
          x: number
          y: number
        }
        Insert: {
          available_capacity_watts: number
          created_at?: string | null
          current_connections?: number | null
          estimated_runtime_hours?: number | null
          fuel_level_percentage?: number | null
          fuel_type?: string | null
          height?: number | null
          id?: string
          last_maintenance_date?: string | null
          maintenance_notes?: string | null
          max_connections?: number | null
          name: string
          next_maintenance_date?: string | null
          phase_type?: string | null
          power_type: string
          site_map_id: string
          status?: string | null
          total_capacity_watts: number
          updated_at?: string | null
          voltage_output: string
          width?: number | null
          x: number
          y: number
        }
        Update: {
          available_capacity_watts?: number
          created_at?: string | null
          current_connections?: number | null
          estimated_runtime_hours?: number | null
          fuel_level_percentage?: number | null
          fuel_type?: string | null
          height?: number | null
          id?: string
          last_maintenance_date?: string | null
          maintenance_notes?: string | null
          max_connections?: number | null
          name?: string
          next_maintenance_date?: string | null
          phase_type?: string | null
          power_type?: string
          site_map_id?: string
          status?: string | null
          total_capacity_watts?: number
          updated_at?: string | null
          voltage_output?: string
          width?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "power_distribution_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      production_companies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_certifications: {
        Row: {
          authority: string | null
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          is_public: boolean | null
          issue_date: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          authority?: string | null
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          is_public?: boolean | null
          issue_date?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          authority?: string | null
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          is_public?: boolean | null
          issue_date?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_experiences: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          is_visible: boolean | null
          order_index: number | null
          organization: string | null
          source: string | null
          source_id: string | null
          start_date: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_visible?: boolean | null
          order_index?: number | null
          organization?: string | null
          source?: string | null
          source_id?: string | null
          start_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_visible?: boolean | null
          order_index?: number | null
          organization?: string | null
          source?: string | null
          source_id?: string | null
          start_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_settings: Json | null
          account_tier: string | null
          account_type: string | null
          allow_project_offers: boolean | null
          availability_status: string | null
          avatar_url: string | null
          bio: string | null
          company: string | null
          cover_image: string | null
          created_at: string
          email: string | null
          experience_level: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          global_search_vector: unknown | null
          hourly_rate: number | null
          id: string
          instagram: string | null
          is_verified: boolean | null
          location: string | null
          metadata: Json | null
          name: string | null
          onboarding_completed: boolean | null
          posts_count: number | null
          preferred_project_types: string[] | null
          privacy_accepted_at: string | null
          profile_data: Json | null
          public_profile: boolean | null
          show_availability: boolean | null
          show_email: boolean | null
          show_hourly_rate: boolean | null
          show_location: boolean | null
          show_phone: boolean | null
          skills: string[] | null
          social_links: Json | null
          stripe_connect_account_id: string | null
          stripe_connect_account_kind: string | null
          stripe_connect_v2_account_id: string | null
          stripe_customer_id: string | null
          title: string | null
          top_skills: string[] | null
          tos_accepted_at: string | null
          tos_version: number | null
          twitter: string | null
          updated_at: string
          url_slug: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          account_settings?: Json | null
          account_tier?: string | null
          account_type?: string | null
          allow_project_offers?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_image?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          global_search_vector?: unknown | null
          hourly_rate?: number | null
          id: string
          instagram?: string | null
          is_verified?: boolean | null
          location?: string | null
          metadata?: Json | null
          name?: string | null
          onboarding_completed?: boolean | null
          posts_count?: number | null
          preferred_project_types?: string[] | null
          privacy_accepted_at?: string | null
          profile_data?: Json | null
          public_profile?: boolean | null
          show_availability?: boolean | null
          show_email?: boolean | null
          show_hourly_rate?: boolean | null
          show_location?: boolean | null
          show_phone?: boolean | null
          skills?: string[] | null
          social_links?: Json | null
          stripe_connect_account_id?: string | null
          stripe_connect_account_kind?: string | null
          stripe_connect_v2_account_id?: string | null
          stripe_customer_id?: string | null
          title?: string | null
          top_skills?: string[] | null
          tos_accepted_at?: string | null
          tos_version?: number | null
          twitter?: string | null
          updated_at?: string
          url_slug?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          account_settings?: Json | null
          account_tier?: string | null
          account_type?: string | null
          allow_project_offers?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_image?: string | null
          created_at?: string
          email?: string | null
          experience_level?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          global_search_vector?: unknown | null
          hourly_rate?: number | null
          id?: string
          instagram?: string | null
          is_verified?: boolean | null
          location?: string | null
          metadata?: Json | null
          name?: string | null
          onboarding_completed?: boolean | null
          posts_count?: number | null
          preferred_project_types?: string[] | null
          privacy_accepted_at?: string | null
          profile_data?: Json | null
          public_profile?: boolean | null
          show_availability?: boolean | null
          show_email?: boolean | null
          show_hourly_rate?: boolean | null
          show_location?: boolean | null
          show_phone?: boolean | null
          skills?: string[] | null
          social_links?: Json | null
          stripe_connect_account_id?: string | null
          stripe_connect_account_kind?: string | null
          stripe_connect_v2_account_id?: string | null
          stripe_customer_id?: string | null
          title?: string | null
          top_skills?: string[] | null
          tos_accepted_at?: string | null
          tos_version?: number | null
          twitter?: string | null
          updated_at?: string
          url_slug?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          project_id: string
          role: string
          specific_role: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          project_id: string
          role: string
          specific_role?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string
          role?: string
          specific_role?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          folder: string | null
          id: string
          mime_type: string | null
          project_id: string
          tags: string[] | null
          track_name: string | null
          updated_at: string | null
          uploaded_by: string
          version_number: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          project_id: string
          tags?: string[] | null
          track_name?: string | null
          updated_at?: string | null
          uploaded_by: string
          version_number?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          project_id?: string
          tags?: string[] | null
          track_name?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          discussion_message_id: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          related_file_id: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          discussion_message_id?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          related_file_id?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          discussion_message_id?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          related_file_id?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_related_file_id_fkey"
            columns: ["related_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_ticket_types: string[] | null
          campaign_id: string | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          event_id: string
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_uses: number | null
          min_purchase_amount: number
          start_date: string
          updated_at: string
        }
        Insert: {
          applicable_ticket_types?: string[] | null
          campaign_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value?: number
          end_date: string
          event_id: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_purchase_amount?: number
          start_date: string
          updated_at?: string
        }
        Update: {
          applicable_ticket_types?: string[] | null
          campaign_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          event_id?: string
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_purchase_amount?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ticket_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      promoters: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promotion_posts: {
        Row: {
          author_id: string
          author_type: string
          content: string | null
          created_at: string | null
          event_id: string | null
          id: string
          images: Json | null
          publish_at: string | null
          status: string
          tags: string[] | null
          title: string | null
          tour_id: string | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          author_id: string
          author_type: string
          content?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          images?: Json | null
          publish_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          tour_id?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          author_id?: string
          author_type?: string
          content?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          images?: Json | null
          publish_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          tour_id?: string | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      rbac_permission_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          permission_name: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          permission_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          permission_name?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          category: string | null
          description: string | null
          display_name: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          description: string | null
          display_name: string | null
          id: string
          is_system: boolean | null
          name: string
          scope_type: string
        }
        Insert: {
          description?: string | null
          display_name?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          scope_type: string
        }
        Update: {
          description?: string | null
          display_name?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          scope_type?: string
        }
        Relationships: []
      }
      rbac_user_entity_roles: {
        Row: {
          end_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean | null
          role_id: string
          start_at: string | null
          user_id: string
        }
        Insert: {
          end_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean | null
          role_id: string
          start_at?: string | null
          user_id: string
        }
        Update: {
          end_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean | null
          role_id?: string
          start_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_entity_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_user_permission_overrides: {
        Row: {
          allow: boolean
          entity_id: string
          entity_type: string
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          allow: boolean
          entity_id: string
          entity_type: string
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          allow?: boolean
          entity_id?: string
          entity_type?: string
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_agreement_items: {
        Row: {
          actual_pickup_date: string | null
          actual_return_date: string | null
          condition_in: string | null
          condition_out: string | null
          created_at: string | null
          daily_rate: number
          damage_notes: string | null
          damage_photos: string[] | null
          equipment_id: string | null
          id: string
          item_description: string | null
          item_name: string | null
          notes: string | null
          quantity: number | null
          rental_agreement_id: string
          status: string | null
          subtotal: number
          total_days: number
          updated_at: string | null
        }
        Insert: {
          actual_pickup_date?: string | null
          actual_return_date?: string | null
          condition_in?: string | null
          condition_out?: string | null
          created_at?: string | null
          daily_rate: number
          damage_notes?: string | null
          damage_photos?: string[] | null
          equipment_id?: string | null
          id?: string
          item_description?: string | null
          item_name?: string | null
          notes?: string | null
          quantity?: number | null
          rental_agreement_id: string
          status?: string | null
          subtotal: number
          total_days: number
          updated_at?: string | null
        }
        Update: {
          actual_pickup_date?: string | null
          actual_return_date?: string | null
          condition_in?: string | null
          condition_out?: string | null
          created_at?: string | null
          daily_rate?: number
          damage_notes?: string | null
          damage_photos?: string[] | null
          equipment_id?: string | null
          id?: string
          item_description?: string | null
          item_name?: string | null
          notes?: string | null
          quantity?: number | null
          rental_agreement_id?: string
          status?: string | null
          subtotal?: number
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreement_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "venue_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreement_items_rental_agreement_id_fkey"
            columns: ["rental_agreement_id"]
            isOneToOne: false
            referencedRelation: "rental_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_agreements: {
        Row: {
          agreement_number: string
          approved_at: string | null
          approved_by: string | null
          client_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          deposit_amount: number | null
          end_date: string
          event_id: string | null
          id: string
          insurance_amount: number | null
          insurance_required: boolean | null
          paid_amount: number | null
          payment_status: string | null
          pickup_date: string | null
          pickup_instructions: string | null
          return_date: string | null
          special_requirements: string | null
          start_date: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          terms_conditions: string | null
          total_amount: number | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_number: string
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          deposit_amount?: number | null
          end_date: string
          event_id?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_required?: boolean | null
          paid_amount?: number | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_instructions?: string | null
          return_date?: string | null
          special_requirements?: string | null
          start_date: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_number?: string
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          deposit_amount?: number | null
          end_date?: string
          event_id?: string | null
          id?: string
          insurance_amount?: number | null
          insurance_required?: boolean | null
          paid_amount?: number | null
          payment_status?: string | null
          pickup_date?: string | null
          pickup_instructions?: string | null
          return_date?: string | null
          special_requirements?: string | null
          start_date?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "rental_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_agreements_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_companies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          processed_by: string | null
          rental_agreement_id: string
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          processed_by?: string | null
          rental_agreement_id: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_type?: string
          processed_by?: string | null
          rental_agreement_id?: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_rental_agreement_id_fkey"
            columns: ["rental_agreement_id"]
            isOneToOne: false
            referencedRelation: "rental_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      required_docs: {
        Row: {
          created_at: string
          due_at: string | null
          event_id: string
          file_url: string | null
          id: string
          kind: string
          party: string
          status: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          event_id: string
          file_url?: string | null
          id?: string
          kind: string
          party: string
          status?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          event_id?: string
          file_url?: string | null
          id?: string
          kind?: string
          party?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "required_docs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_achievement_highlights: {
        Row: {
          achievement_id: string | null
          badge_id: string | null
          created_at: string
          endorsement_id: string | null
          id: string
          impact_score: number
          is_featured: boolean
          source_type: string
          summary: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id?: string | null
          badge_id?: string | null
          created_at?: string
          endorsement_id?: string | null
          id?: string
          impact_score?: number
          is_featured?: boolean
          source_type?: string
          summary: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string | null
          badge_id?: string | null
          created_at?: string
          endorsement_id?: string | null
          id?: string
          impact_score?: number
          is_featured?: boolean
          source_type?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_achievement_highlights_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_achievement_highlights_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_achievement_highlights_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_transactions: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          points_delta: number
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          points_delta: number
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          points_delta?: number
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          assigned_to: string[] | null
          end_at: string
          id: string
          location: string | null
          notes: string | null
          schedule_id: string
          start_at: string
          title: string
        }
        Insert: {
          assigned_to?: string[] | null
          end_at: string
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id: string
          start_at: string
          title: string
        }
        Update: {
          assigned_to?: string[] | null
          end_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          schedule_id?: string
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          account_specific_content: Json | null
          content: string | null
          created_at: string | null
          error_details: string | null
          hashtags: string[] | null
          id: string
          location: string | null
          media_urls: string[] | null
          post_type: string | null
          posted_at: string | null
          repeat_config: Json | null
          repeat_pattern: string | null
          scheduled_for: string
          status: string | null
          target_accounts: string[] | null
          template_id: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          account_specific_content?: Json | null
          content?: string | null
          created_at?: string | null
          error_details?: string | null
          hashtags?: string[] | null
          id?: string
          location?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          posted_at?: string | null
          repeat_config?: Json | null
          repeat_pattern?: string | null
          scheduled_for: string
          status?: string | null
          target_accounts?: string[] | null
          template_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          account_specific_content?: Json | null
          content?: string | null
          created_at?: string | null
          error_details?: string | null
          hashtags?: string[] | null
          id?: string
          location?: string | null
          media_urls?: string[] | null
          post_type?: string | null
          posted_at?: string | null
          repeat_config?: Json | null
          repeat_pattern?: string | null
          scheduled_for?: string
          status?: string | null
          target_accounts?: string[] | null
          template_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          date: string
          event_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          event_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          event_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          offer_id: string
          signed_at: string | null
          signer_email: string
          signer_role: string
          status: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          offer_id: string
          signed_at?: string | null
          signer_email: string
          signer_role: string
          status?: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          offer_id?: string
          signed_at?: string | null
          signer_email?: string
          signer_role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_map_activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          site_map_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          site_map_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          site_map_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_map_activity_log_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "site_map_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_map_collaborators: {
        Row: {
          accepted_at: string | null
          can_edit: boolean | null
          can_export: boolean | null
          can_invite_users: boolean | null
          can_manage_tents: boolean | null
          can_manage_zones: boolean | null
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          site_map_id: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_invite_users?: boolean | null
          can_manage_tents?: boolean | null
          can_manage_zones?: boolean | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          site_map_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_invite_users?: boolean | null
          can_manage_tents?: boolean | null
          can_manage_zones?: boolean | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          site_map_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_map_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "site_map_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_collaborators_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "site_map_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_map_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_map_elements: {
        Row: {
          color: string | null
          created_at: string | null
          element_type: string
          height: number | null
          id: string
          name: string | null
          opacity: number | null
          path_data: string | null
          properties: Json | null
          rotation: number | null
          shape_data: Json | null
          site_map_id: string
          stroke_color: string | null
          stroke_width: number | null
          updated_at: string | null
          width: number | null
          x: number
          y: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          element_type: string
          height?: number | null
          id?: string
          name?: string | null
          opacity?: number | null
          path_data?: string | null
          properties?: Json | null
          rotation?: number | null
          shape_data?: Json | null
          site_map_id: string
          stroke_color?: string | null
          stroke_width?: number | null
          updated_at?: string | null
          width?: number | null
          x: number
          y: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          element_type?: string
          height?: number | null
          id?: string
          name?: string | null
          opacity?: number | null
          path_data?: string | null
          properties?: Json | null
          rotation?: number | null
          shape_data?: Json | null
          site_map_id?: string
          stroke_color?: string | null
          stroke_width?: number | null
          updated_at?: string | null
          width?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_map_elements_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      site_map_zones: {
        Row: {
          border_color: string | null
          border_width: number | null
          capacity: number | null
          color: string | null
          created_at: string | null
          current_occupancy: number | null
          description: string | null
          height: number
          id: string
          internet_available: boolean | null
          name: string
          notes: string | null
          opacity: number | null
          power_available: boolean | null
          rotation: number | null
          site_map_id: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
          water_available: boolean | null
          width: number
          x: number
          y: number
          zone_type: string
        }
        Insert: {
          border_color?: string | null
          border_width?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          current_occupancy?: number | null
          description?: string | null
          height: number
          id?: string
          internet_available?: boolean | null
          name: string
          notes?: string | null
          opacity?: number | null
          power_available?: boolean | null
          rotation?: number | null
          site_map_id: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          water_available?: boolean | null
          width: number
          x: number
          y: number
          zone_type: string
        }
        Update: {
          border_color?: string | null
          border_width?: number | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          current_occupancy?: number | null
          description?: string | null
          height?: number
          id?: string
          internet_available?: boolean | null
          name?: string
          notes?: string | null
          opacity?: number | null
          power_available?: boolean | null
          rotation?: number | null
          site_map_id?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          water_available?: boolean | null
          width?: number
          x?: number
          y?: number
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_map_zones_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      site_maps: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          grid_enabled: boolean | null
          grid_size: number | null
          height: number
          id: string
          is_public: boolean | null
          name: string
          requires_auth: boolean | null
          scale: number | null
          scale_unit: string | null
          status: string | null
          tour_id: string | null
          updated_at: string | null
          version: number | null
          width: number
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          grid_enabled?: boolean | null
          grid_size?: number | null
          height?: number
          id?: string
          is_public?: boolean | null
          name: string
          requires_auth?: boolean | null
          scale?: number | null
          scale_unit?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          version?: number | null
          width?: number
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          grid_enabled?: boolean | null
          grid_size?: number | null
          height?: number
          id?: string
          is_public?: boolean | null
          name?: string
          requires_auth?: boolean | null
          scale?: number | null
          scale_unit?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
          version?: number | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_maps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "site_maps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_maps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_maps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_maps_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string | null
          endorsed_id: string
          endorser_id: string
          id: string
          skill: string
        }
        Insert: {
          created_at?: string | null
          endorsed_id: string
          endorser_id: string
          id?: string
          skill: string
        }
        Update: {
          created_at?: string | null
          endorsed_id?: string
          endorser_id?: string
          id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_endorsed_id_fkey"
            columns: ["endorsed_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "skill_endorsements_endorsed_id_fkey"
            columns: ["endorsed_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_endorsed_id_fkey"
            columns: ["endorsed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contracts: {
        Row: {
          content: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          end_date: string | null
          id: string
          signatures: Json | null
          start_date: string | null
          status: string | null
          template_id: string | null
          terms: Json | null
          title: string
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          content?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          signatures?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          terms?: Json | null
          title: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          content?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          end_date?: string | null
          id?: string
          signatures?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          terms?: Json | null
          title?: string
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_contracts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "staff_contracts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          candidate_id: string | null
          created_at: string
          credential_type: string | null
          document_type: string
          employer_entity_id: string | null
          employer_entity_type: string | null
          expires_at: string | null
          field_id: string | null
          file_name: string | null
          id: string
          label: string | null
          metadata: Json
          mime_type: string | null
          organization_id: string | null
          owner_user_id: string
          retention_policy_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          staff_member_id: string | null
          status: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          user_id: string | null
          venue_id: string | null
          verified_status: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          credential_type?: string | null
          document_type: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          expires_at?: string | null
          field_id?: string | null
          file_name?: string | null
          id?: string
          label?: string | null
          metadata?: Json
          mime_type?: string | null
          organization_id?: string | null
          owner_user_id: string
          retention_policy_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          staff_member_id?: string | null
          status?: string | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
          verified_status?: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          credential_type?: string | null
          document_type?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          expires_at?: string | null
          field_id?: string | null
          file_name?: string | null
          id?: string
          label?: string | null
          metadata?: Json
          mime_type?: string | null
          organization_id?: string | null
          owner_user_id?: string
          retention_policy_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          staff_member_id?: string | null
          status?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
          verified_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          id: string
          origin: string | null
          phone: string | null
          position_details: Json
          role: string | null
          status: string
          template_id: string | null
          token: string
          tour_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          id?: string
          origin?: string | null
          phone?: string | null
          position_details?: Json
          role?: string | null
          status?: string
          template_id?: string | null
          token: string
          tour_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          id?: string
          origin?: string | null
          phone?: string | null
          position_details?: Json
          role?: string | null
          status?: string
          template_id?: string | null
          token?: string
          tour_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          adhoc_venue_id: string | null
          assigned_manager_id: string | null
          assigned_zone: string | null
          compliance_checked_at: string | null
          compliance_status: string | null
          created_at: string
          department: string | null
          email: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          employment_type: string | null
          entity_id: string | null
          entity_type: string | null
          full_name: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          last_active_at: string | null
          name: string | null
          notes: string | null
          onboarding_candidate_id: string | null
          onboarding_progress: number | null
          performance_rating: number | null
          permissions: Json
          phone: string | null
          position: string | null
          role: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          assigned_manager_id?: string | null
          assigned_zone?: string | null
          compliance_checked_at?: string | null
          compliance_status?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_active_at?: string | null
          name?: string | null
          notes?: string | null
          onboarding_candidate_id?: string | null
          onboarding_progress?: number | null
          performance_rating?: number | null
          permissions?: Json
          phone?: string | null
          position?: string | null
          role?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          assigned_manager_id?: string | null
          assigned_zone?: string | null
          compliance_checked_at?: string | null
          compliance_status?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          full_name?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          last_active_at?: string | null
          name?: string | null
          notes?: string | null
          onboarding_candidate_id?: string | null
          onboarding_progress?: number | null
          performance_rating?: number | null
          permissions?: Json
          phone?: string | null
          position?: string | null
          role?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_onboarding_candidate_id_fkey"
            columns: ["onboarding_candidate_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          org_id: string | null
          priority: string
          read_by: string[]
          recipients: string[]
          sender_id: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          org_id?: string | null
          priority?: string
          read_by?: string[]
          recipients?: string[]
          sender_id?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          org_id?: string | null
          priority?: string
          read_by?: string[]
          recipients?: string[]
          sender_id?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          progress: Json | null
          started_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
          venue_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
          venue_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: Json | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "staff_onboarding_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding_candidates: {
        Row: {
          adhoc_venue_id: string | null
          application_date: string | null
          application_id: string | null
          approved_at: string | null
          approved_by: string | null
          compliance_checked_at: string | null
          compliance_issues: Json
          compliance_status: string | null
          created_at: string
          department: string | null
          email: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          employment_type: string | null
          id: string
          invitation_token: string | null
          job_application_id: string | null
          job_posting_id: string | null
          name: string | null
          notes: string | null
          onboarding_progress: number
          onboarding_responses: Json | null
          phone: string | null
          position: string | null
          stage: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          application_date?: string | null
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          compliance_checked_at?: string | null
          compliance_issues?: Json
          compliance_status?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          id?: string
          invitation_token?: string | null
          job_application_id?: string | null
          job_posting_id?: string | null
          name?: string | null
          notes?: string | null
          onboarding_progress?: number
          onboarding_responses?: Json | null
          phone?: string | null
          position?: string | null
          stage?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          application_date?: string | null
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          compliance_checked_at?: string | null
          compliance_issues?: Json
          compliance_status?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          id?: string
          invitation_token?: string | null
          job_application_id?: string | null
          job_posting_id?: string | null
          name?: string | null
          notes?: string | null
          onboarding_progress?: number
          onboarding_responses?: Json | null
          phone?: string | null
          position?: string | null
          stage?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_candidates_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_candidates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_candidates_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_candidates_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_candidates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_candidates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding_steps: {
        Row: {
          assigned_to: string | null
          category: string | null
          completion_criteria: string | null
          created_at: string | null
          depends_on: string[] | null
          description: string | null
          documents: string[] | null
          due_date_offset: number | null
          estimated_hours: number | null
          id: string
          instructions: string | null
          required: boolean | null
          step_order: number
          step_type: string | null
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completion_criteria?: string | null
          created_at?: string | null
          depends_on?: string[] | null
          description?: string | null
          documents?: string[] | null
          due_date_offset?: number | null
          estimated_hours?: number | null
          id?: string
          instructions?: string | null
          required?: boolean | null
          step_order: number
          step_type?: string | null
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completion_criteria?: string | null
          created_at?: string | null
          depends_on?: string[] | null
          description?: string | null
          documents?: string[] | null
          due_date_offset?: number | null
          estimated_hours?: number | null
          id?: string
          instructions?: string | null
          required?: boolean | null
          step_order?: number
          step_type?: string | null
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding_templates: {
        Row: {
          assignees: string[] | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          employer_entity_id: string | null
          employer_entity_type: string | null
          employment_type: string | null
          estimated_days: number | null
          fields: Json | null
          id: string
          is_default: boolean | null
          last_used: string | null
          name: string
          parent_template_id: string | null
          position: string | null
          required_documents: string[] | null
          tags: string[] | null
          updated_at: string | null
          use_count: number | null
          venue_id: string | null
        }
        Insert: {
          assignees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          estimated_days?: number | null
          fields?: Json | null
          id?: string
          is_default?: boolean | null
          last_used?: string | null
          name: string
          parent_template_id?: string | null
          position?: string | null
          required_documents?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          use_count?: number | null
          venue_id?: string | null
        }
        Update: {
          assignees?: string[] | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          employment_type?: string | null
          estimated_days?: number | null
          fields?: Json | null
          id?: string
          is_default?: boolean | null
          last_used?: string | null
          name?: string
          parent_template_id?: string | null
          position?: string | null
          required_documents?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          use_count?: number | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "staff_onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "staff_onboarding_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_metrics: {
        Row: {
          adhoc_venue_id: string | null
          attendance_rate: number | null
          certifications_valid: boolean | null
          commendations_count: number | null
          created_at: string
          customer_feedback_score: number | null
          event_id: string | null
          id: string
          incidents_count: number | null
          metric_date: string
          notes: string | null
          performance_rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          staff_member_id: string | null
          supervisor_rating: number | null
          training_completed: boolean | null
          venue_id: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          attendance_rate?: number | null
          certifications_valid?: boolean | null
          commendations_count?: number | null
          created_at?: string
          customer_feedback_score?: number | null
          event_id?: string | null
          id?: string
          incidents_count?: number | null
          metric_date: string
          notes?: string | null
          performance_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_member_id?: string | null
          supervisor_rating?: number | null
          training_completed?: boolean | null
          venue_id?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          attendance_rate?: number | null
          certifications_valid?: boolean | null
          commendations_count?: number | null
          created_at?: string
          customer_feedback_score?: number | null
          event_id?: string | null
          id?: string
          incidents_count?: number | null
          metric_date?: string
          notes?: string | null
          performance_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_member_id?: string | null
          supervisor_rating?: number | null
          training_completed?: boolean | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_metrics_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_metrics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_metrics_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_metrics_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "unified_staff_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_performance_metrics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          notes: string | null
          role: string | null
          shift_end: string
          shift_start: string
          staff_id: string | null
          status: string | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role?: string | null
          shift_end: string
          shift_start: string
          staff_id?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role?: string | null
          shift_end?: string
          shift_start?: string
          staff_id?: string | null
          status?: string | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_shift_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          employer_entity_id: string | null
          employer_entity_type: string | null
          event_id: string | null
          id: string
          notes: string | null
          shift_id: string | null
          staff_member_id: string | null
          zone: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          staff_member_id?: string | null
          zone?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          employer_entity_id?: string | null
          employer_entity_type?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          staff_member_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shift_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shift_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "unified_staff_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          adhoc_venue_id: string | null
          break_duration: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_time: string
          event_id: string | null
          id: string
          notes: string | null
          role_assignment: string | null
          shift_date: string
          staff_member_id: string | null
          start_time: string
          status: string
          updated_at: string
          venue_id: string | null
          zone_assignment: string | null
        }
        Insert: {
          adhoc_venue_id?: string | null
          break_duration?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_time: string
          event_id?: string | null
          id?: string
          notes?: string | null
          role_assignment?: string | null
          shift_date: string
          staff_member_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
          venue_id?: string | null
          zone_assignment?: string | null
        }
        Update: {
          adhoc_venue_id?: string | null
          break_duration?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_time?: string
          event_id?: string | null
          id?: string
          notes?: string | null
          role_assignment?: string | null
          shift_date?: string
          staff_member_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
          venue_id?: string | null
          zone_assignment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "unified_staff_roster"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_zones: {
        Row: {
          adhoc_venue_id: string | null
          assigned_staff_count: number
          capacity: number | null
          created_at: string
          event_id: string | null
          id: string
          required_staff_count: number
          status: string
          supervisor_id: string | null
          updated_at: string
          venue_id: string | null
          zone_description: string | null
          zone_name: string
          zone_type: string
        }
        Insert: {
          adhoc_venue_id?: string | null
          assigned_staff_count?: number
          capacity?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          required_staff_count: number
          status?: string
          supervisor_id?: string | null
          updated_at?: string
          venue_id?: string | null
          zone_description?: string | null
          zone_name: string
          zone_type: string
        }
        Update: {
          adhoc_venue_id?: string | null
          assigned_staff_count?: number
          capacity?: number | null
          created_at?: string
          event_id?: string | null
          id?: string
          required_staff_count?: number
          status?: string
          supervisor_id?: string | null
          updated_at?: string
          venue_id?: string | null
          zone_description?: string | null
          zone_name?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_zones_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_zones_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_agencies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staffing_agency_staff: {
        Row: {
          agency_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staffing_agency_staff_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "staffing_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_alert_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          last_payload: Json
          last_triggered_at: string
          severity: string
          trigger_count: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          last_payload?: Json
          last_triggered_at?: string
          severity: string
          trigger_count?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          last_payload?: Json
          last_triggered_at?: string
          severity?: string
          trigger_count?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: []
      }
      staffing_api_telemetry: {
        Row: {
          created_at: string
          data_source: string | null
          endpoint: string
          error_code: string | null
          id: string
          latency_ms: number
          request_id: string
          status_code: number
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          endpoint: string
          error_code?: string | null
          id?: string
          latency_ms: number
          request_id: string
          status_code: number
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          endpoint?: string
          error_code?: string | null
          id?: string
          latency_ms?: number
          request_id?: string
          status_code?: number
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      staffing_overview_cache: {
        Row: {
          active_assignments: number
          active_staff: number
          agreements_pending: number
          credentials_expiring_30_days: number
          documents_pending_verification: number
          onboarding_in_progress: number
          pending_applications: number
          refreshed_at: string
          total_staff: number
          unique_roles: number
          venue_id: string
        }
        Insert: {
          active_assignments?: number
          active_staff?: number
          agreements_pending?: number
          credentials_expiring_30_days?: number
          documents_pending_verification?: number
          onboarding_in_progress?: number
          pending_applications?: number
          refreshed_at?: string
          total_staff?: number
          unique_roles?: number
          venue_id: string
        }
        Update: {
          active_assignments?: number
          active_staff?: number
          agreements_pending?: number
          credentials_expiring_30_days?: number
          documents_pending_verification?: number
          onboarding_in_progress?: number
          pending_applications?: number
          refreshed_at?: string
          total_staff?: number
          unique_roles?: number
          venue_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          status: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          event_id: string
          id: string
          labels: string[] | null
          org_id: string
          priority: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          event_id: string
          id?: string
          labels?: string[] | null
          org_id: string
          priority?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          event_id?: string
          id?: string
          labels?: string[] | null
          org_id?: string
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_communications: {
        Row: {
          acknowledged_by: string[]
          adhoc_venue_id: string | null
          content: string
          created_at: string
          id: string
          message_type: string
          priority: string
          read_by: string[]
          recipients: string[]
          requires_acknowledgment: boolean
          sender_id: string | null
          sent_at: string
          subject: string
          venue_id: string | null
        }
        Insert: {
          acknowledged_by?: string[]
          adhoc_venue_id?: string | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          priority?: string
          read_by?: string[]
          recipients?: string[]
          requires_acknowledgment?: boolean
          sender_id?: string | null
          sent_at?: string
          subject: string
          venue_id?: string | null
        }
        Update: {
          acknowledged_by?: string[]
          adhoc_venue_id?: string | null
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          priority?: string
          read_by?: string[]
          recipients?: string[]
          requires_acknowledgment?: boolean
          sender_id?: string | null
          sent_at?: string
          subject?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_communications_adhoc_venue_id_fkey"
            columns: ["adhoc_venue_id"]
            isOneToOne: false
            referencedRelation: "venues_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_communications_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_members: {
        Row: {
          joined_at: string
          left_at: string | null
          muted_until: string | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          left_at?: string | null
          muted_until?: string | null
          role?: string
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          left_at?: string | null
          muted_until?: string | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_campaigns: {
        Row: {
          applicable_ticket_types: string[] | null
          campaign_type: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          event_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          name: string
          start_date: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          applicable_ticket_types?: string[] | null
          campaign_type: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value?: number
          end_date: string
          event_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name: string
          start_date: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          applicable_ticket_types?: string[] | null
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          event_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string
          start_date?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sales: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_user_id: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          discount_amount: number
          event_id: string
          id: string
          metadata: Json
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          promo_code_id: string | null
          quantity: number
          ticket_type_id: string
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_user_id?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          discount_amount?: number
          event_id: string
          id?: string
          metadata?: Json
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          promo_code_id?: string | null
          quantity?: number
          ticket_type_id: string
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_user_id?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          discount_amount?: number
          event_id?: string
          id?: string
          metadata?: Json
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          promo_code_id?: string | null
          quantity?: number
          ticket_type_id?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ticket_sales_promo_code"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          age_restriction: number | null
          benefits: string[] | null
          category: string
          created_at: string
          description: string | null
          event_id: string
          featured: boolean
          id: string
          is_active: boolean
          is_transferable: boolean
          max_per_customer: number | null
          metadata: Json
          name: string
          price: number
          priority_order: number
          quantity_available: number
          quantity_sold: number
          refund_policy: string | null
          requires_id: boolean
          sale_end: string | null
          sale_start: string | null
          seating_section: string | null
          ticket_code: string | null
          transfer_fee: number
          updated_at: string
        }
        Insert: {
          age_restriction?: number | null
          benefits?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          event_id: string
          featured?: boolean
          id?: string
          is_active?: boolean
          is_transferable?: boolean
          max_per_customer?: number | null
          metadata?: Json
          name: string
          price?: number
          priority_order?: number
          quantity_available: number
          quantity_sold?: number
          refund_policy?: string | null
          requires_id?: boolean
          sale_end?: string | null
          sale_start?: string | null
          seating_section?: string | null
          ticket_code?: string | null
          transfer_fee?: number
          updated_at?: string
        }
        Update: {
          age_restriction?: number | null
          benefits?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          event_id?: string
          featured?: boolean
          id?: string
          is_active?: boolean
          is_transferable?: boolean
          max_per_customer?: number | null
          metadata?: Json
          name?: string
          price?: number
          priority_order?: number
          quantity_available?: number
          quantity_sold?: number
          refund_policy?: string | null
          requires_id?: boolean
          sale_end?: string | null
          sale_start?: string | null
          seating_section?: string | null
          ticket_code?: string | null
          transfer_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_artists: {
        Row: {
          artist_name: string | null
          artist_user_id: string | null
          created_at: string
          id: string
          role: string | null
          tour_id: string
        }
        Insert: {
          artist_name?: string | null
          artist_user_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          tour_id: string
        }
        Update: {
          artist_name?: string | null
          artist_user_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_artists_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_collaboration_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          channel: string
          created_at: string
          delivery_error: string | null
          delivery_metadata: Json
          delivery_status: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_phone: string | null
          invited_user_id: string | null
          org_id: string
          role: string
          status: string
          token_hash: string
          tour_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          channel: string
          created_at?: string
          delivery_error?: string | null
          delivery_metadata?: Json
          delivery_status?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_phone?: string | null
          invited_user_id?: string | null
          org_id: string
          role?: string
          status?: string
          token_hash: string
          tour_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          channel?: string
          created_at?: string
          delivery_error?: string | null
          delivery_metadata?: Json
          delivery_status?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_phone?: string | null
          invited_user_id?: string | null
          org_id?: string
          role?: string
          status?: string
          token_hash?: string
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_collaboration_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_collaboration_invitations_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_events: {
        Row: {
          advance_status: string
          created_at: string
          event_id: string
          id: string
          is_primary: boolean
          leg_name: string | null
          market: string | null
          ordinal: number | null
          routing_notes: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          advance_status?: string
          created_at?: string
          event_id: string
          id?: string
          is_primary?: boolean
          leg_name?: string | null
          market?: string | null
          ordinal?: number | null
          routing_notes?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          advance_status?: string
          created_at?: string
          event_id?: string
          id?: string
          is_primary?: boolean
          leg_name?: string | null
          market?: string | null
          ordinal?: number | null
          routing_notes?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_events_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_team_members: {
        Row: {
          arrival_date: string | null
          assigned_at: string
          assigned_by: string | null
          created_at: string
          departure_date: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          profile: Json | null
          responsibilities: string | null
          role: string | null
          role_in_team: string | null
          status: string
          team_id: string
          tour_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          arrival_date?: string | null
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          departure_date?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          profile?: Json | null
          responsibilities?: string | null
          role?: string | null
          role_in_team?: string | null
          status?: string
          team_id: string
          tour_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          arrival_date?: string | null
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          departure_date?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          profile?: Json | null
          responsibilities?: string | null
          role?: string | null
          role_in_team?: string | null
          status?: string
          team_id?: string
          tour_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "tour_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_team_members_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          role: string
          team_type: string
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          role: string
          team_type: string
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          role?: string
          team_type?: string
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_teams_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_vendors: {
        Row: {
          contact: Json | null
          contract_amount: number | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_status: string
          service_type: string | null
          services: string[]
          status: string
          tour_id: string
          updated_at: string
          vendor_account_id: string | null
          vendor_name: string | null
        }
        Insert: {
          contact?: Json | null
          contract_amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          service_type?: string | null
          services?: string[]
          status?: string
          tour_id: string
          updated_at?: string
          vendor_account_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          contact?: Json | null
          contract_amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          service_type?: string | null
          services?: string[]
          status?: string
          tour_id?: string
          updated_at?: string
          vendor_account_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_vendors_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          accommodation: string | null
          artist_id: string | null
          calendar_token: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          crew_size: number | null
          description: string | null
          end_date: string | null
          equipment_requirements: string | null
          expenses: number | null
          global_search_vector: unknown | null
          id: string
          name: string
          org_id: string | null
          revenue: number | null
          settings: Json
          slug: string | null
          start_date: string | null
          status: string | null
          transportation: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accommodation?: string | null
          artist_id?: string | null
          calendar_token?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_size?: number | null
          description?: string | null
          end_date?: string | null
          equipment_requirements?: string | null
          expenses?: number | null
          global_search_vector?: unknown | null
          id?: string
          name: string
          org_id?: string | null
          revenue?: number | null
          settings?: Json
          slug?: string | null
          start_date?: string | null
          status?: string | null
          transportation?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accommodation?: string | null
          artist_id?: string | null
          calendar_token?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_size?: number | null
          description?: string | null
          end_date?: string | null
          equipment_requirements?: string | null
          expenses?: number | null
          global_search_vector?: unknown | null
          id?: string
          name?: string
          org_id?: string | null
          revenue?: number | null
          settings?: Json
          slug?: string | null
          start_date?: string | null
          status?: string | null
          transportation?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "entities_individuals"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "tours_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "friend_suggestions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transportation_passenger_assignments: {
        Row: {
          created_at: string | null
          dropoff_instructions: string | null
          dropoff_time: string | null
          group_member_id: string
          id: string
          luggage_count: number | null
          pickup_confirmed: boolean | null
          pickup_instructions: string | null
          pickup_time: string | null
          special_assistance: boolean | null
          status: string | null
          transportation_id: string
          updated_at: string | null
          wheelchair_required: boolean | null
        }
        Insert: {
          created_at?: string | null
          dropoff_instructions?: string | null
          dropoff_time?: string | null
          group_member_id: string
          id?: string
          luggage_count?: number | null
          pickup_confirmed?: boolean | null
          pickup_instructions?: string | null
          pickup_time?: string | null
          special_assistance?: boolean | null
          status?: string | null
          transportation_id: string
          updated_at?: string | null
          wheelchair_required?: boolean | null
        }
        Update: {
          created_at?: string | null
          dropoff_instructions?: string | null
          dropoff_time?: string | null
          group_member_id?: string
          id?: string
          luggage_count?: number | null
          pickup_confirmed?: boolean | null
          pickup_instructions?: string | null
          pickup_time?: string | null
          special_assistance?: boolean | null
          status?: string | null
          transportation_id?: string
          updated_at?: string | null
          wheelchair_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "transportation_passenger_assignments_group_member_id_fkey"
            columns: ["group_member_id"]
            isOneToOne: false
            referencedRelation: "travel_group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportation_passenger_assignments_transportation_id_fkey"
            columns: ["transportation_id"]
            isOneToOne: false
            referencedRelation: "ground_transportation_coordination"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_coordination_timeline: {
        Row: {
          affected_members: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          entry_type: string
          event_id: string | null
          group_id: string | null
          id: string
          location: string | null
          location_details: string | null
          start_time: string
          status: string | null
          timezone: string | null
          title: string
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          affected_members?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          entry_type: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          location_details?: string | null
          start_time: string
          status?: string | null
          timezone?: string | null
          title: string
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_members?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          entry_type?: string
          event_id?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          location_details?: string | null
          start_time?: string
          status?: string | null
          timezone?: string | null
          title?: string
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_coordination_timeline_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_coordination_timeline_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "travel_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_coordination_timeline_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_group_members: {
        Row: {
          actual_arrival_time: string | null
          actual_departure_time: string | null
          check_in_status: string | null
          created_at: string | null
          group_id: string
          id: string
          meal_preference: string | null
          member_email: string | null
          member_name: string
          member_phone: string | null
          member_role: string | null
          mobility_assistance: boolean | null
          seat_preference: string | null
          special_assistance: boolean | null
          status: string | null
          team_member_id: string | null
          updated_at: string | null
          user_id: string | null
          wheelchair_required: boolean | null
        }
        Insert: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          check_in_status?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          meal_preference?: string | null
          member_email?: string | null
          member_name: string
          member_phone?: string | null
          member_role?: string | null
          mobility_assistance?: boolean | null
          seat_preference?: string | null
          special_assistance?: boolean | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          wheelchair_required?: boolean | null
        }
        Update: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          check_in_status?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          meal_preference?: string | null
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          member_role?: string | null
          mobility_assistance?: boolean | null
          seat_preference?: string | null
          special_assistance?: boolean | null
          status?: string | null
          team_member_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          wheelchair_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "travel_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_group_members_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "venue_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_groups: {
        Row: {
          accessibility_needs: string[] | null
          arrival_date: string | null
          arrival_location: string | null
          backup_contact_id: string | null
          confirmed_members: number | null
          coordination_status: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          departure_date: string | null
          departure_location: string | null
          description: string | null
          dietary_restrictions: string[] | null
          event_id: string | null
          group_leader_id: string | null
          group_type: string
          id: string
          name: string
          priority_level: number | null
          special_requirements: string[] | null
          status: string | null
          total_members: number | null
          tour_id: string | null
          updated_at: string | null
        }
        Insert: {
          accessibility_needs?: string[] | null
          arrival_date?: string | null
          arrival_location?: string | null
          backup_contact_id?: string | null
          confirmed_members?: number | null
          coordination_status?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          departure_date?: string | null
          departure_location?: string | null
          description?: string | null
          dietary_restrictions?: string[] | null
          event_id?: string | null
          group_leader_id?: string | null
          group_type: string
          id?: string
          name: string
          priority_level?: number | null
          special_requirements?: string[] | null
          status?: string | null
          total_members?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accessibility_needs?: string[] | null
          arrival_date?: string | null
          arrival_location?: string | null
          backup_contact_id?: string | null
          confirmed_members?: number | null
          coordination_status?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          departure_date?: string | null
          departure_location?: string | null
          description?: string | null
          dietary_restrictions?: string[] | null
          event_id?: string | null
          group_leader_id?: string | null
          group_type?: string
          id?: string
          name?: string
          priority_level?: number | null
          special_requirements?: string[] | null
          status?: string | null
          total_members?: number | null
          tour_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_groups_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          is_completed: boolean
          metadata: Json
          progress_data: Json
          progress_percentage: number
          related_collaboration_id: string | null
          related_event_id: string | null
          related_project_id: string | null
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          metadata?: Json
          progress_data?: Json
          progress_percentage?: number
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          is_completed?: boolean
          metadata?: Json
          progress_data?: Json
          progress_percentage?: number
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_profiles: {
        Row: {
          active_profile_type: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_profile_type?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_profile_type?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          granted_reason: string | null
          id: string
          is_active: boolean
          metadata: Json
          related_collaboration_id: string | null
          related_event_id: string | null
          related_project_id: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          granted_reason?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          granted_reason?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          related_collaboration_id?: string | null
          related_event_id?: string | null
          related_project_id?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_music_library: {
        Row: {
          buyer_user_id: string
          created_at: string
          entitlement_id: string | null
          id: string
          listing_id: string | null
          music_track_id: string
          order_item_id: string | null
          seller_user_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          buyer_user_id: string
          created_at?: string
          entitlement_id?: string | null
          id?: string
          listing_id?: string | null
          music_track_id: string
          order_item_id?: string | null
          seller_user_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          buyer_user_id?: string
          created_at?: string
          entitlement_id?: string | null
          id?: string
          listing_id?: string | null
          music_track_id?: string
          order_item_id?: string | null
          seller_user_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_music_library_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "marketplace_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_library_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_library_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_library_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_music_library_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_opportunity_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_opportunity_interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_featured_tracks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          library_item_id: string | null
          music_track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          library_item_id?: string | null
          music_track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          library_item_id?: string | null
          music_track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_featured_tracks_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "user_music_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_featured_tracks_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "artist_music"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_featured_tracks_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reward_wallets: {
        Row: {
          tier: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          tier?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          tier?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venue_analytics: {
        Row: {
          average_rating: number | null
          booking_requests: number | null
          bookings_confirmed: number | null
          created_at: string | null
          date: string
          events_hosted: number | null
          id: string
          page_views: number | null
          revenue: number | null
          unique_visitors: number | null
          venue_id: string
        }
        Insert: {
          average_rating?: number | null
          booking_requests?: number | null
          bookings_confirmed?: number | null
          created_at?: string | null
          date: string
          events_hosted?: number | null
          id?: string
          page_views?: number | null
          revenue?: number | null
          unique_visitors?: number | null
          venue_id: string
        }
        Update: {
          average_rating?: number | null
          booking_requests?: number | null
          bookings_confirmed?: number | null
          created_at?: string | null
          date?: string
          events_hosted?: number | null
          id?: string
          page_views?: number | null
          revenue?: number | null
          unique_visitors?: number | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_analytics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_analytics_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_availability: {
        Row: {
          blocked_reason: string | null
          booking_id: string | null
          created_at: string | null
          date: string
          event_id: string | null
          id: string
          is_available: boolean | null
          notes: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          blocked_reason?: string | null
          booking_id?: string | null
          created_at?: string | null
          date: string
          event_id?: string | null
          id?: string
          is_available?: boolean | null
          notes?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          blocked_reason?: string | null
          booking_id?: string | null
          created_at?: string | null
          date?: string
          event_id?: string | null
          id?: string
          is_available?: boolean | null
          notes?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_availability_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "venue_booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_availability_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_availability_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_availability_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_booking_requests: {
        Row: {
          budget_range: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_duration: number
          event_name: string
          event_type: string
          expected_attendance: number | null
          genre: string | null
          id: string
          requested_at: string | null
          requester_id: string
          responded_at: string | null
          response_message: string | null
          slot_id: string | null
          special_requirements: string | null
          status: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          budget_range?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_duration: number
          event_name: string
          event_type: string
          expected_attendance?: number | null
          genre?: string | null
          id?: string
          requested_at?: string | null
          requester_id: string
          responded_at?: string | null
          response_message?: string | null
          slot_id?: string | null
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          budget_range?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_duration?: number
          event_name?: string
          event_type?: string
          expected_attendance?: number | null
          genre?: string | null
          id?: string
          requested_at?: string | null
          requester_id?: string
          responded_at?: string | null
          response_message?: string | null
          slot_id?: string | null
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_booking_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "venue_booking_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_booking_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_booking_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_booking_slots: {
        Row: {
          booked_request_id: string | null
          created_at: string | null
          event_id: string | null
          id: string
          slot_end: string
          slot_start: string
          status: string
          template_id: string | null
          venue_id: string
        }
        Insert: {
          booked_request_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          slot_end: string
          slot_start: string
          status?: string
          template_id?: string | null
          venue_id: string
        }
        Update: {
          booked_request_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          slot_end?: string
          slot_start?: string
          status?: string
          template_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_booking_slots_booked_request_id_fkey"
            columns: ["booked_request_id"]
            isOneToOne: false
            referencedRelation: "venue_booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_booking_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_booking_slots_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "venue_recurring_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_booking_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_booking_slots_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string
          file_size: number | null
          file_url: string
          id: string
          is_public: boolean | null
          mime_type: string | null
          name: string
          updated_at: string | null
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type: string
          file_size?: number | null
          file_url: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name: string
          updated_at?: string | null
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          name?: string
          updated_at?: string | null
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_documents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_documents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_equipment: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          is_available_for_rent: boolean | null
          last_maintenance_date: string | null
          name: string
          purchase_date: string | null
          quantity: number | null
          rental_price: number | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available_for_rent?: boolean | null
          last_maintenance_date?: string | null
          name: string
          purchase_date?: string | null
          quantity?: number | null
          rental_price?: number | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available_for_rent?: boolean | null
          last_maintenance_date?: string | null
          name?: string
          purchase_date?: string | null
          quantity?: number | null
          rental_price?: number | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_equipment_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_equipment_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_kit_settings: {
        Row: {
          created_at: string
          custom_domain: string | null
          id: string
          is_public: boolean
          seo_description: string | null
          seo_title: string | null
          settings: Json
          template: string
          theme: string
          updated_at: string
          use_vk_style_on_profile: boolean
          user_id: string
          venue_profile_id: string | null
          vk_slug: string | null
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_public?: boolean
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json
          template?: string
          theme?: string
          updated_at?: string
          use_vk_style_on_profile?: boolean
          user_id: string
          venue_profile_id?: string | null
          vk_slug?: string | null
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_public?: boolean
          seo_description?: string | null
          seo_title?: string | null
          settings?: Json
          template?: string
          theme?: string
          updated_at?: string
          use_vk_style_on_profile?: boolean
          user_id?: string
          venue_profile_id?: string | null
          vk_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_kit_settings_venue_profile_id_fkey"
            columns: ["venue_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_kit_settings_venue_profile_id_fkey"
            columns: ["venue_profile_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_permissions: {
        Row: {
          created_at: string | null
          id: string
          is_system_permission: boolean | null
          permission_category: string | null
          permission_description: string | null
          permission_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system_permission?: boolean | null
          permission_category?: string | null
          permission_description?: string | null
          permission_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system_permission?: boolean | null
          permission_category?: string | null
          permission_description?: string | null
          permission_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      venue_pricing: {
        Row: {
          additional_fees: Json | null
          base_price: number
          created_at: string | null
          description: string | null
          id: string
          included_services: string[] | null
          is_active: boolean | null
          maximum_capacity: number | null
          minimum_hours: number | null
          package_name: string
          price_per_hour: number | null
          price_per_person: number | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          additional_fees?: Json | null
          base_price: number
          created_at?: string | null
          description?: string | null
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          maximum_capacity?: number | null
          minimum_hours?: number | null
          package_name: string
          price_per_hour?: number | null
          price_per_person?: number | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          additional_fees?: Json | null
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          included_services?: string[] | null
          is_active?: boolean | null
          maximum_capacity?: number | null
          minimum_hours?: number | null
          package_name?: string
          price_per_hour?: number | null
          price_per_person?: number | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_pricing_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_pricing_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_profiles: {
        Row: {
          address: string | null
          age_restrictions: string | null
          amenities: string[] | null
          capacity: number | null
          capacity_seated: number | null
          capacity_standing: number | null
          capacity_total: number | null
          city: string | null
          country: string | null
          created_at: string
          curfew: string | null
          description: string | null
          global_search_vector: unknown | null
          green_rooms: number | null
          id: string
          is_public: boolean | null
          keywords: string[] | null
          lighting_rig: string | null
          loading_dock: boolean | null
          meta_description: string | null
          neighborhood: string | null
          operating_hours: Json | null
          parking_spots: number | null
          profile_completion: number | null
          sound_system: string | null
          stage_dimensions: string | null
          stage_plot_url: string | null
          state: string | null
          tagline: string | null
          tech_rider_url: string | null
          updated_at: string
          url_slug: string | null
          user_id: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          age_restrictions?: string | null
          amenities?: string[] | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          capacity_total?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          curfew?: string | null
          description?: string | null
          global_search_vector?: unknown | null
          green_rooms?: number | null
          id?: string
          is_public?: boolean | null
          keywords?: string[] | null
          lighting_rig?: string | null
          loading_dock?: boolean | null
          meta_description?: string | null
          neighborhood?: string | null
          operating_hours?: Json | null
          parking_spots?: number | null
          profile_completion?: number | null
          sound_system?: string | null
          stage_dimensions?: string | null
          stage_plot_url?: string | null
          state?: string | null
          tagline?: string | null
          tech_rider_url?: string | null
          updated_at?: string
          url_slug?: string | null
          user_id: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          age_restrictions?: string | null
          amenities?: string[] | null
          capacity?: number | null
          capacity_seated?: number | null
          capacity_standing?: number | null
          capacity_total?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          curfew?: string | null
          description?: string | null
          global_search_vector?: unknown | null
          green_rooms?: number | null
          id?: string
          is_public?: boolean | null
          keywords?: string[] | null
          lighting_rig?: string | null
          loading_dock?: boolean | null
          meta_description?: string | null
          neighborhood?: string | null
          operating_hours?: Json | null
          parking_spots?: number | null
          profile_completion?: number | null
          sound_system?: string | null
          stage_dimensions?: string | null
          stage_plot_url?: string | null
          state?: string | null
          tagline?: string | null
          tech_rider_url?: string | null
          updated_at?: string
          url_slug?: string | null
          user_id?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      venue_recurring_shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          end_time: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          location: string | null
          recurrence_pattern: Json
          role_required: string | null
          shift_description: string | null
          shift_title: string
          staff_needed: number | null
          start_time: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          recurrence_pattern: Json
          role_required?: string | null
          shift_description?: string | null
          shift_title: string
          staff_needed?: number | null
          start_time?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          end_time?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          recurrence_pattern?: Json
          role_required?: string | null
          shift_description?: string | null
          shift_title?: string
          staff_needed?: number | null
          start_time?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_recurring_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_recurring_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_recurring_templates: {
        Row: {
          capacity: number | null
          created_at: string | null
          duration_minutes: number
          end_date: string | null
          genre: string | null
          id: string
          is_active: boolean | null
          start_date: string
          start_time: string
          title: string
          updated_at: string | null
          venue_id: string
          weekday: number
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          duration_minutes?: number
          end_date?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          start_date: string
          start_time: string
          title: string
          updated_at?: string | null
          venue_id: string
          weekday: number
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          duration_minutes?: number
          end_date?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          venue_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_recurring_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_recurring_templates_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          event_id: string | null
          id: string
          is_verified: boolean | null
          rating: number
          responded_at: string | null
          response_from_venue: string | null
          reviewer_id: string
          title: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_verified?: boolean | null
          rating: number
          responded_at?: string | null
          response_from_venue?: string | null
          reviewer_id: string
          title?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number
          responded_at?: string | null
          response_from_venue?: string | null
          reviewer_id?: string
          title?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_role_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "venue_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "venue_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          role_description: string | null
          role_level: number | null
          role_name: string
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_description?: string | null
          role_level?: number | null
          role_name: string
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_description?: string | null
          role_level?: number | null
          role_name?: string
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_shift_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assignment_status: string | null
          confirmed_at: string | null
          declined_at: string | null
          id: string
          shift_id: string
          staff_member_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          id?: string
          shift_id: string
          staff_member_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?: string | null
          confirmed_at?: string | null
          declined_at?: string | null
          id?: string
          shift_id?: string
          staff_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "venue_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          dress_code: string | null
          end_time: string
          event_id: string | null
          flat_rate: number | null
          hourly_rate: number | null
          id: string
          is_recurring: boolean | null
          location: string | null
          notes: string | null
          priority: string | null
          recurring_pattern: Json | null
          requirements: string[] | null
          role_required: string | null
          shift_date: string
          shift_description: string | null
          shift_status: string | null
          shift_title: string
          staff_assigned: number | null
          staff_needed: number | null
          start_time: string
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          dress_code?: string | null
          end_time: string
          event_id?: string | null
          flat_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          priority?: string | null
          recurring_pattern?: Json | null
          requirements?: string[] | null
          role_required?: string | null
          shift_date: string
          shift_description?: string | null
          shift_status?: string | null
          shift_title: string
          staff_assigned?: number | null
          staff_needed?: number | null
          start_time: string
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          dress_code?: string | null
          end_time?: string
          event_id?: string | null
          flat_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          notes?: string | null
          priority?: string | null
          recurring_pattern?: Json | null
          requirements?: string[] | null
          role_required?: string | null
          shift_date?: string
          shift_description?: string | null
          shift_status?: string | null
          shift_title?: string
          staff_assigned?: number | null
          staff_needed?: number | null
          start_time?: string
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_shifts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_social_integrations: {
        Row: {
          access_token: string | null
          account_handle: string
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync: string | null
          platform: string
          refresh_token: string | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          access_token?: string | null
          account_handle: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform: string
          refresh_token?: string | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          access_token?: string | null
          account_handle?: string
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync?: string | null
          platform?: string
          refresh_token?: string | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_social_integrations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_team_members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          permissions: Json | null
          role: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          permissions?: Json | null
          role: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          permissions?: Json | null
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_team_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "entities_venues"
            referencedColumns: ["entity_id"]
          },
          {
            foreignKeyName: "venue_team_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venue_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          account_id: string | null
          address: Json | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          account_id?: string | null
          address?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          account_id?: string | null
          address?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      venues_v2: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      vote_kind: {
        Row: {
          id: string
        }
        Insert: {
          id: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      work_mode_publication_audiences: {
        Row: {
          assigned_by: string | null
          created_at: string
          publication_id: string
          worker_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          publication_id: string
          worker_user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          publication_id?: string
          worker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_mode_publication_audiences_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "work_mode_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      work_mode_publications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          idempotency_key: string | null
          payload: Json
          publication_type: string
          published_at: string
          published_by: string | null
          site_map_id: string | null
          status: string
          title: string
          tour_id: string | null
          updated_at: string
          visible_to: string[]
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          publication_type: string
          published_at?: string
          published_by?: string | null
          site_map_id?: string | null
          status?: string
          title: string
          tour_id?: string | null
          updated_at?: string
          visible_to?: string[]
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          publication_type?: string
          published_at?: string
          published_by?: string | null
          site_map_id?: string | null
          status?: string
          title?: string
          tour_id?: string | null
          updated_at?: string
          visible_to?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "work_mode_publications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_mode_publications_site_map_id_fkey"
            columns: ["site_map_id"]
            isOneToOne: false
            referencedRelation: "site_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_mode_publications_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_onboarding_profiles: {
        Row: {
          created_at: string
          document_refs: Json
          profile_data: Json
          sensitive_envelope: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_refs?: Json
          profile_data?: Json
          sensitive_envelope?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_refs?: Json
          profile_data?: Json
          sensitive_envelope?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_events_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          thread_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          thread_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_audit_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workflow_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string | null
          executed_by: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
          template_id: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "equipment_setup_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          sender_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          sender_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          sender_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workflow_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_participants: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          permissions: string[]
          role: string
          status: string
          thread_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          permissions?: string[]
          role?: string
          status?: string
          thread_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          permissions?: string[]
          role?: string
          status?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workflow_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          dependency_task_ids: string[]
          description: string | null
          due_at: string | null
          id: string
          labels: string[]
          metadata: Json
          priority: string
          status: string
          thread_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_task_ids?: string[]
          description?: string | null
          due_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          priority?: string
          status?: string
          thread_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_task_ids?: string[]
          description?: string | null
          due_at?: string | null
          id?: string
          labels?: string[]
          metadata?: Json
          priority?: string
          status?: string
          thread_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "workflow_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          steps: Json
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          steps?: Json
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      workflow_threads: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          org_id: string | null
          scope_id: string
          scope_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          scope_id: string
          scope_type: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          org_id?: string | null
          scope_id?: string
          scope_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      workforce_channel_links: {
        Row: {
          channel_kind: string
          coordinator_thread_id: string
          created_at: string
          created_by: string | null
          employer_entity_id: string
          employer_entity_type: string
          id: string
          staff_member_id: string
          updated_at: string
        }
        Insert: {
          channel_kind?: string
          coordinator_thread_id: string
          created_at?: string
          created_by?: string | null
          employer_entity_id: string
          employer_entity_type: string
          id?: string
          staff_member_id: string
          updated_at?: string
        }
        Update: {
          channel_kind?: string
          coordinator_thread_id?: string
          created_at?: string
          created_by?: string | null
          employer_entity_id?: string
          employer_entity_type?: string
          id?: string
          staff_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_channel_links_coordinator_thread_id_fkey"
            columns: ["coordinator_thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_channel_links_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_channel_links_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "unified_staff_roster"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entities_all: {
        Row: {
          display_name: string | null
          entity_id: string | null
          entity_type: string | null
        }
        Relationships: []
      }
      entities_artists: {
        Row: {
          display_name: string | null
          entity_id: string | null
          entity_type: string | null
        }
        Insert: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Update: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Relationships: []
      }
      entities_individuals: {
        Row: {
          display_name: string | null
          entity_id: string | null
          entity_type: string | null
        }
        Insert: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Update: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Relationships: []
      }
      entities_venues: {
        Row: {
          display_name: string | null
          entity_id: string | null
          entity_type: string | null
        }
        Insert: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Update: {
          display_name?: never
          entity_id?: string | null
          entity_type?: never
        }
        Relationships: []
      }
      forum_threads_hot_mv: {
        Row: {
          comments_count: number | null
          created_at: string | null
          forum_id: string | null
          hot_score: number | null
          id: string | null
          kind: string | null
          score: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_v2_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_v2_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "post_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads_top_mv: {
        Row: {
          comments_count: number | null
          created_at: string | null
          forum_id: string | null
          id: string | null
          kind: string | null
          score: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_v2_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_v2_kind_fkey"
            columns: ["kind"]
            isOneToOne: false
            referencedRelation: "post_kind"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_suggestions_view: {
        Row: {
          avatar_url: string | null
          base_relevance_score: number | null
          bio: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          location: string | null
          metadata: Json | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_relevance_score?: never
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          metadata?: Json | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_relevance_score?: never
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          location?: string | null
          metadata?: Json | null
          username?: string | null
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          access_mode: string | null
          allow_downloads: boolean | null
          allow_library_add: boolean | null
          allow_profile_feature: boolean | null
          artist_avatar_url: string | null
          artist_name: string | null
          artist_profile_id: string | null
          artist_username: string | null
          comments_count: number | null
          cover_art_url: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          file_url: string | null
          genre: string | null
          id: string | null
          is_public: boolean | null
          is_visible: boolean | null
          likes_count: number | null
          metadata: Json | null
          moderation_status: string | null
          play_count: number | null
          preview_duration_seconds: number | null
          preview_file_url: string | null
          preview_mode: string | null
          release_date: string | null
          rights_confirmed: boolean | null
          shares_count: number | null
          stats: Json | null
          tags: string[] | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_music_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_music_artist_profile_id_fkey"
            columns: ["artist_profile_id"]
            isOneToOne: false
            referencedRelation: "entities_artists"
            referencedColumns: ["entity_id"]
          },
        ]
      }
      unified_staff_roster: {
        Row: {
          created_at: string | null
          email: string | null
          entity_id: string | null
          entity_type: string | null
          full_name: string | null
          id: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          entity_type?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entity_id?: string | null
          entity_type?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      work_hub_integrity_issues: {
        Row: {
          employer_entity_id: string | null
          employer_entity_type: string | null
          issue_code: string | null
          source_id: string | null
          worker_user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _tourify_has_columns: {
        Args: { p_table_name: string; p_column_names: string[] }
        Returns: boolean
      }
      accept_tour_collaboration_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          tour_id: string
          invitation_id: string
          already_accepted: boolean
        }[]
      }
      can_access_tour: {
        Args: { p_tour_id: string }
        Returns: boolean
      }
      can_edit_site_map: {
        Args: { site_map_uuid: string; user_uuid?: string }
        Returns: boolean
      }
      can_manage_event_hq: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_manage_hiring: {
        Args: { p_user_id: string; p_entity_type: string; p_entity_id: string }
        Returns: boolean
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_orphaned_artist_files: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      compute_hot_score: {
        Args: { score: number; ts: string }
        Returns: number
      }
      create_map_version: {
        Args: {
          site_map_uuid: string
          version_name: string
          description?: string
        }
        Returns: string
      }
      create_organizer_account: {
        Args: {
          p_user_id: string
          p_organization_name: string
          p_organization_type?: string
          p_description?: string
          p_contact_info?: Json
          p_social_links?: Json
          p_specialties?: string[]
          p_subtype?: string
          p_url_slug?: string
        }
        Returns: string
      }
      create_tour_quick_start_events: {
        Args: { p_tour_id: string; p_count: number; p_batch_id: string }
        Returns: {
          event_id: string
          label: string
          ordinal: number
          created: boolean
        }[]
      }
      ensure_workforce_coordinator_channel: {
        Args: { p_staff_member_id: string }
        Returns: string
      }
      extract_hashtags_from_content: {
        Args: { content_text: string }
        Returns: string[]
      }
      generate_equipment_qr_code: {
        Args: { equipment_instance_uuid: string }
        Returns: string
      }
      generate_slots_for_template: {
        Args: { p_template_id: string; p_from: string; p_to: string }
        Returns: number
      }
      generate_unique_username: {
        Args: { base_username: string; target_user_id: string }
        Returns: string
      }
      get_album_photos: {
        Args: { album_uuid: string }
        Returns: {
          id: string
          title: string
          description: string
          preview_url: string
          thumbnail_url: string
          dimensions: Json
          likes: number
          views: number
          is_for_sale: boolean
          sale_price: number
          order_index: number
          created_at: string
        }[]
      }
      get_artist_storage_stats: {
        Args: { user_id: string }
        Returns: {
          music_files_count: number
          music_total_size: number
          photo_files_count: number
          photo_total_size: number
        }[]
      }
      get_collaboration_stats: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_profile_with_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_project_stats: {
        Args: { project_uuid: string }
        Returns: Json
      }
      get_purchased_photos: {
        Args: { user_uuid: string }
        Returns: {
          photo_id: string
          title: string
          full_res_url: string
          download_url: string
          download_expires_at: string
          download_count: number
          max_downloads: number
          license_type: string
          purchased_at: string
        }[]
      }
      get_site_map_with_data: {
        Args: { site_map_uuid: string }
        Returns: Json
      }
      get_tent_availability: {
        Args: { site_map_uuid: string; check_date?: string }
        Returns: {
          tent_id: string
          tent_number: string
          tent_type: string
          status: string
          is_available: boolean
        }[]
      }
      get_venue_dashboard_stats: {
        Args: { p_venue_id: string }
        Returns: Json
      }
      get_venue_image_url: {
        Args: { p_user_id: string; p_image_name: string }
        Returns: string
      }
      has_admin_logistics_scope: {
        Args: { p_event_id: string; p_tour_id: string; p_capability: string }
        Returns: boolean
      }
      has_entity_permission: {
        Args: {
          p_user_id: string
          p_entity_type: string
          p_entity_id: string
          p_permission_name: string
        }
        Returns: boolean
      }
      has_perm: {
        Args: { uid: string; oid: string; perm: string }
        Returns: boolean
      }
      has_project_permission: {
        Args: {
          project_uuid: string
          user_uuid: string
          permission_name: string
        }
        Returns: boolean
      }
      increment_job_posting_views: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      is_confirmed_tour_team_member: {
        Args: { p_tour_id: string }
        Returns: boolean
      }
      is_event_team_member: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { uid: string; oid: string }
        Returns: boolean
      }
      is_tour_owner: {
        Args: { p_tour_id: string }
        Returns: boolean
      }
      is_tour_team_member: {
        Args: { p_tour_id: string }
        Returns: boolean
      }
      is_travel_group_member: {
        Args: { p_group_id: string }
        Returns: boolean
      }
      is_valid_image_type: {
        Args: { mime_type: string }
        Returns: boolean
      }
      is_valid_music_type: {
        Args: { mime_type: string }
        Returns: boolean
      }
      lookup_profile_id_by_username: {
        Args: { p_username: string }
        Returns: string
      }
      notify_contract_counterparty: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      publish_admin_tour: {
        Args: { p_org_id: string; p_tour_id: string; p_actor_user_id: string }
        Returns: {
          tour_id: string
          status: string
          published_event_count: number
          published_at: string
        }[]
      }
      reconcile_admin_tour_events: {
        Args: { p_org_id: string; p_tour_id: string; p_links: Json }
        Returns: {
          advance_status: string
          created_at: string
          event_id: string
          id: string
          is_primary: boolean
          leg_name: string | null
          market: string | null
          ordinal: number | null
          routing_notes: string | null
          tour_id: string
          updated_at: string
        }[]
      }
      refresh_account_display_info: {
        Args: { account_id: string }
        Returns: boolean
      }
      refresh_forum_mviews: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_staffing_overview_cache: {
        Args: { p_venue_id: string }
        Returns: undefined
      }
      reserve_admin_logistics_equipment: {
        Args: {
          p_org_id: string
          p_task_id: string
          p_equipment_asset_id: string
          p_start_time?: string
          p_end_time?: string
          p_quantity?: number
          p_actor_user_id?: string
        }
        Returns: {
          created_at: string | null
          end_time: string | null
          equipment_asset_id: string
          id: string
          quantity: number
          start_time: string | null
          task_id: string
        }
      }
      respond_to_booking_request: {
        Args: {
          p_request_id: string
          p_status: string
          p_response_message?: string
        }
        Returns: boolean
      }
      respond_to_work_assignment: {
        Args: { p_assignment_id: string; p_action: string }
        Returns: Json
      }
      send_artist_contract: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      should_send_notification: {
        Args: {
          p_user_id: string
          p_notification_type: string
          p_priority?: string
        }
        Returns: boolean
      }
      sign_artist_contract: {
        Args: {
          p_contract_id: string
          p_signer_role: string
          p_legal_name: string
        }
        Returns: undefined
      }
      slugify_org_name: {
        Args: { p_name: string }
        Returns: string
      }
      staffing_overview_counts: {
        Args: { p_venue_id: string }
        Returns: {
          total_staff: number
          active_staff: number
          pending_applications: number
          onboarding_in_progress: number
          documents_pending_verification: number
          credentials_expiring_30_days: number
          active_assignments: number
          unique_roles: number
        }[]
      }
      test_music_upload_permissions: {
        Args: { user_id: string; file_path: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

