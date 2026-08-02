import { supabase } from "@/integrations/supabase/client";

export type Docente = { id: string; nome: string; cor_identificadora: string; ativo: boolean; created_at: string };
export type Componente = { id: string; nome: string; ativo: boolean; usa_laboratorio: boolean; created_at: string };
export type Turma = { id: string; serie: string; nome: string; ativo: boolean; created_at: string };
export type Horario = { id: string; label: string; hora_inicio: string; hora_fim: string; ordem: number; ativo: boolean; eh_intervalo: boolean };
export type Status = "planejado" | "realizado" | "cancelado";
export type Planejamento = {
  id: string;
  data: string;
  horario_id: string;
  docente_id: string;
  componente_id: string;
  turma_id: string;
  conteudo: string | null;
  anexo_url: string | null;
  status: Status;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanejamentoFull = Planejamento & {
  docentes: Docente | null;
  componentes_curriculares: Componente | null;
  turmas: Turma | null;
  horarios_padrao: Horario | null;
};

export const PLAN_SELECT = `
  *,
  docentes:docente_id (*),
  componentes_curriculares:componente_id (*),
  turmas:turma_id (*),
  horarios_padrao:horario_id (*)
` as const;

export type StatusLab = "agendado" | "realizado" | "cancelado";
export type LaboratorioAgendamento = {
  id: string;
  data: string;
  horario_id: string;
  turma_id: string;
  docente_id: string | null;
  componente_id: string | null;
  observacao: string | null;
  status: StatusLab;
  usar_projetor: boolean;
  usar_equipamento_som: boolean;
  criado_por: string | null;
  created_at: string;
};

export type LaboratorioAgendamentoFull = LaboratorioAgendamento & {
  docentes: Docente | null;
  componentes_curriculares: Componente | null;
  turmas: Turma | null;
  horarios_padrao: Horario | null;
};

export const LAB_SELECT = `
  *,
  docentes:docente_id (*),
  componentes_curriculares:componente_id (*),
  turmas:turma_id (*),
  horarios_padrao:horario_id (*)
` as const;

export type StatusSolicitacao = "pendente" | "aprovado" | "rejeitado";
export type SolicitacaoLaboratorio = {
  id: string;
  docente_id: string;
  data: string;
  horario_id: string;
  componente_id: string;
  turma_id: string;
  conteudo: string | null;
  usar_projetor: boolean;
  usar_equipamento_som: boolean;
  status: StatusSolicitacao;
  motivo_rejeicao: string | null;
  decidido_por: string | null;
  decidido_em: string | null;
  criado_por: string | null;
  created_at: string;
};

export type SolicitacaoLaboratorioFull = SolicitacaoLaboratorio & {
  docentes: Docente | null;
  componentes_curriculares: Componente | null;
  turmas: Turma | null;
  horarios_padrao: Horario | null;
};

export const SOLIC_SELECT = `
  *,
  docentes:docente_id (*),
  componentes_curriculares:componente_id (*),
  turmas:turma_id (*),
  horarios_padrao:horario_id (*)
` as const;

export type CategoriaAC = { id: string; nome: string; ativo: boolean; created_at: string };
export type AtividadeComplementar = {
  id: string;
  docente_id: string;
  data: string;
  horario_id: string;
  categoria_id: string;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
};

export type AtividadeComplementarFull = AtividadeComplementar & {
  docentes: Docente | null;
  horarios_padrao: Horario | null;
  categorias_ac: CategoriaAC | null;
};

export const AC_SELECT = `
  *,
  docentes:docente_id (*),
  horarios_padrao:horario_id (*),
  categorias_ac:categoria_id (*)
` as const;

export { supabase };
