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
      app_users: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          must_change_password: boolean
          nome: string
          password_hash: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          username: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          must_change_password?: boolean
          nome: string
          password_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          must_change_password?: boolean
          nome?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      componentes_curriculares: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      docentes: {
        Row: {
          ativo: boolean
          cor_identificadora: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor_identificadora?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor_identificadora?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      feriados: {
        Row: {
          ativo: boolean
          created_at: string
          data: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      horarios_padrao: {
        Row: {
          ativo: boolean
          created_at: string
          hora_fim: string
          hora_inicio: string
          id: string
          label: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          hora_fim: string
          hora_inicio: string
          id?: string
          label: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          label?: string
          ordem?: number
        }
        Relationships: []
      }
      planejamentos: {
        Row: {
          anexo_url: string | null
          componente_id: string
          conteudo: string | null
          created_at: string
          data: string
          docente_id: string
          horario_id: string
          id: string
          status: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          anexo_url?: string | null
          componente_id: string
          conteudo?: string | null
          created_at?: string
          data: string
          docente_id: string
          horario_id: string
          id?: string
          status?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          anexo_url?: string | null
          componente_id?: string
          conteudo?: string | null
          created_at?: string
          data?: string
          docente_id?: string
          horario_id?: string
          id?: string
          status?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planejamentos_componente_id_fkey"
            columns: ["componente_id"]
            isOneToOne: false
            referencedRelation: "componentes_curriculares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamentos_docente_id_fkey"
            columns: ["docente_id"]
            isOneToOne: false
            referencedRelation: "docentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamentos_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios_padrao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamentos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          serie: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          serie: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          serie?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          primeiro_login: boolean
          senha_hash: string
          tipo: string
          usuario: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          primeiro_login?: boolean
          senha_hash: string
          tipo?: string
          usuario: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          primeiro_login?: boolean
          senha_hash?: string
          tipo?: string
          usuario?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alterar_senha_usuario: {
        Args: {
          p_nova_senha: string
          p_senha_atual: string
          p_usuario_id: string
        }
        Returns: boolean
      }
      login_usuario: {
        Args: { p_senha: string; p_usuario: string }
        Returns: {
          id: string
          nome: string
          primeiro_login: boolean
          tipo: string
          usuario: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "visualizador"
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
      app_role: ["admin", "operador", "visualizador"],
    },
  },
} as const
