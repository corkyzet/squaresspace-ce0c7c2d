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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      entrants: {
        Row: {
          id: string
          season_id: string
          name: string
          email: string
          boxes_requested: number
          who_will_pay: string | null
          collected_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          name: string
          email: string
          boxes_requested?: number
          who_will_pay?: string | null
          collected_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          name?: string
          email?: string
          boxes_requested?: number
          who_will_pay?: string | null
          collected_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrants_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          away_score: number
          away_seed: number | null
          away_team: string
          created_at: string
          espn_id: string | null
          home_score: number
          home_seed: number | null
          home_team: string
          id: string
          is_processed: boolean
          round: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          away_score?: number
          away_seed?: number | null
          away_team: string
          created_at?: string
          espn_id?: string | null
          home_score?: number
          home_seed?: number | null
          home_team: string
          id?: string
          is_processed?: boolean
          round?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          away_score?: number
          away_seed?: number | null
          away_team?: string
          created_at?: string
          espn_id?: string | null
          home_score?: number
          home_seed?: number | null
          home_team?: string
          id?: string
          is_processed?: boolean
          round?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          season_id: string
          entrant_id: string
          amount_cents: number
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          entrant_id: string
          amount_cents?: number
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          entrant_id?: string
          amount_cents?: number
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_entrant_id_fkey"
            columns: ["entrant_id"]
            isOneToOne: false
            referencedRelation: "entrants"
            referencedColumns: ["id"]
          }
        ]
      }
      seasons: {
        Row: {
          id: string
          year: number
          is_active: boolean
          is_published: boolean
          win_order: number[]
          lose_order: number[]
          created_at: string
        }
        Insert: {
          id?: string
          year: number
          is_active?: boolean
          is_published?: boolean
          win_order?: number[]
          lose_order?: number[]
          created_at?: string
        }
        Update: {
          id?: string
          year?: number
          is_active?: boolean
          is_published?: boolean
          win_order?: number[]
          lose_order?: number[]
          created_at?: string
        }
        Relationships: []
      }
      squares: {
        Row: {
          created_at: string
          id: string
          lose_digit: number
          owner_name: string | null
          season_id: string
          win_digit: number
        }
        Insert: {
          created_at?: string
          id?: string
          lose_digit: number
          owner_name?: string | null
          season_id: string
          win_digit: number
        }
        Update: {
          created_at?: string
          id?: string
          lose_digit?: number
          owner_name?: string | null
          season_id?: string
          win_digit?: number
        }
        Relationships: [
          {
            foreignKeyName: "squares_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          }
        ]
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
