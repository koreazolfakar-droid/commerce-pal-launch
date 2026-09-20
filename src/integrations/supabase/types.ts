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
          actor_id: string | null
          created_at: string
          detail: Json
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          resource: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resource?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          resource?: string | null
        }
        Relationships: []
      }
      cms_brands: {
        Row: {
          collection_handle: string | null
          cover_image_url: string | null
          created_at: string
          description: string
          href: string | null
          id: string
          is_featured: boolean
          is_visible: boolean
          logo_url: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          collection_handle?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          href?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          logo_url?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          collection_handle?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string
          href?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          logo_url?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_hero_slides: {
        Row: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        Insert: {
          button_label?: string | null
          button_label_ar?: string | null
          button_label_en?: string | null
          button_style?: string
          content_alignment?: string
          content_theme?: string
          created_at?: string
          ends_at?: string | null
          eyebrow_ar?: string | null
          eyebrow_en?: string | null
          id?: string
          image_alt_ar?: string | null
          image_alt_en?: string | null
          image_url: string
          is_published?: boolean
          is_visible?: boolean
          mobile_image_alt_ar?: string | null
          mobile_image_alt_en?: string | null
          mobile_image_url?: string | null
          open_in_new_tab?: boolean
          overlay_opacity?: number
          secondary_button_label_ar?: string | null
          secondary_button_label_en?: string | null
          secondary_button_style?: string
          secondary_open_in_new_tab?: boolean
          secondary_target_type?: string
          secondary_target_value?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          target_type?: string
          target_value?: string | null
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          visual_config?: Json
        }
        Update: {
          button_label?: string | null
          button_label_ar?: string | null
          button_label_en?: string | null
          button_style?: string
          content_alignment?: string
          content_theme?: string
          created_at?: string
          ends_at?: string | null
          eyebrow_ar?: string | null
          eyebrow_en?: string | null
          id?: string
          image_alt_ar?: string | null
          image_alt_en?: string | null
          image_url?: string
          is_published?: boolean
          is_visible?: boolean
          mobile_image_alt_ar?: string | null
          mobile_image_alt_en?: string | null
          mobile_image_url?: string | null
          open_in_new_tab?: boolean
          overlay_opacity?: number
          secondary_button_label_ar?: string | null
          secondary_button_label_en?: string | null
          secondary_button_style?: string
          secondary_open_in_new_tab?: boolean
          secondary_target_type?: string
          secondary_target_value?: string | null
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          target_type?: string
          target_value?: string | null
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          visual_config?: Json
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
          label_ar: string | null
          label_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          href?: string | null
          icon_type?: string
          icon_value?: string | null
          id?: string
          is_visible?: boolean
          label: string
          label_ar?: string | null
          label_en?: string | null
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
          label_ar?: string | null
          label_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          content: Json
          content_ar: Json | null
          content_en: Json | null
          created_at: string
          id: string
          is_visible: boolean
          page_slug: string
          section_key: string
          section_type: string
          sort_order: number
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          content_ar?: Json | null
          content_en?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          section_key: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          content_ar?: Json | null
          content_en?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          section_key?: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_seo_pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_public: boolean
          json_ld: Json
          noindex: boolean
          og_image_url: string | null
          page_slug: string | null
          path: string
          robots: string
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_public?: boolean
          json_ld?: Json
          noindex?: boolean
          og_image_url?: string | null
          page_slug?: string | null
          path: string
          robots?: string
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_public?: boolean
          json_ld?: Json
          noindex?: boolean
          og_image_url?: string | null
          page_slug?: string | null
          path?: string
          robots?: string
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cms_site_settings: {
        Row: {
          created_at: string
          group_name: string | null
          is_public: boolean
          key: string
          label: string | null
          updated_at: string
          value_json: Json | null
          value_text: string | null
          value_type: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          is_public?: boolean
          key: string
          label?: string | null
          updated_at?: string
          value_json?: Json | null
          value_text?: string | null
          value_type?: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
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
      dashboard_login_throttle: {
        Row: {
          blocked_until: string | null
          failure_count: number
          key_hash: string
          last_attempt_at: string
          window_started_at: string
        }
        Insert: {
          blocked_until?: string | null
          failure_count?: number
          key_hash: string
          last_attempt_at?: string
          window_started_at?: string
        }
        Update: {
          blocked_until?: string | null
          failure_count?: number
          key_hash?: string
          last_attempt_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      dashboard_security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
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
      store_catalog_audit_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          changed_by: string | null
          created_at: string
          entity_type: string
          id: number
          product_id: string | null
          variant_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_type: string
          id?: never
          product_id?: string | null
          variant_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string | null
          created_at?: string
          entity_type?: string
          id?: never
          product_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_catalog_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_catalog_audit_log_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          name_ar: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          name_ar?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          name_ar?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_collection_products: {
        Row: {
          collection_id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          product_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "store_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_collections: {
        Row: {
          created_at: string
          description: string
          handle: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          seo_description: string | null
          seo_title: string | null
          sort_order: number
          title: string
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          handle: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          seo_description?: string | null
          seo_title?: string | null
          sort_order?: number
          title: string
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          handle?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          seo_description?: string | null
          seo_title?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_customers: {
        Row: {
          city: string | null
          created_at: string
          default_address: string | null
          email: string | null
          id: string
          internal_notes: string | null
          is_blocked: boolean
          is_profile_managed: boolean
          is_vip: boolean
          last_order_at: string | null
          name: string
          phone: string
          phone_normalized: string
          tags: string[]
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_blocked?: boolean
          is_profile_managed?: boolean
          is_vip?: boolean
          last_order_at?: string | null
          name: string
          phone: string
          phone_normalized: string
          tags?: string[]
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          default_address?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_blocked?: boolean
          is_profile_managed?: boolean
          is_vip?: boolean
          last_order_at?: string | null
          name?: string
          phone?: string
          phone_normalized?: string
          tags?: string[]
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          note: string | null
          product_id: string
          quantity_delta: number
          reference_id: string | null
          reference_type: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          note?: string | null
          product_id: string
          quantity_delta: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          note?: string | null
          product_id?: string
          quantity_delta?: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          options: Json
          order_id: string
          product_id: string | null
          quantity: number
          sku: string | null
          title: string
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          options?: Json
          order_id: string
          product_id?: string | null
          quantity: number
          sku?: string | null
          title: string
          unit_price: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          options?: Json
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          title?: string
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          city: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_reference: string | null
          delivery_address: string | null
          discount_total: number
          id: string
          notes: string | null
          order_number: number
          payment_method: string
          payment_status: string
          shipping_total: number
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_reference?: string | null
          delivery_address?: string | null
          discount_total?: number
          id?: string
          notes?: string | null
          order_number?: never
          payment_method?: string
          payment_status?: string
          shipping_total?: number
          source?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_reference?: string | null
          delivery_address?: string | null
          discount_total?: number
          id?: string
          notes?: string | null
          order_number?: never
          payment_method?: string
          payment_status?: string
          shipping_total?: number
          source?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_procurement_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          purchase_order_id: string | null
          receiving_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          purchase_order_id?: string | null
          receiving_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          purchase_order_id?: string | null
          receiving_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_procurement_attachments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "store_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_procurement_attachments_receiving_id_fkey"
            columns: ["receiving_id"]
            isOneToOne: false
            referencedRelation: "store_receivings"
            referencedColumns: ["id"]
          },
        ]
      }
      store_procurement_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          purchase_order_id: string | null
          receiving_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          purchase_order_id?: string | null
          receiving_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          purchase_order_id?: string | null
          receiving_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_procurement_events_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "store_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_procurement_events_receiving_id_fkey"
            columns: ["receiving_id"]
            isOneToOne: false
            referencedRelation: "store_receivings"
            referencedColumns: ["id"]
          },
        ]
      }
      store_procurement_locations: {
        Row: {
          address: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_variants: {
        Row: {
          allow_backorder: boolean
          average_cost: number
          barcode: string | null
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          options: Json
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
          title: string
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          average_cost?: number
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          options?: Json
          price?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          title?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          average_cost?: number
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          options?: Json
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
          title?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          allow_backorder: boolean
          average_cost: number
          barcode: string | null
          base_price: number
          best_seller: boolean
          brand_id: string | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          description: string
          description_ar: string | null
          description_html: string | null
          featured: boolean
          handle: string
          id: string
          product_type: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string | null
          sort_order: number
          specifications: Json
          status: string
          stock_quantity: number
          tags: string[]
          title: string
          title_ar: string | null
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          average_cost?: number
          barcode?: string | null
          base_price?: number
          best_seller?: boolean
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string
          description_ar?: string | null
          description_html?: string | null
          featured?: boolean
          handle: string
          id?: string
          product_type?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          sort_order?: number
          specifications?: Json
          status?: string
          stock_quantity?: number
          tags?: string[]
          title: string
          title_ar?: string | null
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          average_cost?: number
          barcode?: string | null
          base_price?: number
          best_seller?: boolean
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          description?: string
          description_ar?: string | null
          description_html?: string | null
          featured?: boolean
          handle?: string
          id?: string
          product_type?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string | null
          sort_order?: number
          specifications?: Json
          status?: string
          stock_quantity?: number
          tags?: string[]
          title?: string
          title_ar?: string | null
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "cms_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchase_order_items: {
        Row: {
          created_at: string
          expected_quantity: number
          id: string
          product_id: string
          purchase_order_id: string
          sku_snapshot: string | null
          title_snapshot: string
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          expected_quantity: number
          id?: string
          product_id: string
          purchase_order_id: string
          sku_snapshot?: string | null
          title_snapshot: string
          unit_cost: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          expected_quantity?: number
          id?: string
          product_id?: string
          purchase_order_id?: string
          sku_snapshot?: string | null
          title_snapshot?: string
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "store_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "store_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          exchange_rate: number
          expected_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          ordered_at: string | null
          po_number: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          shipping_amount: number
          status: string
          supplier_id: string
          tax_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          exchange_rate?: number
          expected_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          po_number: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shipping_amount?: number
          status?: string
          supplier_id: string
          tax_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          exchange_rate?: number
          expected_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          po_number?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shipping_amount?: number
          status?: string
          supplier_id?: string
          tax_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "store_procurement_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "store_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_receiving_items: {
        Row: {
          created_at: string
          damaged_quantity: number
          delivered_quantity: number | null
          difference: number | null
          expected_quantity_snapshot: number
          id: string
          missing_quantity: number | null
          overage_confirmed: boolean
          overage_quantity: number | null
          overage_reason: string | null
          purchase_order_item_id: string
          received_quantity: number
          receiving_id: string
          remaining_quantity_before: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          damaged_quantity?: number
          delivered_quantity?: number | null
          difference?: number | null
          expected_quantity_snapshot: number
          id?: string
          missing_quantity?: number | null
          overage_confirmed?: boolean
          overage_quantity?: number | null
          overage_reason?: string | null
          purchase_order_item_id: string
          received_quantity?: number
          receiving_id: string
          remaining_quantity_before: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          damaged_quantity?: number
          delivered_quantity?: number | null
          difference?: number | null
          expected_quantity_snapshot?: number
          id?: string
          missing_quantity?: number | null
          overage_confirmed?: boolean
          overage_quantity?: number | null
          overage_reason?: string | null
          purchase_order_item_id?: string
          received_quantity?: number
          receiving_id?: string
          remaining_quantity_before?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_receiving_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "store_purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_receiving_items_receiving_id_fkey"
            columns: ["receiving_id"]
            isOneToOne: false
            referencedRelation: "store_receivings"
            referencedColumns: ["id"]
          },
        ]
      }
      store_receiving_serials: {
        Row: {
          condition: string
          created_at: string
          created_by: string | null
          id: string
          imei1: string | null
          imei2: string | null
          inventory_status: string
          receiving_item_id: string
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imei1?: string | null
          imei2?: string | null
          inventory_status?: string
          receiving_item_id: string
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imei1?: string | null
          imei2?: string | null
          inventory_status?: string
          receiving_item_id?: string
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_receiving_serials_receiving_item_id_fkey"
            columns: ["receiving_item_id"]
            isOneToOne: false
            referencedRelation: "store_receiving_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_receivings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          invoice_number: string
          notes: string | null
          purchase_order_id: string
          receipt_number: number
          received_at: string
          received_by: string
          receiving_employee_label: string | null
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invoice_number: string
          notes?: string | null
          purchase_order_id: string
          receipt_number?: never
          received_at?: string
          received_by?: string
          receiving_employee_label?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          purchase_order_id?: string
          receipt_number?: never
          received_at?: string
          received_by?: string
          receiving_employee_label?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_receivings_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "store_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_receivings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "store_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_suppliers: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          mfa_enrolled_at: string | null
          mfa_required: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_dashboard_mfa: {
        Args: never
        Returns: {
          mfa_enrolled_at: string
          mfa_required: boolean
          role: string
        }[]
      }
      adjust_store_inventory: {
        Args: {
          p_note?: string
          p_product_id: string
          p_quantity_delta?: number
          p_variant_id?: string
        }
        Returns: {
          movement_id: string
          new_stock: number
        }[]
      }
      approve_store_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      approve_store_receiving: {
        Args: { p_receiving_id: string }
        Returns: {
          damaged_units_recorded: number
          purchase_order_id: string
          purchase_order_status: string
          receiving_id: string
          stock_units_added: number
        }[]
      }
      cancel_store_purchase_order: {
        Args: { p_purchase_order_id: string; p_reason: string }
        Returns: string
      }
      claim_admin: { Args: never; Returns: boolean }
      close_store_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      consume_edge_rate_limit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      create_cms_hero_slide: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_ends_at?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_cms_hero_slide_v2: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_content_theme?: string
          p_ends_at?: string
          p_eyebrow_ar?: string
          p_eyebrow_en?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_secondary_button_label_ar?: string
          p_secondary_button_label_en?: string
          p_secondary_button_style?: string
          p_secondary_open_in_new_tab?: boolean
          p_secondary_target_type?: string
          p_secondary_target_value?: string
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_cms_hero_slide_v3: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_content_theme?: string
          p_ends_at?: string
          p_eyebrow_ar?: string
          p_eyebrow_en?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_secondary_button_label_ar?: string
          p_secondary_button_label_en?: string
          p_secondary_button_style?: string
          p_secondary_open_in_new_tab?: boolean
          p_secondary_target_type?: string
          p_secondary_target_value?: string
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
          p_visual_config?: Json
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_store_collection: {
        Args: {
          p_description?: string
          p_handle: string
          p_image_url?: string
          p_is_active?: boolean
          p_is_featured?: boolean
          p_seo_description?: string
          p_seo_title?: string
          p_title: string
          p_title_ar?: string
        }
        Returns: {
          created_at: string
          description: string
          handle: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          seo_description: string | null
          seo_title: string | null
          sort_order: number
          title: string
          title_ar: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_collections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_store_customer: {
        Args: {
          p_city?: string
          p_default_address?: string
          p_email?: string
          p_internal_notes?: string
          p_is_blocked?: boolean
          p_is_vip?: boolean
          p_name: string
          p_phone: string
          p_tags?: string[]
        }
        Returns: {
          city: string | null
          created_at: string
          default_address: string | null
          email: string | null
          id: string
          internal_notes: string | null
          is_blocked: boolean
          is_profile_managed: boolean
          is_vip: boolean
          last_order_at: string | null
          name: string
          phone: string
          phone_normalized: string
          tags: string[]
          total_orders: number
          total_spent: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_store_order_internal: { Args: { payload: Json }; Returns: Json }
      create_store_product_variant: {
        Args: {
          p_allow_backorder: boolean
          p_barcode: string
          p_compare_at_price: number
          p_image_url: string
          p_is_active: boolean
          p_options: Json
          p_price: number
          p_product_id: string
          p_sku: string
          p_sort_order: number
          p_stock: number
          p_title: string
          p_track_inventory: boolean
        }
        Returns: {
          allow_backorder: boolean
          average_cost: number
          barcode: string | null
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          options: Json
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
          title: string
          track_inventory: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_product_variants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_store_purchase_order: {
        Args: {
          p_currency?: string
          p_items?: Json
          p_notes?: string
          p_po_number: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_store_purchase_order_v2: {
        Args: {
          p_currency: string
          p_discount_amount: number
          p_exchange_rate: number
          p_expected_at: string
          p_items: Json
          p_location_id: string
          p_notes: string
          p_po_number: string
          p_shipping_amount: number
          p_supplier_id: string
          p_tax_amount: number
        }
        Returns: string
      }
      create_store_receiving: {
        Args: {
          p_invoice_number: string
          p_lines?: Json
          p_notes?: string
          p_purchase_order_id: string
          p_receiving_employee_label?: string
        }
        Returns: string
      }
      delete_cms_hero_slide: {
        Args: { p_slide_id: string }
        Returns: undefined
      }
      delete_store_brand: {
        Args: { p_brand_id: string; p_destination_brand_id?: string }
        Returns: undefined
      }
      delete_store_category: {
        Args: { p_category_id: string; p_destination_category_id?: string }
        Returns: undefined
      }
      delete_store_collection: {
        Args: { p_collection_id: string }
        Returns: undefined
      }
      delete_store_product_safe: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      delete_store_product_variant_safe: {
        Args: { p_variant_id: string }
        Returns: undefined
      }
      delete_store_purchase_order_draft: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      duplicate_store_product: {
        Args: { p_product_id: string }
        Returns: string
      }
      get_store_customer_orders: {
        Args: { p_customer_id: string; p_limit?: number }
        Returns: {
          city: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_reference: string | null
          delivery_address: string | null
          discount_total: number
          id: string
          notes: string | null
          order_number: number
          payment_method: string
          payment_status: string
          shipping_total: number
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "store_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      issue_store_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      log_dashboard_security_event: {
        Args: { p_event_type: string; p_metadata?: Json }
        Returns: string
      }
      register_cms_media_asset: {
        Args: {
          p_alt_text?: string
          p_file_name: string
          p_mime_type?: string
          p_object_path: string
          p_size_bytes?: number
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "cms_media_assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_store_purchase_order: {
        Args: { p_purchase_order_id: string; p_reason: string }
        Returns: string
      }
      reopen_store_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      reorder_cms_hero_slides: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_brands: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_categories: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_collections: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_product_variants: {
        Args: { p_items: Json }
        Returns: undefined
      }
      replace_store_receiving_serials: {
        Args: { p_receiving_item_id: string; p_serials: Json }
        Returns: number
      }
      set_cms_hero_visual_config: {
        Args: { p_slide_id: string; p_visual_config: Json }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_store_collection_products: {
        Args: { p_collection_id: string; p_product_ids: string[] }
        Returns: undefined
      }
      set_store_inventory_stock: {
        Args: {
          p_note?: string
          p_product_id: string
          p_stock: number
          p_variant_id: string
        }
        Returns: {
          movement_id: string
          new_stock: number
        }[]
      }
      set_store_product_collections: {
        Args: { p_collection_ids: string[]; p_product_id: string }
        Returns: undefined
      }
      set_store_products_status: {
        Args: { p_product_ids: string[]; p_status: string }
        Returns: number
      }
      submit_store_purchase_order: {
        Args: { p_purchase_order_id: string }
        Returns: string
      }
      update_cms_hero_slide: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_ends_at?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_slide_id: string
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_cms_hero_slide_v2: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_content_theme?: string
          p_ends_at?: string
          p_eyebrow_ar?: string
          p_eyebrow_en?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_secondary_button_label_ar?: string
          p_secondary_button_label_en?: string
          p_secondary_button_style?: string
          p_secondary_open_in_new_tab?: boolean
          p_secondary_target_type?: string
          p_secondary_target_value?: string
          p_slide_id: string
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_cms_hero_slide_v3: {
        Args: {
          p_button_label_ar?: string
          p_button_label_en?: string
          p_button_style?: string
          p_content_alignment?: string
          p_content_theme?: string
          p_ends_at?: string
          p_eyebrow_ar?: string
          p_eyebrow_en?: string
          p_image_alt_ar?: string
          p_image_alt_en?: string
          p_image_url?: string
          p_is_published?: boolean
          p_mobile_image_alt_ar?: string
          p_mobile_image_alt_en?: string
          p_mobile_image_url?: string
          p_open_in_new_tab?: boolean
          p_overlay_opacity?: number
          p_secondary_button_label_ar?: string
          p_secondary_button_label_en?: string
          p_secondary_button_style?: string
          p_secondary_open_in_new_tab?: boolean
          p_secondary_target_type?: string
          p_secondary_target_value?: string
          p_slide_id: string
          p_starts_at?: string
          p_subtitle_ar?: string
          p_subtitle_en?: string
          p_target_type?: string
          p_target_value?: string
          p_title_ar?: string
          p_title_en?: string
          p_visual_config?: Json
        }
        Returns: {
          button_label: string | null
          button_label_ar: string | null
          button_label_en: string | null
          button_style: string
          content_alignment: string
          content_theme: string
          created_at: string
          ends_at: string | null
          eyebrow_ar: string | null
          eyebrow_en: string | null
          id: string
          image_alt_ar: string | null
          image_alt_en: string | null
          image_url: string
          is_published: boolean
          is_visible: boolean
          mobile_image_alt_ar: string | null
          mobile_image_alt_en: string | null
          mobile_image_url: string | null
          open_in_new_tab: boolean
          overlay_opacity: number
          secondary_button_label_ar: string | null
          secondary_button_label_en: string | null
          secondary_button_style: string
          secondary_open_in_new_tab: boolean
          secondary_target_type: string
          secondary_target_value: string | null
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          subtitle_ar: string | null
          subtitle_en: string | null
          target_type: string
          target_value: string | null
          title: string | null
          title_ar: string | null
          title_en: string | null
          updated_at: string
          visual_config: Json
        }
        SetofOptions: {
          from: "*"
          to: "cms_hero_slides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_category: {
        Args: {
          p_category_id: string
          p_description: string
          p_icon: string
          p_image_url: string
          p_is_active: boolean
          p_is_featured: boolean
          p_name: string
          p_seo_description: string
          p_seo_title: string
          p_slug: string
          p_sort_order: number
        }
        Returns: undefined
      }
      update_store_collection: {
        Args: {
          p_collection_id: string
          p_description?: string
          p_handle: string
          p_image_url?: string
          p_is_active?: boolean
          p_is_featured?: boolean
          p_seo_description?: string
          p_seo_title?: string
          p_title: string
          p_title_ar?: string
        }
        Returns: {
          created_at: string
          description: string
          handle: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          seo_description: string | null
          seo_title: string | null
          sort_order: number
          title: string
          title_ar: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_collections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_customer_profile: {
        Args: {
          p_city?: string
          p_customer_id: string
          p_default_address?: string
          p_email?: string
          p_internal_notes?: string
          p_is_blocked?: boolean
          p_is_vip?: boolean
          p_name: string
          p_tags?: string[]
        }
        Returns: {
          city: string | null
          created_at: string
          default_address: string | null
          email: string | null
          id: string
          internal_notes: string | null
          is_blocked: boolean
          is_profile_managed: boolean
          is_vip: boolean
          last_order_at: string | null
          name: string
          phone: string
          phone_normalized: string
          tags: string[]
          total_orders: number
          total_spent: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_order_payment_status: {
        Args: { p_order_id: string; p_payment_status: string }
        Returns: {
          city: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_reference: string | null
          delivery_address: string | null
          discount_total: number
          id: string
          notes: string | null
          order_number: number
          payment_method: string
          payment_status: string
          shipping_total: number
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: {
          city: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_reference: string | null
          delivery_address: string | null
          discount_total: number
          id: string
          notes: string | null
          order_number: number
          payment_method: string
          payment_status: string
          shipping_total: number
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_product_variant: {
        Args: {
          p_allow_backorder: boolean
          p_barcode: string
          p_compare_at_price: number
          p_image_url: string
          p_is_active: boolean
          p_options: Json
          p_price: number
          p_sku: string
          p_sort_order: number
          p_stock: number
          p_title: string
          p_track_inventory: boolean
          p_variant_id: string
        }
        Returns: {
          allow_backorder: boolean
          average_cost: number
          barcode: string | null
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          options: Json
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
          title: string
          track_inventory: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_product_variants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_store_purchase_order_draft: {
        Args: {
          p_currency: string
          p_discount_amount: number
          p_exchange_rate: number
          p_expected_at: string
          p_items: Json
          p_location_id: string
          p_notes: string
          p_po_number: string
          p_purchase_order_id: string
          p_shipping_amount: number
          p_supplier_id: string
          p_tax_amount: number
        }
        Returns: string
      }
      update_store_receiving_draft: {
        Args: {
          p_invoice_number: string
          p_lines: Json
          p_notes: string
          p_receiving_employee_label: string
          p_receiving_id: string
        }
        Returns: string
      }
      void_store_receiving: {
        Args: { p_reason: string; p_receiving_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "editor"
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
    Enums: {
      app_role: ["admin", "editor"],
    },
  },
} as const
