/**
 * Supabase database types for the `public` schema.
 *
 * @see supabase/DATABASE.md — full schema, RLS, and connection docs
 * @see docs/erd.mmd — entity relationship diagram
 *
 * Regenerate after schema changes:
 *   npm run supabase:types
 *   npm run supabase:types:local
 *
 * Generated against the full migration chain; the hand-written aliases at
 * the bottom of the file (PathType, Cell, Finding, …) survive regeneration —
 * re-append them if the generator output replaces this file wholesale.
 */

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_messages: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          seq: number
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload: Json
          seq: number
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          seq?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cell_triggers: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string | null
          note: string | null
          source_cell_id: string
          target_cell_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          note?: string | null
          source_cell_id: string
          target_cell_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          note?: string | null
          source_cell_id?: string
          target_cell_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_triggers_source_cell_id_fkey"
            columns: ["source_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_triggers_target_cell_id_fkey"
            columns: ["target_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      cells: {
        Row: {
          cell_key: string | null
          content: string
          created_at: string
          description: string | null
          form: string | null
          function: string | null
          id: string
          layer_id: string
          links: Json
          origin: string
          owner: string | null
          path_id: string
          perceived_owner: string | null
          picture: string | null
          slot_position: number
          step_id: string
          updated_at: string
          value_props: Json
        }
        Insert: {
          cell_key?: string | null
          content?: string
          created_at?: string
          description?: string | null
          form?: string | null
          function?: string | null
          id?: string
          layer_id: string
          links?: Json
          origin?: string
          owner?: string | null
          path_id: string
          perceived_owner?: string | null
          picture?: string | null
          slot_position?: number
          step_id: string
          updated_at?: string
          value_props?: Json
        }
        Update: {
          cell_key?: string | null
          content?: string
          created_at?: string
          description?: string | null
          form?: string | null
          function?: string | null
          id?: string
          layer_id?: string
          links?: Json
          origin?: string
          owner?: string | null
          path_id?: string
          perceived_owner?: string | null
          picture?: string | null
          slot_position?: number
          step_id?: string
          updated_at?: string
          value_props?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cells_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cells_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cells_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_structure: {
        Row: {
          affected_slices: Json
          deleted_at: string
          deleted_by: string | null
          id: string
          kind: string
          label: string
          payload: Json
        }
        Insert: {
          affected_slices?: Json
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          kind: string
          label: string
          payload: Json
        }
        Update: {
          affected_slices?: Json
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          kind?: string
          label?: string
          payload?: Json
        }
        Relationships: []
      }
      evidence: {
        Row: {
          added_by: string | null
          cell_id: string | null
          cell_key: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          kind: string
          note: string | null
          observed_at: string | null
          proposition_question_key: string | null
          ref: string | null
          service_lifecycle_id: string
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          cell_id?: string | null
          cell_key?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          kind: string
          note?: string | null
          observed_at?: string | null
          proposition_question_key?: string | null
          ref?: string | null
          service_lifecycle_id: string
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          cell_id?: string | null
          cell_key?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          kind?: string
          note?: string | null
          observed_at?: string | null
          proposition_question_key?: string | null
          ref?: string | null
          service_lifecycle_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_service_lifecycle_id_fkey"
            columns: ["service_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "service_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          cell_ids: string[]
          cell_keys: string[]
          check_name: string
          created_at: string
          fingerprint: string
          id: string
          note: string | null
          run_id: string
          service_lifecycle_id: string
          severity: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          cell_ids?: string[]
          cell_keys?: string[]
          check_name: string
          created_at?: string
          fingerprint: string
          id?: string
          note?: string | null
          run_id: string
          service_lifecycle_id: string
          severity: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          cell_ids?: string[]
          cell_keys?: string[]
          check_name?: string
          created_at?: string
          fingerprint?: string
          id?: string
          note?: string | null
          run_id?: string
          service_lifecycle_id?: string
          severity?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_service_lifecycle_id_fkey"
            columns: ["service_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "service_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      layers: {
        Row: {
          created_at: string
          id: string
          kpis: Json
          layer_role: string | null
          name: string
          origin: string
          owner_team: string | null
          path_id: string
          row_position: number
          tools: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpis?: Json
          layer_role?: string | null
          name: string
          origin?: string
          owner_team?: string | null
          path_id: string
          row_position?: number
          tools?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kpis?: Json
          layer_role?: string | null
          name?: string
          origin?: string
          owner_team?: string | null
          path_id?: string
          row_position?: number
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "layers_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
        ]
      }
      path_steps: {
        Row: {
          column_position: number
          created_at: string
          path_id: string
          step_id: string
          updated_at: string
        }
        Insert: {
          column_position?: number
          created_at?: string
          path_id: string
          step_id: string
          updated_at?: string
        }
        Update: {
          column_position?: number
          created_at?: string
          path_id?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_steps_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      paths: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          note: string | null
          origin: string
          path_type: string
          service_scenario_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          note?: string | null
          origin?: string
          path_type: string
          service_scenario_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          note?: string | null
          origin?: string
          path_type?: string
          service_scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paths_service_scenario_id_fkey"
            columns: ["service_scenario_id"]
            isOneToOne: false
            referencedRelation: "service_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          business_impact: string | null
          created_at: string
          description: string | null
          id: string
          loops_to_phase_id: string | null
          name: string
          operational_requirements: string | null
          order_position: number
          origin: string
          service_lifecycle_id: string
          updated_at: string
        }
        Insert: {
          business_impact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          loops_to_phase_id?: string | null
          name: string
          operational_requirements?: string | null
          order_position?: number
          origin?: string
          service_lifecycle_id: string
          updated_at?: string
        }
        Update: {
          business_impact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          loops_to_phase_id?: string | null
          name?: string
          operational_requirements?: string | null
          order_position?: number
          origin?: string
          service_lifecycle_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_loops_to_phase_id_fkey"
            columns: ["loops_to_phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phases_service_lifecycle_id_fkey"
            columns: ["service_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "service_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      propositions: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_cost: string | null
          funding: string | null
          partners: string | null
          pricing: string | null
          revenue_model: string | null
          service_lifecycle_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_cost?: string | null
          funding?: string | null
          partners?: string | null
          pricing?: string | null
          revenue_model?: string | null
          service_lifecycle_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_cost?: string | null
          funding?: string | null
          partners?: string | null
          pricing?: string | null
          revenue_model?: string | null
          service_lifecycle_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propositions_service_lifecycle_id_fkey"
            columns: ["service_lifecycle_id"]
            isOneToOne: true
            referencedRelation: "service_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_version: {
        Row: {
          applied_at: string
          singleton: boolean
          version: string
        }
        Insert: {
          applied_at?: string
          singleton?: boolean
          version: string
        }
        Update: {
          applied_at?: string
          singleton?: boolean
          version?: string
        }
        Relationships: []
      }
      service_account_emails: {
        Row: {
          created_at: string
          email: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      service_lifecycles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_scenarios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_position: number
          origin: string
          phase_id: string
          updated_at: string
          view_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_position?: number
          origin?: string
          phase_id: string
          updated_at?: string
          view_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_position?: number
          origin?: string
          phase_id?: string
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_scenarios_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      slice_items: {
        Row: {
          caption: string | null
          cell_ids: string[]
          cell_keys: string[]
          created_at: string
          created_by: string | null
          id: string
          illustration: Json | null
          narrative: string | null
          position: number
          slice_id: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          cell_ids?: string[]
          cell_keys?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          illustration?: Json | null
          narrative?: string | null
          position: number
          slice_id: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          cell_ids?: string[]
          cell_keys?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          illustration?: Json | null
          narrative?: string | null
          position?: number
          slice_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slice_items_slice_id_fkey"
            columns: ["slice_id"]
            isOneToOne: false
            referencedRelation: "slices"
            referencedColumns: ["id"]
          },
        ]
      }
      slices: {
        Row: {
          actor: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          locale: string
          origin: string
          position: number
          service_lifecycle_id: string
          slice_type: string
          title: string
          updated_at: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locale?: string
          origin?: string
          position?: number
          service_lifecycle_id: string
          slice_type: string
          title: string
          updated_at?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locale?: string
          origin?: string
          position?: number
          service_lifecycle_id?: string
          slice_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slices_service_lifecycle_id_fkey"
            columns: ["service_lifecycle_id"]
            isOneToOne: false
            referencedRelation: "service_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          created_at: string
          id: string
          name: string
          origin: string
          service_scenario_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          origin?: string
          service_scenario_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          origin?: string
          service_scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_service_scenario_id_fkey"
            columns: ["service_scenario_id"]
            isOneToOne: false
            referencedRelation: "service_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      evidence_counts: {
        Row: {
          cell_id: string | null
          n: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_lane: {
        Args: {
          at_row?: number
          layer_role?: string
          name: string
          scenario_id: string
        }
        Returns: string[]
      }
      add_step: {
        Args: { at_position?: number; name: string; path_id: string }
        Returns: string
      }
      cell_natural_key: { Args: { cell_id: string }; Returns: string }
      clear_cell_dependency: {
        Args: { dependency_id: string }
        Returns: undefined
      }
      create_path: {
        Args: {
          lane_source_path_id?: string
          name: string
          path_type?: string
          scenario_id: string
        }
        Returns: string
      }
      create_phase: {
        Args: { description?: string; lifecycle_id: string; name: string }
        Returns: string
      }
      create_scenario: {
        Args: {
          lane_set?: Json
          lane_source_path_id?: string
          name: string
          path_name?: string
          phase_id: string
          step_count?: number
          view_type?: string
        }
        Returns: Json
      }
      delete_cell: { Args: { cell_id: string }; Returns: string }
      delete_path: { Args: { path_id: string }; Returns: string }
      delete_scenario: { Args: { scenario_id: string }; Returns: string }
      deletion_impact: {
        Args: { kind: string; target_id: string }
        Returns: Json
      }
      duplicate_path: {
        Args: {
          copy_cells?: boolean
          copy_dependencies?: boolean
          name: string
          path_type?: string
          source_path_id: string
        }
        Returns: string
      }
      duplicate_scenario: {
        Args: { name: string; source_scenario_id: string }
        Returns: string
      }
      is_service_account: { Args: never; Returns: boolean }
      key_slug: { Args: { value: string }; Returns: string }
      mint_cell_key: {
        Args: { layer_id: string; path_id: string; step_id: string }
        Returns: string
      }
      remove_lane: {
        Args: { lane_name: string; scenario_id: string }
        Returns: string
      }
      remove_lanes: { Args: { lane_ids: string[] }; Returns: string }
      remove_step: {
        Args: { path_id: string; step_id: string }
        Returns: string
      }
      rename_owner_tag: {
        Args: { from_name: string; to_name: string }
        Returns: string[]
      }
      rename_path: {
        Args: { new_name: string; path_id: string }
        Returns: undefined
      }
      rename_phase: {
        Args: { new_name: string; phase_id: string }
        Returns: undefined
      }
      rename_scenario: {
        Args: { new_name: string; scenario_id: string }
        Returns: undefined
      }
      reorder_lanes: {
        Args: { lane_names: string[]; scenario_id: string }
        Returns: undefined
      }
      reorder_steps: {
        Args: { path_id: string; step_ids: string[] }
        Returns: undefined
      }
      set_cell_dependency: {
        Args: {
          kind?: string
          label?: string
          note?: string
          source_cell_id: string
          target_cell_id: string
        }
        Returns: string
      }
      set_path_steps: {
        Args: { path_id: string; step_ids: string[] }
        Returns: undefined
      }
      slices_referencing: { Args: { cell_ids: string[] }; Returns: Json }
      upsert_cell: {
        Args: {
          content: string
          layer_id: string
          path_id: string
          step_id: string
        }
        Returns: string
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

// ---------------------------------------------------------------------------
// Hand-written aliases — the names the codebase imports. Keep these when the
// generator output replaces the file above.
// ---------------------------------------------------------------------------

export type PathType = 'happy' | 'unhappy' | 'exception' | 'alternative'

export type Cell = Database['public']['Tables']['cells']['Row']
export type CellTrigger = Database['public']['Tables']['cell_triggers']['Row']
export type Layer = Database['public']['Tables']['layers']['Row']
export type Path = Database['public']['Tables']['paths']['Row']
export type PathStep = Database['public']['Tables']['path_steps']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type ServiceLifecycle = Database['public']['Tables']['service_lifecycles']['Row']
export type ServiceScenario = Database['public']['Tables']['service_scenarios']['Row']
export type Step = Database['public']['Tables']['steps']['Row']

export type Slice = Database['public']['Tables']['slices']['Row']
export type SliceItem = Database['public']['Tables']['slice_items']['Row']
export type Evidence = Database['public']['Tables']['evidence']['Row']
export type Finding = Database['public']['Tables']['findings']['Row']
export type EvidenceCount = Database['public']['Views']['evidence_counts']['Row']
