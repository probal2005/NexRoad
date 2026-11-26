// Derived from the NexRoad Phase 5 review schema.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customer_request_feedback: {
        Row: { request_id: string; rating: number; comment: string | null; created_at: string }
        Insert: { request_id: string; rating: number; comment?: string | null }
        Update: never
        Relationships: [{
          foreignKeyName: 'customer_request_feedback_request_id_fkey'
          columns: ['request_id']
          isOneToOne: true
          referencedRelation: 'service_requests'
          referencedColumns: ['id']
        }]
      }
      request_activity_history: {
        Row: {
          id: number
          request_id: string
          offer_id: string | null
          technician_id: string | null
          event_type: string
          previous_status: string | null
          new_status: string
          created_at: string
        }
        Insert: {
          id?: never
          request_id: string
          offer_id?: string | null
          technician_id?: string | null
          event_type: string
          previous_status?: string | null
          new_status: string
          created_at?: string
        }
        Update: {
          id?: never
          request_id?: string
          offer_id?: string | null
          technician_id?: string | null
          event_type?: string
          previous_status?: string | null
          new_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'request_activity_history_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'request_offers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'request_activity_history_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
        ]
      }
      request_offers: {
        Row: {
          id: string
          request_id: string
          technician_id: string
          offer_status: string
          estimated_distance_km: number | null
          offered_at: string
          expires_at: string
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          technician_id: string
          offer_status?: string
          estimated_distance_km?: number | null
          offered_at?: string
          expires_at: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          technician_id?: string
          offer_status?: string
          estimated_distance_km?: number | null
          offered_at?: string
          expires_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'request_offers_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
        ]
      }
      service_categories: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          id: string
          customer_id: string
          vehicle_id: string | null
          category_id: string
          service_location: string
          latitude: number
          longitude: number
          issue_description: string | null
          request_status: string
          service_outcome: string | null
          payment_method: string
          payment_status: string
          requested_at: string
          accepted_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
          assigned_technician_id: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          vehicle_id?: string | null
          category_id: string
          service_location: string
          latitude: number
          longitude: number
          issue_description?: string | null
          request_status?: string
          service_outcome?: string | null
          payment_method?: string
          payment_status?: string
          requested_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
          assigned_technician_id?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          vehicle_id?: string | null
          category_id?: string
          service_location?: string
          latitude?: number
          longitude?: number
          issue_description?: string | null
          request_status?: string
          service_outcome?: string | null
          payment_method?: string
          payment_status?: string
          requested_at?: string
          accepted_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
          assigned_technician_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'service_requests_assigned_technician_id_fkey'
            columns: ['assigned_technician_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_vehicle_id_fkey'
            columns: ['vehicle_id', 'customer_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id', 'owner_id']
          },
        ]
      }
      technician_applications: {
        Row: {
          user_id: string
          status: string
          application_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          status?: string
          application_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          status?: string
          application_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_availability: {
        Row: {
          technician_id: string
          is_online: boolean
          accepting_requests: boolean
          updated_at: string
          location_sharing: boolean
        }
        Insert: {
          technician_id: string
          is_online?: boolean
          accepting_requests?: boolean
          updated_at?: string
          location_sharing?: boolean
        }
        Update: {
          technician_id?: string
          is_online?: boolean
          accepting_requests?: boolean
          updated_at?: string
          location_sharing?: boolean
        }
        Relationships: []
      }
      technician_locations: {
        Row: {
          technician_id: string
          latitude: number
          longitude: number
          accuracy_m: number | null
          heading: number | null
          speed_mps: number | null
          captured_at: string
          updated_at: string
        }
        Insert: {
          technician_id: string
          latitude: number
          longitude: number
          accuracy_m?: number | null
          heading?: number | null
          speed_mps?: number | null
          captured_at?: string
          updated_at?: string
        }
        Update: {
          technician_id?: string
          latitude?: number
          longitude?: number
          accuracy_m?: number | null
          heading?: number | null
          speed_mps?: number | null
          captured_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_services: {
        Row: {
          id: string
          technician_id: string
          category_id: string
          description: string | null
          base_price: number
          per_km_charge: number
          service_charge: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          technician_id: string
          category_id: string
          description?: string | null
          base_price?: number
          per_km_charge?: number
          service_charge?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          technician_id?: string
          category_id?: string
          description?: string | null
          base_price?: number
          per_km_charge?: number
          service_charge?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'technician_services_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          owner_id: string
          vehicle_type: string
          make: string
          model: string
          manufacturing_year: number | null
          color: string | null
          registration_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          vehicle_type: string
          make: string
          model: string
          manufacturing_year?: number | null
          color?: string | null
          registration_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          vehicle_type?: string
          make?: string
          model?: string
          manufacturing_year?: number | null
          color?: string | null
          registration_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_technicians: {
        Row: {
          technician_id: string | null
          is_online: boolean | null
          accepting_requests: boolean | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decline_technician_offer: {
        Args: { p_offer_id: string }
        Returns: boolean
      }
      advance_technician_job: {
        Args: { p_request_id: string; p_status: string; p_outcome?: string | null }
        Returns: boolean
      }
      technician_performance: {
        Args: Record<never, never>
        Returns: { completed_jobs: number; rated_jobs: number; average_rating: number | null; simulated_earnings: number | null }[]
      }
      share_technician_location: {
        Args: { p_latitude: number; p_longitude: number }
        Returns: boolean
      }
      customer_request_technician_name: {
        Args: { p_request_id: string }
        Returns: { display_name: string | null }[]
      }
      cancel_customer_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      accept_request_offer: {
        Args: { p_offer_id: string }
        Returns: Json
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
