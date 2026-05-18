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
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          field: string
          goal_id: string | null
          id: string
          new_value: string | null
          old_value: string | null
          timestamp: string
        }
        Insert: {
          action?: string
          changed_by?: string | null
          field: string
          goal_id?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          field?: string
          goal_id?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          actual_achievement: number
          computed_score: number | null
          created_at: string
          goal_id: string
          id: string
          manager_comment: string | null
          manager_id: string | null
          planned_target: number
          progress_status: Database["public"]["Enums"]["progress_status"]
          quarter: Database["public"]["Enums"]["quarter"]
          updated_at: string
        }
        Insert: {
          actual_achievement?: number
          computed_score?: number | null
          created_at?: string
          goal_id: string
          id?: string
          manager_comment?: string | null
          manager_id?: string | null
          planned_target: number
          progress_status?: Database["public"]["Enums"]["progress_status"]
          quarter: Database["public"]["Enums"]["quarter"]
          updated_at?: string
        }
        Update: {
          actual_achievement?: number
          computed_score?: number | null
          created_at?: string
          goal_id?: string
          id?: string
          manager_comment?: string | null
          manager_id?: string | null
          planned_target?: number
          progress_status?: Database["public"]["Enums"]["progress_status"]
          quarter?: Database["public"]["Enums"]["quarter"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          is_active: boolean
          opens_at: string
          phase: Database["public"]["Enums"]["cycle_phase"]
          year: number
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at: string
          phase: Database["public"]["Enums"]["cycle_phase"]
          year: number
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          opens_at?: string
          phase?: Database["public"]["Enums"]["cycle_phase"]
          year?: number
        }
        Relationships: []
      }
      escalation_logs: {
        Row: {
          id: string
          reason: string
          resolved: boolean
          resolved_at: string | null
          triggered_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          reason: string
          resolved?: boolean
          resolved_at?: string | null
          triggered_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          reason?: string
          resolved?: boolean
          resolved_at?: string | null
          triggered_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          cycle_id: string | null
          description: string | null
          employee_id: string
          id: string
          is_shared: boolean
          locked: boolean
          parent_goal_id: string | null
          return_comment: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target: number
          thrust_area: string
          title: string
          uom_type: Database["public"]["Enums"]["uom_type"]
          updated_at: string
          weightage: number
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id: string
          id?: string
          is_shared?: boolean
          locked?: boolean
          parent_goal_id?: string | null
          return_comment?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target: number
          thrust_area: string
          title: string
          uom_type: Database["public"]["Enums"]["uom_type"]
          updated_at?: string
          weightage: number
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          is_shared?: boolean
          locked?: boolean
          parent_goal_id?: string | null
          return_comment?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target?: number
          thrust_area?: string
          title?: string
          uom_type?: Database["public"]["Enums"]["uom_type"]
          updated_at?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          id: string
          manager_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thrust_areas: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _employee_id: string; _manager_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employee" | "manager" | "admin"
      cycle_phase: "GOAL_SETTING" | "Q1" | "Q2" | "Q3" | "Q4" | "CLOSED"
      goal_status: "DRAFT" | "SUBMITTED" | "APPROVED" | "RETURNED" | "LOCKED"
      progress_status: "NOT_STARTED" | "ON_TRACK" | "COMPLETED"
      quarter: "Q1" | "Q2" | "Q3" | "Q4"
      uom_type: "MIN" | "MAX" | "TIMELINE" | "ZERO"
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
    Enums: {
      app_role: ["employee", "manager", "admin"],
      cycle_phase: ["GOAL_SETTING", "Q1", "Q2", "Q3", "Q4", "CLOSED"],
      goal_status: ["DRAFT", "SUBMITTED", "APPROVED", "RETURNED", "LOCKED"],
      progress_status: ["NOT_STARTED", "ON_TRACK", "COMPLETED"],
      quarter: ["Q1", "Q2", "Q3", "Q4"],
      uom_type: ["MIN", "MAX", "TIMELINE", "ZERO"],
    },
  },
} as const
