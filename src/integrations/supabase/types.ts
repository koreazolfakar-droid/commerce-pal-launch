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
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_published: boolean
          mobile_image_url: string | null
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
        }
        Insert: {
          button_label?: string | null
          button_label_ar?: string | null
          button_label_en?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          mobile_image_url?: string | null
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
        }
        Update: {
          button_label?: string | null
          button_label_ar?: string | null
          button_label_en?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          mobile_image_url?: string | null
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
          area: string
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
          section_type: string
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
          is_public: boolean
          json_ld: Json
          og_image_url: string | null
          page_slug: string
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
          is_public?: boolean
          json_ld?: Json
          og_image_url?: string | null
          page_slug: string
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
          is_public?: boolean
          json_ld?: Json
          og_image_url?: string | null
          page_slug?: string
          robots?: string
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
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
      consume_edge_rate_limit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
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
      reorder_store_brands: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_categories: { Args: { p_items: Json }; Returns: undefined }
      reorder_store_collections: { Args: { p_items: Json }; Returns: undefined }
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
