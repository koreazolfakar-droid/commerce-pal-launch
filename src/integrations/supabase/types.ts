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
      cms_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      cms_brands: {
        Row: {
          created_at: string
          href: string | null
          id: string
          is_visible: boolean
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          href?: string | null
          id?: string
          is_visible?: boolean
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string | null
          id?: string
          is_visible?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_hero_slides: {
        Row: {
          button_label: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_published: boolean
          mobile_image_url: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          target_type: string
          target_value: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          mobile_image_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_type?: string
          target_value?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          mobile_image_url?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          target_type?: string
          target_value?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_media_assets: {
        Row: {
          alt_text: string | null
          bucket_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          object_path: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          bucket_id?: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          object_path: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          bucket_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          object_path?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_navigation_items: {
        Row: {
          area: string
          created_at: string
          href: string | null
          icon_type: string
          icon_value: string | null
          id: string
          is_visible: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          href?: string | null
          icon_type?: string
          icon_value?: string | null
          id?: string
          is_visible?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          href?: string | null
          icon_type?: string
          icon_value?: string | null
          id?: string
          is_visible?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          page_slug: string
          section_key: string
          section_type: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          section_key: string
          section_type: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          section_key?: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_seo_pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          is_public: boolean
          json_ld: Json
          og_image_url: string | null
          page_slug: string
          robots: string
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          is_public?: boolean
          json_ld?: Json
          og_image_url?: string | null
          page_slug: string
          robots?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          is_public?: boolean
          json_ld?: Json
          og_image_url?: string | null
          page_slug?: string
          robots?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_site_settings: {
        Row: {
          group_name: string
          is_public: boolean
          key: string
          label: string | null
          updated_at: string
          value_json: Json | null
          value_text: string | null
          value_type: string
        }
        Insert: {
          group_name?: string
          is_public?: boolean
          key: string
          label?: string | null
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
          value_type?: string
        }
        Update: {
          group_name?: string
          is_public?: boolean
          key?: string
          label?: string | null
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
          value_type?: string
        }
        Relationships: []
      }
      edge_rate_limits: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_edge_rate_limit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
