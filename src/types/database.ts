/**
 * Supabase database types for the `public` schema.
 *
 * @see supabase/DATABASE.md — full schema, RLS, and connection docs
 * @see docs/erd.mmd — entity relationship diagram
 *
 * Regenerate after schema changes:
 *   npm run supabase:types
 *   npm run supabase:types:local
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PathType = 'happy' | 'unhappy' | 'exception' | 'alternative'

export type Database = {
  public: {
    Tables: {
      cell_triggers: {
        Row: {
          id: string
          source_cell_id: string
          target_cell_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_cell_id: string
          target_cell_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_cell_id?: string
          target_cell_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cell_triggers_source_cell_id_fkey'
            columns: ['source_cell_id']
            isOneToOne: false
            referencedRelation: 'cells'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cell_triggers_target_cell_id_fkey'
            columns: ['target_cell_id']
            isOneToOne: false
            referencedRelation: 'cells'
            referencedColumns: ['id']
          },
        ]
      }
      cells: {
        Row: {
          id: string
          path_id: string
          layer_id: string
          step_id: string
          content: string
          picture: string | null
          description: string | null
          links: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          path_id: string
          layer_id: string
          step_id: string
          content?: string
          picture?: string | null
          description?: string | null
          links?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          path_id?: string
          layer_id?: string
          step_id?: string
          content?: string
          picture?: string | null
          description?: string | null
          links?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cells_layer_id_fkey'
            columns: ['layer_id']
            isOneToOne: false
            referencedRelation: 'layers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cells_path_id_fkey'
            columns: ['path_id']
            isOneToOne: false
            referencedRelation: 'paths'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cells_step_id_fkey'
            columns: ['step_id']
            isOneToOne: false
            referencedRelation: 'steps'
            referencedColumns: ['id']
          },
        ]
      }
      layers: {
        Row: {
          id: string
          path_id: string
          name: string
          layer_role: string | null
          row_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          path_id: string
          name: string
          layer_role?: string | null
          row_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          path_id?: string
          name?: string
          layer_role?: string | null
          row_position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'layers_path_id_fkey'
            columns: ['path_id']
            isOneToOne: false
            referencedRelation: 'paths'
            referencedColumns: ['id']
          },
        ]
      }
      path_steps: {
        Row: {
          path_id: string
          step_id: string
          column_position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          path_id: string
          step_id: string
          column_position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          path_id?: string
          step_id?: string
          column_position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'path_steps_path_id_fkey'
            columns: ['path_id']
            isOneToOne: false
            referencedRelation: 'paths'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'path_steps_step_id_fkey'
            columns: ['step_id']
            isOneToOne: false
            referencedRelation: 'steps'
            referencedColumns: ['id']
          },
        ]
      }
      paths: {
        Row: {
          id: string
          service_scenario_id: string
          name: string
          description: string | null
          note: string | null
          path_type: PathType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_scenario_id: string
          name: string
          description?: string | null
          note?: string | null
          path_type: PathType
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_scenario_id?: string
          name?: string
          description?: string | null
          note?: string | null
          path_type?: PathType
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'paths_service_scenario_id_fkey'
            columns: ['service_scenario_id']
            isOneToOne: false
            referencedRelation: 'service_scenarios'
            referencedColumns: ['id']
          },
        ]
      }
      phases: {
        Row: {
          id: string
          service_lifecycle_id: string
          name: string
          description: string | null
          order_position: number
          loops_to_phase_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_lifecycle_id: string
          name: string
          description?: string | null
          order_position?: number
          loops_to_phase_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_lifecycle_id?: string
          name?: string
          description?: string | null
          order_position?: number
          loops_to_phase_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'phases_service_lifecycle_id_fkey'
            columns: ['service_lifecycle_id']
            isOneToOne: false
            referencedRelation: 'service_lifecycles'
            referencedColumns: ['id']
          },
        ]
      }
      service_lifecycles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_scenarios: {
        Row: {
          id: string
          phase_id: string
          name: string
          description: string | null
          order_position: number
          view_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phase_id: string
          name: string
          description?: string | null
          order_position?: number
          view_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phase_id?: string
          name?: string
          description?: string | null
          order_position?: number
          view_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_scenarios_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'phases'
            referencedColumns: ['id']
          },
        ]
      }
      steps: {
        Row: {
          id: string
          service_scenario_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_scenario_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_scenario_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'steps_service_scenario_id_fkey'
            columns: ['service_scenario_id']
            isOneToOne: false
            referencedRelation: 'service_scenarios'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Cell = Database['public']['Tables']['cells']['Row']
export type CellTrigger = Database['public']['Tables']['cell_triggers']['Row']
export type Layer = Database['public']['Tables']['layers']['Row']
export type Path = Database['public']['Tables']['paths']['Row']
export type PathStep = Database['public']['Tables']['path_steps']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type ServiceLifecycle = Database['public']['Tables']['service_lifecycles']['Row']
export type ServiceScenario = Database['public']['Tables']['service_scenarios']['Row']
export type Step = Database['public']['Tables']['steps']['Row']
