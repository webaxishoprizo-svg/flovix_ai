export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_issues: {
        Row: {
          admin_deep_link: string | null
          audit_id: string
          category: string
          created_at: string
          description: string | null
          evidence: Json | null
          fix_prompt: string | null
          fix_steps: Json | null
          fixed_at: string | null
          id: string
          location: string | null
          priority: string | null
          revenue_impact_usd: number | null
          severity: string
          status: string
          store_id: string
          template_code: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_deep_link?: string | null
          audit_id: string
          category: string
          created_at?: string
          description?: string | null
          evidence?: Json | null
          fix_prompt?: string | null
          fix_steps?: Json | null
          fixed_at?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          revenue_impact_usd?: number | null
          severity: string
          status?: string
          store_id: string
          template_code?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_deep_link?: string | null
          audit_id?: string
          category?: string
          created_at?: string
          description?: string | null
          evidence?: Json | null
          fix_prompt?: string | null
          fix_steps?: Json | null
          fixed_at?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          revenue_impact_usd?: number | null
          severity?: string
          status?: string
          store_id?: string
          template_code?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_issues_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_issues_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          score: number | null
          score_conversion: number | null
          score_seo: number | null
          score_speed: number | null
          score_ux: number | null
          started_at: string | null
          status: string
          store_id: string
          summary: string | null
          triggered_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          score?: number | null
          score_conversion?: number | null
          score_seo?: number | null
          score_speed?: number | null
          score_ux?: number | null
          started_at?: string | null
          status?: string
          store_id: string
          summary?: string | null
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          score?: number | null
          score_conversion?: number | null
          score_seo?: number | null
          score_speed?: number | null
          score_ux?: number | null
          started_at?: string | null
          status?: string
          store_id?: string
          summary?: string | null
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_charges: {
        Row: {
          activated_at: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          id: string
          plan_name: string
          price_amount: number
          shopify_charge_id: string | null
          status: string
          store_id: string
          test: boolean
          trial_days: number
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan_name: string
          price_amount: number
          shopify_charge_id?: string | null
          status?: string
          store_id: string
          test?: boolean
          trial_days?: number
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          plan_name?: string
          price_amount?: number
          shopify_charge_id?: string | null
          status?: string
          store_id?: string
          test?: boolean
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_charges_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          model: string | null
          parts: Json
          role: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          model?: string | null
          parts: Json
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          context: Json
          created_at: string
          id: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          store_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_snapshots: {
        Row: {
          accessibility: number | null
          best_practices: number | null
          cls: string | null
          competitor_id: string
          created_at: string
          id: string
          insight: string | null
          lcp: string | null
          performance: number | null
          seo: number | null
          tbt: string | null
        }
        Insert: {
          accessibility?: number | null
          best_practices?: number | null
          cls?: string | null
          competitor_id: string
          created_at?: string
          id?: string
          insight?: string | null
          lcp?: string | null
          performance?: number | null
          seo?: number | null
          tbt?: string | null
        }
        Update: {
          accessibility?: number | null
          best_practices?: number | null
          cls?: string | null
          competitor_id?: string
          created_at?: string
          id?: string
          insight?: string | null
          lcp?: string | null
          performance?: number | null
          seo?: number | null
          tbt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          domain: string
          id: string
          label: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          label?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          label?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          after_content: string | null
          author: string
          before_content: string | null
          chat_message_id: string | null
          created_at: string
          diff: string | null
          id: string
          path: string
          summary: string | null
          theme_id: string
        }
        Insert: {
          after_content?: string | null
          author?: string
          before_content?: string | null
          chat_message_id?: string | null
          created_at?: string
          diff?: string | null
          id?: string
          path: string
          summary?: string | null
          theme_id: string
        }
        Update: {
          after_content?: string | null
          author?: string
          before_content?: string | null
          chat_message_id?: string | null
          created_at?: string
          diff?: string | null
          id?: string
          path?: string
          summary?: string | null
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_templates: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          detection_hint: string | null
          enabled: boolean
          fix_prompt: string | null
          id: string
          impact_score: number
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description: string
          detection_hint?: string | null
          enabled?: boolean
          fix_prompt?: string | null
          id?: string
          impact_score?: number
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          detection_hint?: string | null
          enabled?: boolean
          fix_prompt?: string | null
          id?: string
          impact_score?: number
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      metrics_daily: {
        Row: {
          conversion_rate: number | null
          created_at: string
          currency: string | null
          day: string
          id: string
          orders: number | null
          revenue_usd: number | null
          sessions: number | null
          store_id: string
        }
        Insert: {
          conversion_rate?: number | null
          created_at?: string
          currency?: string | null
          day: string
          id?: string
          orders?: number | null
          revenue_usd?: number | null
          sessions?: number | null
          store_id: string
        }
        Update: {
          conversion_rate?: number | null
          created_at?: string
          currency?: string | null
          day?: string
          id?: string
          orders?: number | null
          revenue_usd?: number | null
          sessions?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          store_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          store_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          body_md: string | null
          created_at: string
          emailed_at: string | null
          id: string
          kind: string
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          store_id: string
          summary: string | null
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          store_id: string
          summary?: string | null
        }
        Update: {
          body_md?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          store_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sessions: {
        Row: {
          access_token: string | null
          created_at: string
          expires: string | null
          id: string
          is_online: boolean
          online_access_info: Json | null
          scope: string | null
          shop_domain: string
          state: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires?: string | null
          id: string
          is_online?: boolean
          online_access_info?: Json | null
          scope?: string | null
          shop_domain: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires?: string | null
          id?: string
          is_online?: boolean
          online_access_info?: Json | null
          scope?: string | null
          shop_domain?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          access_token_encrypted: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          draft_theme_id: number | null
          id: string
          installed_at: string
          last_seen_at: string
          live_theme_id: number | null
          metadata: Json
          plan_name: string
          plan_status: string
          scopes: string | null
          shop_domain: string
          shop_email: string | null
          shop_name: string | null
          uninstalled_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          draft_theme_id?: number | null
          id?: string
          installed_at?: string
          last_seen_at?: string
          live_theme_id?: number | null
          metadata?: Json
          plan_name?: string
          plan_status?: string
          scopes?: string | null
          shop_domain: string
          shop_email?: string | null
          shop_name?: string | null
          uninstalled_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          draft_theme_id?: number | null
          id?: string
          installed_at?: string
          last_seen_at?: string
          live_theme_id?: number | null
          metadata?: Json
          plan_name?: string
          plan_status?: string
          scopes?: string | null
          shop_domain?: string
          shop_email?: string | null
          shop_name?: string | null
          uninstalled_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_files: {
        Row: {
          content: string | null
          content_hash: string | null
          content_type: string | null
          created_at: string
          id: string
          is_binary: boolean
          last_synced_at: string
          path: string
          size_bytes: number | null
          theme_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_binary?: boolean
          last_synced_at?: string
          path: string
          size_bytes?: number | null
          theme_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_binary?: boolean
          last_synced_at?: string
          path?: string
          size_bytes?: number | null
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_files_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string
          id: string
          is_flovix_draft: boolean
          name: string
          role: string
          shopify_theme_id: number
          source_theme_id: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_flovix_draft?: boolean
          name: string
          role?: string
          shopify_theme_id: number
          source_theme_id?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_flovix_draft?: boolean
          name?: string
          role?: string
          shopify_theme_id?: number
          source_theme_id?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          quantity: number
          store_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          quantity?: number
          store_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          quantity?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_audits: {
        Row: {
          created_at: string
          cta_visible: boolean | null
          device: string
          font_count: number | null
          id: string
          narrative: string | null
          raw: Json | null
          reviews_detected: boolean | null
          score: number | null
          store_id: string
          trust_badges: boolean | null
          urgency_detected: boolean | null
        }
        Insert: {
          created_at?: string
          cta_visible?: boolean | null
          device: string
          font_count?: number | null
          id?: string
          narrative?: string | null
          raw?: Json | null
          reviews_detected?: boolean | null
          score?: number | null
          store_id: string
          trust_badges?: boolean | null
          urgency_detected?: boolean | null
        }
        Update: {
          created_at?: string
          cta_visible?: boolean | null
          device?: string
          font_count?: number | null
          id?: string
          narrative?: string | null
          raw?: Json | null
          reviews_detected?: boolean | null
          score?: number | null
          store_id?: string
          trust_badges?: boolean | null
          urgency_detected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_audits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_log: {
        Row: {
          error: string | null
          id: string
          payload: Json
          processed: boolean
          received_at: string
          shop_domain: string | null
          topic: string
        }
        Insert: {
          error?: string | null
          id?: string
          payload: Json
          processed?: boolean
          received_at?: string
          shop_domain?: string | null
          topic: string
        }
        Update: {
          error?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          received_at?: string
          shop_domain?: string | null
          topic?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
