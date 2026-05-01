export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          call_log_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          escalated_to: string[];
          id: string;
          message: string;
          patient_id: string;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: Database['public']['Enums']['alert_severity'];
          status: Database['public']['Enums']['alert_status'];
          tenant_id: string;
          type: Database['public']['Enums']['alert_type'];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          call_log_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          escalated_to?: string[];
          id?: string;
          message: string;
          patient_id: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity: Database['public']['Enums']['alert_severity'];
          status?: Database['public']['Enums']['alert_status'];
          tenant_id: string;
          type: Database['public']['Enums']['alert_type'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          call_log_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          escalated_to?: string[];
          id?: string;
          message?: string;
          patient_id?: string;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database['public']['Enums']['alert_severity'];
          status?: Database['public']['Enums']['alert_status'];
          tenant_id?: string;
          type?: Database['public']['Enums']['alert_type'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_call_log_id_fkey';
            columns: ['call_log_id'];
            isOneToOne: false;
            referencedRelation: 'call_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      call_analyses: {
        Row: {
          analyzed_at: string;
          call_log_id: string;
          cognitive_flags: string[];
          cognitive_score: number | null;
          compared_to_previous: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          emotional_flags: string[];
          engagement_level: Database['public']['Enums']['engagement_level'] | null;
          follow_up_items: string[];
          id: string;
          key_topics: string[];
          model_id: string | null;
          mood_score: number | null;
          physical_flags: string[];
          raw_response: Json | null;
          safety_alerts: string[];
          summary: string | null;
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          analyzed_at?: string;
          call_log_id: string;
          cognitive_flags?: string[];
          cognitive_score?: number | null;
          compared_to_previous?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          emotional_flags?: string[];
          engagement_level?: Database['public']['Enums']['engagement_level'] | null;
          follow_up_items?: string[];
          id?: string;
          key_topics?: string[];
          model_id?: string | null;
          mood_score?: number | null;
          physical_flags?: string[];
          raw_response?: Json | null;
          safety_alerts?: string[];
          summary?: string | null;
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          analyzed_at?: string;
          call_log_id?: string;
          cognitive_flags?: string[];
          cognitive_score?: number | null;
          compared_to_previous?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          emotional_flags?: string[];
          engagement_level?: Database['public']['Enums']['engagement_level'] | null;
          follow_up_items?: string[];
          id?: string;
          key_topics?: string[];
          model_id?: string | null;
          mood_score?: number | null;
          physical_flags?: string[];
          raw_response?: Json | null;
          safety_alerts?: string[];
          summary?: string | null;
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'call_analyses_call_log_id_fkey';
            columns: ['call_log_id'];
            isOneToOne: true;
            referencedRelation: 'call_logs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'call_analyses_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      call_logs: {
        Row: {
          agent_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          duration_seconds: number | null;
          ended_at: string | null;
          id: string;
          metadata: Json;
          patient_id: string;
          provider_call_id: string | null;
          recording_url: string | null;
          scheduled_at: string;
          started_at: string | null;
          status: Database['public']['Enums']['call_status'];
          tenant_id: string;
          transcript: string | null;
          updated_at: string;
          updated_by: string | null;
          voice_provider: string | null;
        };
        Insert: {
          agent_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          metadata?: Json;
          patient_id: string;
          provider_call_id?: string | null;
          recording_url?: string | null;
          scheduled_at: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['call_status'];
          tenant_id: string;
          transcript?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          voice_provider?: string | null;
        };
        Update: {
          agent_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          metadata?: Json;
          patient_id?: string;
          provider_call_id?: string | null;
          recording_url?: string | null;
          scheduled_at?: string;
          started_at?: string | null;
          status?: Database['public']['Enums']['call_status'];
          tenant_id?: string;
          transcript?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          voice_provider?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'call_logs_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'call_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      call_schedules: {
        Row: {
          active: boolean;
          cadence: Database['public']['Enums']['call_cadence'];
          created_at: string;
          created_by: string | null;
          days_of_week: number[];
          deleted_at: string | null;
          deleted_by: string | null;
          end_date: string | null;
          id: string;
          patient_id: string;
          start_date: string;
          tenant_id: string;
          time_of_day: string;
          timezone: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          active?: boolean;
          cadence: Database['public']['Enums']['call_cadence'];
          created_at?: string;
          created_by?: string | null;
          days_of_week?: number[];
          deleted_at?: string | null;
          deleted_by?: string | null;
          end_date?: string | null;
          id?: string;
          patient_id: string;
          start_date?: string;
          tenant_id: string;
          time_of_day: string;
          timezone: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          active?: boolean;
          cadence?: Database['public']['Enums']['call_cadence'];
          created_at?: string;
          created_by?: string | null;
          days_of_week?: number[];
          deleted_at?: string | null;
          deleted_by?: string | null;
          end_date?: string | null;
          id?: string;
          patient_id?: string;
          start_date?: string;
          tenant_id?: string;
          time_of_day?: string;
          timezone?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'call_schedules_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'call_schedules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      care_team_actions: {
        Row: {
          action: Database['public']['Enums']['care_action_type'];
          alert_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          notes: string | null;
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          action: Database['public']['Enums']['care_action_type'];
          alert_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          notes?: string | null;
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          action?: Database['public']['Enums']['care_action_type'];
          alert_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          notes?: string | null;
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'care_team_actions_alert_id_fkey';
            columns: ['alert_id'];
            isOneToOne: false;
            referencedRelation: 'alerts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'care_team_actions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      outcome_reports: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          generated_at: string;
          generated_by: string;
          id: string;
          metrics: Json;
          period_end: string;
          period_start: string;
          report_type: Database['public']['Enums']['outcome_report_type'];
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          generated_at?: string;
          generated_by: string;
          id?: string;
          metrics?: Json;
          period_end: string;
          period_start: string;
          report_type: Database['public']['Enums']['outcome_report_type'];
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          generated_at?: string;
          generated_by?: string;
          id?: string;
          metrics?: Json;
          period_end?: string;
          period_start?: string;
          report_type?: Database['public']['Enums']['outcome_report_type'];
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'outcome_reports_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      patients: {
        Row: {
          address: Json | null;
          conditions: string[];
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          dob: string;
          enrolled_at: string;
          external_mrn: string | null;
          first_name: string;
          id: string;
          last_name: string;
          phone: string;
          primary_dx: string | null;
          risk_tier: Database['public']['Enums']['risk_tier'];
          sex: string;
          status: Database['public']['Enums']['patient_status'];
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: Json | null;
          conditions?: string[];
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          dob: string;
          enrolled_at?: string;
          external_mrn?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          phone: string;
          primary_dx?: string | null;
          risk_tier?: Database['public']['Enums']['risk_tier'];
          sex: string;
          status?: Database['public']['Enums']['patient_status'];
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: Json | null;
          conditions?: string[];
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          dob?: string;
          enrolled_at?: string;
          external_mrn?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string;
          primary_dx?: string | null;
          risk_tier?: Database['public']['Enums']['risk_tier'];
          sex?: string;
          status?: Database['public']['Enums']['patient_status'];
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patients_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string;
          expires_at: string;
          id: string;
          role: Database['public']['Enums']['membership_role'];
          tenant_id: string;
          token_hash: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          role: Database['public']['Enums']['membership_role'];
          tenant_id: string;
          token_hash: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          role?: Database['public']['Enums']['membership_role'];
          tenant_id?: string;
          token_hash?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_invites_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          cohort_definition: Json;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          name: string;
          outcome_metrics: Json;
          settings: Json;
          slug: string;
          type: Database['public']['Enums']['tenant_type'];
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          cohort_definition?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          name: string;
          outcome_metrics?: Json;
          settings?: Json;
          slug: string;
          type: Database['public']['Enums']['tenant_type'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          cohort_definition?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          name?: string;
          outcome_metrics?: Json;
          settings?: Json;
          slug?: string;
          type?: Database['public']['Enums']['tenant_type'];
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          created_at: string;
          created_by: string | null;
          default_locale: string;
          deleted_at: string | null;
          deleted_by: string | null;
          display_name: string;
          email: string | null;
          id: string;
          is_super_admin: boolean;
          phone: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          default_locale?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          display_name: string;
          email?: string | null;
          id: string;
          is_super_admin?: boolean;
          phone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          default_locale?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          display_name?: string;
          email?: string | null;
          id?: string;
          is_super_admin?: boolean;
          phone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_tenant_memberships: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          role: Database['public']['Enums']['membership_role'];
          status: Database['public']['Enums']['membership_status'];
          tenant_id: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          role: Database['public']['Enums']['membership_role'];
          status?: Database['public']['Enums']['membership_status'];
          tenant_id: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          role?: Database['public']['Enums']['membership_role'];
          status?: Database['public']['Enums']['membership_status'];
          tenant_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_tenant_memberships_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: {
          p_token: string;
          p_user_id: string;
          p_display_name: string;
        };
        Returns: string;
      };
      auth_user_is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      auth_user_role_in_tenant: {
        Args: {
          p_tenant_id: string;
        };
        Returns: Database['public']['Enums']['membership_role'];
      };
      auth_user_tenants: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      get_invite_by_token: {
        Args: {
          p_token: string;
        };
        Returns: {
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          email: string;
          role: Database['public']['Enums']['membership_role'];
          expires_at: string;
          accepted_at: string;
        }[];
      };
    };
    Enums: {
      alert_severity: 'low' | 'medium' | 'high' | 'critical';
      alert_status: 'open' | 'acknowledged' | 'escalated' | 'resolved' | 'dismissed';
      alert_type: 'clinical' | 'behavioral' | 'safety' | 'operational';
      call_cadence: 'daily' | 'weekdays' | 'custom';
      call_status: 'scheduled' | 'in_progress' | 'completed' | 'no_answer' | 'failed' | 'voicemail';
      care_action_type:
        | 'acknowledge'
        | 'comment'
        | 'escalate'
        | 'resolve'
        | 'dismiss'
        | 'schedule_visit'
        | 'contact_patient';
      engagement_level: 'high' | 'moderate' | 'low' | 'refused';
      membership_role: 'tenant_admin' | 'care_team_lead' | 'care_team_member';
      membership_status: 'active' | 'invited' | 'suspended';
      outcome_report_type: 'monthly' | 'quarterly' | 'annual' | 'adhoc';
      patient_status: 'active' | 'paused' | 'discharged' | 'deceased';
      risk_tier: 'low' | 'medium' | 'high' | 'very_high';
      tenant_type: 'aco' | 'ma_plan' | 'physician_group' | 'home_health' | 'snf';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
