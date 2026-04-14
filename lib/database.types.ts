export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 