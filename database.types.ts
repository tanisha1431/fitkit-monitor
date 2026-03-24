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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      best_scores: {
        Row: {
          best_score: number
          class: string | null
          created_at: string | null
          id: string
          organization_id: string
          season_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_score: number
          class?: string | null
          created_at?: string | null
          id?: string
          organization_id: string
          season_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_score?: number
          class?: string | null
          created_at?: string | null
          id?: string
          organization_id?: string
          season_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "best_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "best_scores_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "best_scores_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "best_scores_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "best_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bmi_results: {
        Row: {
          bmi: number
          created_at: string | null
          height: number
          id: string
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
          weight: number
        }
        Insert: {
          bmi: number
          created_at?: string | null
          height: number
          id?: string
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
          weight: number
        }
        Update: {
          bmi?: number
          created_at?: string | null
          height?: number
          id?: string
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bmi_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bmi_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bmi_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bmi_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string | null
          id: string
          qr_code: string
          rfid: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string | null
          id?: string
          qr_code: string
          rfid: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string | null
          id?: string
          qr_code?: string
          rfid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          div: Database["public"]["Enums"]["div_type"] | null
          id: string
          level: Database["public"]["Enums"]["academy_level"] | null
          organization_id: string
          std: Database["public"]["Enums"]["std_type"] | null
          student_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          div?: Database["public"]["Enums"]["div_type"] | null
          id?: string
          level?: Database["public"]["Enums"]["academy_level"] | null
          organization_id: string
          std?: Database["public"]["Enums"]["std_type"] | null
          student_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          div?: Database["public"]["Enums"]["div_type"] | null
          id?: string
          level?: Database["public"]["Enums"]["academy_level"] | null
          organization_id?: string
          std?: Database["public"]["Enums"]["std_type"] | null
          student_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_requests: {
        Row: {
          approved_at: string | null
          bounce_reason: string | null
          created_at: string | null
          email_status: string | null
          guardian_email: string
          id: string
          rejected_at: string | null
          sent_at: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          bounce_reason?: string | null
          created_at?: string | null
          email_status?: string | null
          guardian_email: string
          id?: string
          rejected_at?: string | null
          sent_at?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          bounce_reason?: string | null
          created_at?: string | null
          email_status?: string | null
          guardian_email?: string
          id?: string
          rejected_at?: string | null
          sent_at?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crunches_results: {
        Row: {
          ascend_times: number[]
          created_at: string | null
          crunches_timestamps: number[]
          descend_times: number[]
          fatigue_index: number
          id: string
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ascend_times: number[]
          created_at?: string | null
          crunches_timestamps: number[]
          descend_times: number[]
          fatigue_index: number
          id?: string
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ascend_times?: number[]
          created_at?: string | null
          crunches_timestamps?: number[]
          descend_times?: number[]
          fatigue_index?: number
          id?: string
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crunches_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crunches_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crunches_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crunches_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlift_results: {
        Row: {
          bodyweight_ratio: number | null
          created_at: string | null
          hold_time: number
          id: string
          max_hold_kgs: number
          measurement_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
          weight_measurements: number[]
        }
        Insert: {
          bodyweight_ratio?: number | null
          created_at?: string | null
          hold_time: number
          id?: string
          max_hold_kgs: number
          measurement_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
          weight_measurements: number[]
        }
        Update: {
          bodyweight_ratio?: number | null
          created_at?: string | null
          hold_time?: number
          id?: string
          max_hold_kgs?: number
          measurement_timestamps?: number[]
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
          weight_measurements?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "deadlift_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlift_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlift_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlift_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      determination_results: {
        Row: {
          correct_buttons: number[]
          created_at: string | null
          id: string
          pressed_buttons: number[]
          reaction_times_ms: number[]
          results: string[]
          score: number
          score_overview_id: string
          shown_positions: number[]
          stimuli: string[]
          stimulus_types: string[]
          test_config_id: string
          test_id: string
          timestamps_ms: number[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correct_buttons: number[]
          created_at?: string | null
          id?: string
          pressed_buttons: number[]
          reaction_times_ms: number[]
          results: string[]
          score: number
          score_overview_id: string
          shown_positions: number[]
          stimuli: string[]
          stimulus_types: string[]
          test_config_id: string
          test_id: string
          timestamps_ms: number[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correct_buttons?: number[]
          created_at?: string | null
          id?: string
          pressed_buttons?: number[]
          reaction_times_ms?: number[]
          results?: string[]
          score?: number
          score_overview_id?: string
          shown_positions?: number[]
          stimuli?: string[]
          stimulus_types?: string[]
          test_config_id?: string
          test_id?: string
          timestamps_ms?: number[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "determination_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: false
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "determination_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "determination_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "determination_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      isometric_pull_results: {
        Row: {
          bodyweight_ratio: number | null
          created_at: string | null
          hold_time: number
          id: string
          max_hold_kgs: number
          measurement_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
          weight_measurements: number[]
        }
        Insert: {
          bodyweight_ratio?: number | null
          created_at?: string | null
          hold_time: number
          id?: string
          max_hold_kgs: number
          measurement_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
          weight_measurements: number[]
        }
        Update: {
          bodyweight_ratio?: number | null
          created_at?: string | null
          hold_time?: number
          id?: string
          max_hold_kgs?: number
          measurement_timestamps?: number[]
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
          weight_measurements?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "isometric_pull_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_pull_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_pull_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isometric_pull_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jump_results: {
        Row: {
          created_at: string | null
          highest_jump: number
          id: string
          jump_heights: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          highest_jump: number
          id?: string
          jump_heights: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          highest_jump?: number
          id?: string
          jump_heights?: number[]
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jump_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jump_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jump_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jump_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_test_suites: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          test_suite_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          test_suite_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          test_suite_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_test_suites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_test_suites_test_suite_id_fkey"
            columns: ["test_suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          api_key: string
          code: string
          created_at: string | null
          email: string
          female_count: number | null
          id: string
          male_count: number | null
          name: string
          payment_count: number | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at: string | null
        }
        Insert: {
          api_key: string
          code: string
          created_at?: string | null
          email: string
          female_count?: number | null
          id?: string
          male_count?: number | null
          name: string
          payment_count?: number | null
          type: Database["public"]["Enums"]["organization_type"]
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          code?: string
          created_at?: string | null
          email?: string
          female_count?: number | null
          id?: string
          male_count?: number | null
          name?: string
          payment_count?: number | null
          type?: Database["public"]["Enums"]["organization_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      package_test_suites: {
        Row: {
          created_at: string | null
          id: string
          package_id: string | null
          test_suite_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_id?: string | null
          test_suite_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          package_id?: string | null
          test_suite_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_test_suites_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_suite_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_test_suites_test_suite_id_fkey"
            columns: ["test_suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      plank_results: {
        Row: {
          created_at: string | null
          id: string
          plank_status_per_second: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plank_status_per_second: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plank_status_per_second?: number[]
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plank_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plank_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plank_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plank_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pushup_results: {
        Row: {
          ascend_times: number[]
          created_at: string | null
          descend_times: number[]
          fatigue_index: number
          id: string
          pushup_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
          valid_pushups: number[]
        }
        Insert: {
          ascend_times: number[]
          created_at?: string | null
          descend_times: number[]
          fatigue_index: number
          id?: string
          pushup_timestamps: number[]
          score: number
          score_overview_id: string
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
          valid_pushups: number[]
        }
        Update: {
          ascend_times?: number[]
          created_at?: string | null
          descend_times?: number[]
          fatigue_index?: number
          id?: string
          pushup_timestamps?: number[]
          score?: number
          score_overview_id?: string
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
          valid_pushups?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "pushup_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pushup_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_overview: {
        Row: {
          created_at: string | null
          determinant_scores: Json | null
          id: string
          normalized_score: number
          raw_score: number
          test_config_id: string
          test_id: string
          timestamp: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          determinant_scores?: Json | null
          id?: string
          normalized_score: number
          raw_score: number
          test_config_id: string
          test_id: string
          timestamp: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          determinant_scores?: Json | null
          id?: string
          normalized_score?: number
          raw_score?: number
          test_config_id?: string
          test_id?: string
          timestamp?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_overview_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_overview_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_overview_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          duration_in_months: number
          id: string
          is_current: boolean
          naming_pattern: string
          organization_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_in_months: number
          id?: string
          is_current?: boolean
          naming_pattern: string
          organization_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_in_months?: number
          id?: string
          is_current?: boolean
          naming_pattern?: string
          organization_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_run_hrm_results: {
        Row: {
          avg_speed_kmph: number
          created_at: string | null
          distance_covered: number
          duration: number
          fatigue_index: number
          heart_rate_recovery: number | null
          hr_measurements: number[] | null
          hr_timestamps: number[] | null
          id: string
          peak_hr: number | null
          recovery_hr: number | null
          score: number
          score_overview_id: string
          shuttle_speeds: number[]
          shuttle_timestamps: number[]
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_speed_kmph: number
          created_at?: string | null
          distance_covered: number
          duration: number
          fatigue_index: number
          heart_rate_recovery?: number | null
          hr_measurements?: number[] | null
          hr_timestamps?: number[] | null
          id?: string
          peak_hr?: number | null
          recovery_hr?: number | null
          score: number
          score_overview_id: string
          shuttle_speeds: number[]
          shuttle_timestamps: number[]
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_speed_kmph?: number
          created_at?: string | null
          distance_covered?: number
          duration?: number
          fatigue_index?: number
          heart_rate_recovery?: number | null
          hr_measurements?: number[] | null
          hr_timestamps?: number[] | null
          id?: string
          peak_hr?: number | null
          recovery_hr?: number | null
          score?: number
          score_overview_id?: string
          shuttle_speeds?: number[]
          shuttle_timestamps?: number[]
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_run_hrm_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_hrm_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_hrm_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_hrm_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_run_results: {
        Row: {
          avg_speed_kmph: number
          created_at: string | null
          distance_covered: number
          duration: number
          fatigue_index: number
          id: string
          score: number
          score_overview_id: string
          shuttle_speeds: number[]
          shuttle_timestamps: number[]
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_speed_kmph: number
          created_at?: string | null
          distance_covered: number
          duration: number
          fatigue_index: number
          id?: string
          score: number
          score_overview_id: string
          shuttle_speeds: number[]
          shuttle_timestamps: number[]
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_speed_kmph?: number
          created_at?: string | null
          distance_covered?: number
          duration?: number
          fatigue_index?: number
          id?: string
          score?: number
          score_overview_id?: string
          shuttle_speeds?: number[]
          shuttle_timestamps?: number[]
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_run_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_run_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_running_results: {
        Row: {
          created_at: string | null
          fatigue_index: number
          id: string
          score: number
          score_overview_id: string
          step_timestamps: number[]
          test_config_id: string
          test_id: string
          total_steps: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fatigue_index: number
          id?: string
          score: number
          score_overview_id: string
          step_timestamps: number[]
          test_config_id: string
          test_id: string
          total_steps: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fatigue_index?: number
          id?: string
          score?: number
          score_overview_id?: string
          step_timestamps?: number[]
          test_config_id?: string
          test_id?: string
          total_steps?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spot_running_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_running_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_running_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spot_running_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_results: {
        Row: {
          created_at: string | null
          duration: number
          id: string
          score: number
          score_overview_id: string
          speed_kmh: number
          test_config_id: string
          test_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration: number
          id?: string
          score: number
          score_overview_id: string
          speed_kmh: number
          test_config_id: string
          test_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number
          id?: string
          score?: number
          score_overview_id?: string
          speed_kmh?: number
          test_config_id?: string
          test_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_30m_results_score_overview_id_fkey"
            columns: ["score_overview_id"]
            isOneToOne: true
            referencedRelation: "scores_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_30m_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_30m_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_results_table_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          email_id: string
          full_name: string
          id: string
          image_url: string | null
          organization_id: string
          phone_number: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_id: string
          full_name: string
          id?: string
          image_url?: string | null
          organization_id: string
          phone_number?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_id?: string
          full_name?: string
          id?: string
          image_url?: string | null
          organization_id?: string
          phone_number?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_configurations: {
        Row: {
          created_at: string
          display_name: string
          distance_meters: number | null
          duration: number | null
          id: string
          is_active: boolean | null
          metric_unit: Database["public"]["Enums"]["metric_unit"] | null
          mode: Database["public"]["Enums"]["test_mode"]
          num_attempts: number | null
          primary_metric: Database["public"]["Enums"]["primary_metric"]
          target_value: number | null
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          distance_meters?: number | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          metric_unit?: Database["public"]["Enums"]["metric_unit"] | null
          mode: Database["public"]["Enums"]["test_mode"]
          num_attempts?: number | null
          primary_metric: Database["public"]["Enums"]["primary_metric"]
          target_value?: number | null
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          distance_meters?: number | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          metric_unit?: Database["public"]["Enums"]["metric_unit"] | null
          mode?: Database["public"]["Enums"]["test_mode"]
          num_attempts?: number | null
          primary_metric?: Database["public"]["Enums"]["primary_metric"]
          target_value?: number | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_configurations_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_session_participants: {
        Row: {
          created_at: string | null
          id: string
          score: number | null
          session_id: string
          student_id: string
          time_spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          score?: number | null
          session_id: string
          student_id: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          score?: number | null
          session_id?: string
          student_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_session_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          avg_score: number | null
          avg_time_spent: number | null
          completed_students_count: number | null
          created_at: string | null
          div: string
          id: string
          std: string
          teacher_id: string
          test_id: string
          updated_at: string | null
        }
        Insert: {
          avg_score?: number | null
          avg_time_spent?: number | null
          completed_students_count?: number | null
          created_at?: string | null
          div: string
          id?: string
          std: string
          teacher_id: string
          test_id: string
          updated_at?: string | null
        }
        Update: {
          avg_score?: number | null
          avg_time_spent?: number | null
          completed_students_count?: number | null
          created_at?: string | null
          div?: string
          id?: string
          std?: string
          teacher_id?: string
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_sessions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suite_packages: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      test_suite_tests: {
        Row: {
          created_at: string | null
          id: string
          sequence_order: number
          test_config_id: string | null
          test_suite_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sequence_order: number
          test_config_id?: string | null
          test_suite_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sequence_order?: number
          test_config_id?: string | null
          test_suite_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_suite_tests_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_suite_tests_test_suite_id_fkey"
            columns: ["test_suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          devices_order: Database["public"]["Enums"]["equipment_type"][]
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          devices_order: Database["public"]["Enums"]["equipment_type"][]
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          devices_order?: Database["public"]["Enums"]["equipment_type"][]
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          category: Database["public"]["Enums"]["test_category"]
          created_at: string | null
          determinant_keys:
            | Database["public"]["Enums"]["determinant_key"][]
            | null
          domain_tags: Database["public"]["Enums"]["domain_tag"][] | null
          equipment_required: Database["public"]["Enums"]["equipment_type"]
          id: string
          instructions: Json
          is_active: boolean
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["test_category"]
          created_at?: string | null
          determinant_keys?:
            | Database["public"]["Enums"]["determinant_key"][]
            | null
          domain_tags?: Database["public"]["Enums"]["domain_tag"][] | null
          equipment_required: Database["public"]["Enums"]["equipment_type"]
          id?: string
          instructions: Json
          is_active?: boolean
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["test_category"]
          created_at?: string | null
          determinant_keys?:
            | Database["public"]["Enums"]["determinant_key"][]
            | null
          domain_tags?: Database["public"]["Enums"]["domain_tag"][] | null
          equipment_required?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          instructions?: Json
          is_active?: boolean
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          date_of_birth: string
          div: Database["public"]["Enums"]["div_type"] | null
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          guardian_email: string | null
          height_cm: number | null
          id: string
          is_consent_approved: boolean
          level: Database["public"]["Enums"]["academy_level"] | null
          name: string
          organization_id: string
          payment_status: string | null
          qr_code: string | null
          report_access_key: string
          rfid: string | null
          roll_no: number | null
          std: Database["public"]["Enums"]["std_type"] | null
          uid: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth: string
          div?: Database["public"]["Enums"]["div_type"] | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          guardian_email?: string | null
          height_cm?: number | null
          id?: string
          is_consent_approved?: boolean
          level?: Database["public"]["Enums"]["academy_level"] | null
          name: string
          organization_id: string
          payment_status?: string | null
          qr_code?: string | null
          report_access_key?: string
          rfid?: string | null
          roll_no?: number | null
          std?: Database["public"]["Enums"]["std_type"] | null
          uid: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string
          div?: Database["public"]["Enums"]["div_type"] | null
          email?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          guardian_email?: string | null
          height_cm?: number | null
          id?: string
          is_consent_approved?: boolean
          level?: Database["public"]["Enums"]["academy_level"] | null
          name?: string
          organization_id?: string
          payment_status?: string | null
          qr_code?: string | null
          report_access_key?: string
          rfid?: string | null
          roll_no?: number | null
          std?: Database["public"]["Enums"]["std_type"] | null
          uid?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_update_users: {
        Args: { updates: Json }
        Returns: {
          created_at: string | null
          date_of_birth: string
          div: Database["public"]["Enums"]["div_type"] | null
          email: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          guardian_email: string | null
          height_cm: number | null
          id: string
          is_consent_approved: boolean
          level: Database["public"]["Enums"]["academy_level"] | null
          name: string
          organization_id: string
          payment_status: string | null
          qr_code: string | null
          report_access_key: string
          rfid: string | null
          roll_no: number | null
          std: Database["public"]["Enums"]["std_type"] | null
          uid: string
          updated_at: string | null
          weight_kg: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_active_classes: {
        Args: { p_organization_id: string; p_season_id: string }
        Returns: {
          class_name: string
          student_count: number
        }[]
      }
      get_all_determinant_scores: {
        Args: { p_user_id: string }
        Returns: {
          determinant_scores: Json
          test_category: string
        }[]
      }
      get_all_test_scores_for_cache: {
        Args: {
          p_class: string
          p_organization_id: string
          p_season_id: string
          p_test_config_id: string
        }
        Returns: {
          best_score: number
          user_id: string
        }[]
      }
      get_assigned_test_configs_for_user: {
        Args: { p_user_id: string }
        Returns: {
          config_display_name: string
          config_duration: number
          config_mode: string
          config_target_value: number
          determinant_keys: Database["public"]["Enums"]["determinant_key"][]
          domain_tags: Database["public"]["Enums"]["domain_tag"][]
          test_category: string
          test_config_id: string
          test_id: string
        }[]
      }
      get_assigned_tests_for_org: {
        Args: { p_organization_id: string }
        Returns: {
          config_display_name: string
          config_duration: number
          config_mode: string
          config_target_value: number
          domain_tags: string[]
          equipment_required: string
          measures: string
          test_category: string
          test_config_id: string
          test_id: string
          video_url: string
          what: string
          why: string
        }[]
      }
      get_latest_score_per_test: {
        Args: { p_user_id: string }
        Returns: {
          config_display_name: string
          determinant_keys: Database["public"]["Enums"]["determinant_key"][]
          determinant_scores: Json
          domain_tags: Database["public"]["Enums"]["domain_tag"][]
          normalized_score: number
          raw_score: number
          test_category: string
          test_config_id: string
          test_id: string
          test_timestamp: string
        }[]
      }
      get_latest_two_scores_per_config: {
        Args: { p_user_id: string }
        Returns: {
          config_display_name: string
          config_duration: number
          config_mode: string
          config_target_value: number
          domain_tags: string[]
          id: string
          normalized_score: number
          raw_score: number
          test_category: string
          test_config_id: string
          test_id: string
          test_timestamp: string
        }[]
      }
      get_latest_two_scores_per_config_bulk: {
        Args: { p_user_ids: string[] }
        Returns: {
          config_display_name: string
          config_duration: number
          config_mode: string
          config_target_value: number
          domain_tags: string[]
          id: string
          normalized_score: number
          raw_score: number
          test_category: string
          test_config_id: string
          test_id: string
          test_timestamp: string
          user_id: string
        }[]
      }
      get_test_leaderboard: {
        Args: {
          p_organization_id: string
          p_season_id: string
          p_test_config_id: string
          p_user_id: string
        }
        Returns: {
          current_user_rank: number
          current_user_score: number
          is_current_user: boolean
          rank_position: number
          result_user_id: string
          total_participants: number
          user_name: string
          user_score: number
        }[]
      }
      get_user_with_organization: {
        Args: { p_user_id: string }
        Returns: {
          date_of_birth: string
          gender: string
          height_cm: number
          id: string
          name: string
          organization_type: string
          weight_kg: number
        }[]
      }
      save_test_result_atomic: {
        Args: {
          p_category: string
          p_class?: string
          p_normalized_score: number
          p_organization_id: string
          p_raw_score: number
          p_season_id: string
          p_test_config_id: string
          p_test_id: string
          p_test_results: Json
          p_user_id: string
        }
        Returns: Json
      }
      save_test_result_with_determinants_atomic: {
        Args: {
          p_category: string
          p_class?: string
          p_determinant_scores?: Json
          p_normalized_score: number
          p_organization_id: string
          p_raw_score: number
          p_season_id: string
          p_test_config_id: string
          p_test_id: string
          p_test_results: Json
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      academy_level: "beginner" | "intermediate" | "advanced"
      determinant_key:
        | "sustained_focus"
        | "reaction_speed"
        | "accuracy"
        | "cognitive_stamina"
        | "distance_covered"
        | "pacing"
        | "heart_rate_recovery"
        | "steps_per_minute"
        | "speed"
        | "core_stability"
        | "upper_body"
        | "lower_body"
      div_type:
        | "A"
        | "B"
        | "C"
        | "D"
        | "E"
        | "F"
        | "G"
        | "H"
        | "I"
        | "J"
        | "K"
        | "L"
        | "M"
        | "N"
        | "O"
        | "P"
        | "Q"
        | "R"
        | "S"
        | "T"
        | "U"
        | "V"
        | "W"
        | "X"
        | "Y"
        | "Z"
      domain_tag:
        | "explosive_power"
        | "cardio_stamina"
        | "sprint_speed"
        | "agility"
        | "muscle_strength"
        | "skill_coordination"
        | "balance"
        | "decision_quickness"
        | "cardiovascular"
        | "strength"
        | "cognitive"
        | "aerobic"
      equipment_type: "mat" | "atoms" | "manual" | "memory_board"
      gender_type: "M" | "F"
      metric_unit: "reps" | "seconds" | "kg" | "meters" | "cm" | "newtons"
      organization_type: "school" | "academy" | "defence"
      primary_metric: "reps" | "duration" | "force" | "distance" | "load"
      std_type:
        | "1"
        | "2"
        | "3"
        | "4"
        | "5"
        | "6"
        | "7"
        | "8"
        | "9"
        | "10"
        | "11"
        | "12"
      test_category:
        | "pushup"
        | "plank"
        | "vertical_jump"
        | "long_jump"
        | "isometric_pull"
        | "deadlift"
        | "sprint"
        | "shuttle_run"
        | "beep_test"
        | "sit_up"
        | "wall_sit"
        | "grip_strength"
        | "spot_running"
        | "crunches"
        | "bmi"
        | "determination"
        | "shuttle_run_hrm"
      test_mode: "timed" | "max_time" | "count"
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
      academy_level: ["beginner", "intermediate", "advanced"],
      determinant_key: [
        "sustained_focus",
        "reaction_speed",
        "accuracy",
        "cognitive_stamina",
        "distance_covered",
        "pacing",
        "heart_rate_recovery",
        "steps_per_minute",
        "speed",
        "core_stability",
        "upper_body",
        "lower_body",
      ],
      div_type: [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
      ],
      domain_tag: [
        "explosive_power",
        "cardio_stamina",
        "sprint_speed",
        "agility",
        "muscle_strength",
        "skill_coordination",
        "balance",
        "decision_quickness",
        "cardiovascular",
        "strength",
        "cognitive",
        "aerobic",
      ],
      equipment_type: ["mat", "atoms", "manual", "memory_board"],
      gender_type: ["M", "F"],
      metric_unit: ["reps", "seconds", "kg", "meters", "cm", "newtons"],
      organization_type: ["school", "academy", "defence"],
      primary_metric: ["reps", "duration", "force", "distance", "load"],
      std_type: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
      test_category: [
        "pushup",
        "plank",
        "vertical_jump",
        "long_jump",
        "isometric_pull",
        "deadlift",
        "sprint",
        "shuttle_run",
        "beep_test",
        "sit_up",
        "wall_sit",
        "grip_strength",
        "spot_running",
        "crunches",
        "bmi",
        "determination",
        "shuttle_run_hrm",
      ],
      test_mode: ["timed", "max_time", "count"],
    },
  },
} as const
