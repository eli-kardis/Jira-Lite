export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ENUM 타입들
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED'
export type IssuePriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type AuthProvider = 'email' | 'google'
export type NotificationType =
  | 'ISSUE_ASSIGNED'
  | 'COMMENT'
  | 'DUE_DATE_SOON'
  | 'DUE_DATE_TODAY'
  | 'TEAM_INVITE'
  | 'ROLE_CHANGED'
export type ActivityLogType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'PROJECT_CREATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_ARCHIVED'
  | 'TEAM_UPDATED'
export type AICacheType = 'summary' | 'suggestion' | 'comment_summary'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          profile_image: string | null
          auth_provider: AuthProvider
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          email: string
          name: string
          profile_image?: string | null
          auth_provider?: AuthProvider
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          profile_image?: string | null
          auth_provider?: AuthProvider
          created_at?: string
          deleted_at?: string | null
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          deleted_at?: string | null
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: TeamRole
          joined_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: TeamRole
          joined_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: TeamRole
          joined_at?: string
          deleted_at?: string | null
        }
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          email: string
          invited_by: string
          status: InvitationStatus
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          invited_by: string
          status?: InvitationStatus
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          invited_by?: string
          status?: InvitationStatus
          expires_at?: string
          created_at?: string
        }
      }
      team_activity_logs: {
        Row: {
          id: string
          team_id: string
          user_id: string
          activity_type: ActivityLogType
          target_user_id: string | null
          target_project_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          activity_type: ActivityLogType
          target_user_id?: string | null
          target_project_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          activity_type?: ActivityLogType
          target_user_id?: string | null
          target_project_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string | null
          owner_id: string
          archived_at: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          description?: string | null
          owner_id: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          description?: string | null
          owner_id?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
        }
      }
      project_favorites: {
        Row: {
          id: string
          project_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          created_at?: string
        }
      }
      project_statuses: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string | null
          position: number
          is_default: boolean
          wip_limit: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color?: string | null
          position?: number
          is_default?: boolean
          wip_limit?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string | null
          position?: number
          is_default?: boolean
          wip_limit?: number | null
          created_at?: string
        }
      }
      labels: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string
          created_at?: string
        }
      }
      issues: {
        Row: {
          id: string
          project_id: string
          status_id: string
          title: string
          description: string | null
          priority: IssuePriority
          assignee_id: string | null
          owner_id: string
          due_date: string | null
          position: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          status_id: string
          title: string
          description?: string | null
          priority?: IssuePriority
          assignee_id?: string | null
          owner_id: string
          due_date?: string | null
          position?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          status_id?: string
          title?: string
          description?: string | null
          priority?: IssuePriority
          assignee_id?: string | null
          owner_id?: string
          due_date?: string | null
          position?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      issue_labels: {
        Row: {
          id: string
          issue_id: string
          label_id: string
        }
        Insert: {
          id?: string
          issue_id: string
          label_id: string
        }
        Update: {
          id?: string
          issue_id?: string
          label_id?: string
        }
      }
      subtasks: {
        Row: {
          id: string
          issue_id: string
          title: string
          is_completed: boolean
          position: number
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          issue_id: string
          title: string
          is_completed?: boolean
          position?: number
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          issue_id?: string
          title?: string
          is_completed?: boolean
          position?: number
          created_at?: string
          deleted_at?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      issue_history: {
        Row: {
          id: string
          issue_id: string
          user_id: string
          field_name: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          user_id: string
          field_name: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          user_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string | null
          link: string | null
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message?: string | null
          link?: string | null
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string | null
          link?: string | null
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      ai_cache: {
        Row: {
          id: string
          issue_id: string
          cache_type: AICacheType
          content: string
          content_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          issue_id: string
          cache_type: AICacheType
          content: string
          content_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          issue_id?: string
          cache_type?: AICacheType
          content?: string
          content_hash?: string
          created_at?: string
        }
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string
          minute_key: string
          day_key: string
          minute_count: number
          day_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          minute_key: string
          day_key: string
          minute_count?: number
          day_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          minute_key?: string
          day_key?: string
          minute_count?: number
          day_count?: number
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
      team_role: TeamRole
      invitation_status: InvitationStatus
      issue_priority: IssuePriority
      auth_provider: AuthProvider
      notification_type: NotificationType
      activity_log_type: ActivityLogType
      ai_cache_type: AICacheType
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
