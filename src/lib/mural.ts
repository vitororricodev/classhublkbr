import { supabase } from "@/integrations/supabase/client";

export type MuralTipo = "aviso" | "evento" | "destaque";

export type MuralPublicacao = {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: MuralTipo;
  data_evento: string | null;
  hora_evento: string | null;
  inicio_exibicao: string;
  fim_exibicao: string | null;
  fixado: boolean;
  ativo: boolean;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export const muralTipoLabel: Record<MuralTipo, string> = {
  aviso: "Aviso",
  evento: "Evento",
  destaque: "Destaque",
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Schema gerado será atualizado junto da próxima revisão de tipos do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const muralDb = supabase as any;
