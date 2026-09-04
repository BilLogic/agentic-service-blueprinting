/**
 * Supabase database types for the `public` schema.
 *
 * @see docs/connectors/supabase/database.md — full schema, RLS, and connection docs
 * @see docs/erd.mmd — entity relationship diagram
 *
 * Regenerate after schema changes:
 *   npm run supabase:types
 *   npm run supabase:types:local
 *
 * Generated against the full migration chain; the hand-written aliases at
 * the bottom of the file (PathKind, Cell, Finding, …) survive regeneration —
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
      cell_dependencies: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string | null
          note: string | null
          source_cell_id: string
          target_cell_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name?: string | null
          note?: string | null
          source_cell_id: string
          target_cell_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string | null
          note?: string | null
          source_cell_id?: string
          target_cell_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_dependencies_source_cell_id_fkey"
            columns: ["source_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_dependencies_target_cell_id_fkey"
            columns: ["target_cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_touchpoints: {
        Row: {
          cell_id: string
          created_at: string
          id: string
          name: string | null
          origin: string
          position: number
          role: string | null
          summary: string | null
          touchpoint_id: string | null
          updated_at: string
        }
        Insert: {
          cell_id: string
          created_at?: string
          id?: string
          name?: string | null
          origin: string
          position: number
          role?: string | null
          summary?: string | null
          touchpoint_id?: string | null
          updated_at?: string
        }
        Update: {
          cell_id?: string
          created_at?: string
          id?: string
          name?: string | null
          origin?: string
          position?: number
          role?: string | null
          summary?: string | null
          touchpoint_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cell_touchpoints_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_touchpoints_touchpoint_id_fkey"
            columns: ["touchpoint_id"]
            isOneToOne: false
            referencedRelation: "touchpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      cells: {
        Row: {
          cell_key: string | null
          content: string
          created_at: string
          summary: string | null
          form: string | null
          function: string | null
          id: string
          lane_id: string
          origin: string
          owner: string | null
          path_id: string
          perceived_owner: string | null
          frame: string | null
          position: number
          step_id: string
          status: string
          updated_at: string
          value_props: Json
        }
        Insert: {
          cell_key?: string | null
          content?: string
          created_at?: string
          summary?: string | null
          form?: string | null
          function?: string | null
          id?: string
          lane_id: string
          origin?: string
          owner?: string | null
          path_id: string
          perceived_owner?: string | null
          frame?: string | null
          position?: number
          step_id: string
          status?: string
          updated_at?: string
          value_props?: Json
        }
        Update: {
          cell_key?: string | null
          content?: string
          created_at?: string
          summary?: string | null
          form?: string | null
          function?: string | null
          id?: string
          lane_id?: string
          origin?: string
          owner?: string | null
          path_id?: string
          perceived_owner?: string | null
          frame?: string | null
          position?: number
          step_id?: string
          status?: string
          updated_at?: string
          value_props?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cells_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "lanes"
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
          service_id: string
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
          service_id: string
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
          service_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          cell_ids: string[]
          cell_keys: string[]
          check_key: string
          created_at: string
          fingerprint: string
          id: string
          summary: string | null
          run_id: string
          service_id: string
          severity: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          cell_ids?: string[]
          cell_keys?: string[]
          check_key: string
          created_at?: string
          fingerprint: string
          id?: string
          summary?: string | null
          run_id: string
          service_id: string
          severity: string
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          cell_ids?: string[]
          cell_keys?: string[]
          check_key?: string
          created_at?: string
          fingerprint?: string
          id?: string
          summary?: string | null
          run_id?: string
          service_id?: string
          severity?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      lanes: {
        Row: {
          created_at: string
          id: string
          kpis: Json
          lane_role: string | null
          name: string
          origin: string
          owner_team: string | null
          path_id: string
          position: number
          stakeholder_id: string | null
          tools: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpis?: Json
          lane_role?: string | null
          name: string
          origin?: string
          owner_team?: string | null
          path_id: string
          position?: number
          stakeholder_id?: string | null
          tools?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kpis?: Json
          lane_role?: string | null
          name?: string
          origin?: string
          owner_team?: string | null
          path_id?: string
          position?: number
          stakeholder_id?: string | null
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lanes_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lanes_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      path_steps: {
        Row: {
          position: number
          created_at: string
          path_id: string
          step_id: string
          updated_at: string
        }
        Insert: {
          position?: number
          created_at?: string
          path_id: string
          step_id: string
          updated_at?: string
        }
        Update: {
          position?: number
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
          summary: string | null
          id: string
          name: string
          note: string | null
          origin: string
          kind: string
          scenario_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          summary?: string | null
          id?: string
          name: string
          note?: string | null
          origin?: string
          kind: string
          scenario_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          summary?: string | null
          id?: string
          name?: string
          note?: string | null
          origin?: string
          kind?: string
          scenario_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paths_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          business_impact: string | null
          created_at: string
          summary: string | null
          id: string
          loops_to_phase_id: string | null
          name: string
          operational_requirements: string | null
          position: number
          origin: string
          service_id: string
          updated_at: string
        }
        Insert: {
          business_impact?: string | null
          created_at?: string
          summary?: string | null
          id?: string
          loops_to_phase_id?: string | null
          name: string
          operational_requirements?: string | null
          position?: number
          origin?: string
          service_id: string
          updated_at?: string
        }
        Update: {
          business_impact?: string | null
          created_at?: string
          summary?: string | null
          id?: string
          loops_to_phase_id?: string | null
          name?: string
          operational_requirements?: string | null
          position?: number
          origin?: string
          service_id?: string
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
            foreignKeyName: "phases_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          cell_id: string
          cell_touchpoint_id: string | null
          created_at: string
          featured: boolean
          id: string
          kind: string
          name: string
          origin: string
          position: number
          updated_at: string
          url: string | null
        }
        Insert: {
          cell_id: string
          cell_touchpoint_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          kind?: string
          name: string
          origin: string
          position: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          cell_id?: string
          cell_touchpoint_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          kind?: string
          name?: string
          origin?: string
          position?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_placement_in_cell_fkey"
            columns: ["cell_touchpoint_id", "cell_id"]
            isOneToOne: false
            referencedRelation: "cell_touchpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      business_models: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_cost: string | null
          funding: string | null
          partners: string | null
          pricing: string | null
          revenue_model: string | null
          service_id: string
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
          service_id: string
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
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_model_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
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
      touchpoints: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          kind: string
          name: string
          origin: string
          service_id: string
          summary: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          kind?: string
          name: string
          origin: string
          service_id: string
          summary?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          kind?: string
          name?: string
          origin?: string
          service_id?: string
          summary?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          summary: string | null
          entity_examples: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          summary?: string | null
          entity_examples?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          summary?: string | null
          entity_examples?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          summary: string | null
          id: string
          name: string
          position: number
          origin: string
          phase_id: string
          updated_at: string
          layout: string
        }
        Insert: {
          created_at?: string
          summary?: string | null
          id?: string
          name: string
          position?: number
          origin?: string
          phase_id: string
          updated_at?: string
          layout?: string
        }
        Update: {
          created_at?: string
          summary?: string | null
          id?: string
          name?: string
          position?: number
          origin?: string
          phase_id?: string
          updated_at?: string
          layout?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      slides: {
        Row: {
          title: string | null
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
          title?: string | null
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
          title?: string | null
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
          summary: string | null
          id: string
          locale: string
          authorship: string
          position: number
          service_id: string
          kind: string
          title: string
          updated_at: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          created_by?: string | null
          summary?: string | null
          id?: string
          locale?: string
          authorship?: string
          position?: number
          service_id: string
          kind: string
          title: string
          updated_at?: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          created_by?: string | null
          summary?: string | null
          id?: string
          locale?: string
          authorship?: string
          position?: number
          service_id?: string
          kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          aliases: string[]
          created_at: string
          id: string
          kind: string
          name: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id?: string
          kind: string
          name: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: string
          kind?: string
          name?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      steps: {
        Row: {
          created_at: string
          id: string
          name: string
          origin: string
          scenario_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          origin?: string
          scenario_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          origin?: string
          scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
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
          at_position?: number
          lane_role?: string
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
          kind?: string
          scenario_id: string
        }
        Returns: string
      }
      create_phase: {
        Args: { summary?: string; service_id: string; name: string }
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
          layout?: string
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
          kind?: string
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
        Args: { lane_id: string; path_id: string; step_id: string }
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
      update_scenario_layout: {
        Args: { layout: string; scenario_id: string }
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
      sync_cell_resources: {
        Args: { p_cell_id: string; p_rows: Json }
        Returns: undefined
      }
      sync_placement_resources: {
        Args: { p_placement_id: string; p_rows: Json }
        Returns: undefined
      }
      set_featured_resource: {
        Args: { p_resource_id: string; p_featured: boolean }
        Returns: Json
      }
      restore_featured_resources: {
        Args: { p_rows: Json }
        Returns: undefined
      }
      sync_cell_touchpoints: {
        Args: { p_cell_id: string; p_names: string[] }
        Returns: Json
      }
      restore_cell_touchpoints: {
        Args: { p_cell_id: string; p_rows: Json }
        Returns: undefined
      }
      set_placement_touchpoint: {
        Args: { p_placement_id: string; p_touchpoint_id?: string | null; p_name?: string | null }
        Returns: Json
      }
      remove_placement: {
        Args: { p_placement_id: string }
        Returns: Json
      }
      restore_placement: {
        Args: { p_row: Json; p_resources?: Json }
        Returns: Json
      }
      upsert_cell: {
        Args: {
          content: string
          lane_id: string
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

export type PathKind = 'happy' | 'variant' | 'exception'
/** The `entity_status` domain, shared by `cells.status` and `paths.status`. */
export type EntityStatus =
  | 'proposed'
  | 'planned'
  | 'built'
  | 'live'
  | 'at_risk'
  | 'deprecated'
export type StakeholderKind = 'recipient' | 'staff' | 'partner' | 'provider' | 'team'

export type Cell = Database['public']['Tables']['cells']['Row']
export type CellDependency = Database['public']['Tables']['cell_dependencies']['Row']
export type Lane = Database['public']['Tables']['lanes']['Row']
export type Stakeholder = Database['public']['Tables']['stakeholders']['Row']
export type Path = Database['public']['Tables']['paths']['Row']
export type PathStep = Database['public']['Tables']['path_steps']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type Scenario = Database['public']['Tables']['scenarios']['Row']
export type Step = Database['public']['Tables']['steps']['Row']

export type Slice = Database['public']['Tables']['slices']['Row']
export type Slide = Database['public']['Tables']['slides']['Row']
export type Evidence = Database['public']['Tables']['evidence']['Row']
export type Finding = Database['public']['Tables']['audit_findings']['Row']
export type EvidenceCount = Database['public']['Views']['evidence_counts']['Row']
