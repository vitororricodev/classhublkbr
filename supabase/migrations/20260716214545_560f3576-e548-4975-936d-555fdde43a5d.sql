DROP INDEX IF EXISTS public.uniq_docente_horario_data;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_turma_horario_data
  ON public.planejamentos (data, horario_id, turma_id)
  WHERE status <> 'cancelado';