-- Reintroduz a trava de "mesmo docente em dois horários iguais" que foi
-- removida às pressas em 20260716214545. Regra de negócio: um professor não
-- pode estar em duas turmas na mesma data/horário.
--
-- IMPORTANTE: se já existirem registros conflitantes (mesmo docente_id,
-- data e horario_id, com status <> 'cancelado'), este CREATE UNIQUE INDEX
-- vai falhar. A query abaixo lista esses conflitos — rode-a manualmente
-- antes de aplicar em produção e resolva os registros duplicados
-- (cancelando ou reatribuindo) antes de recriar a constraint.
--
-- select data, horario_id, docente_id, array_agg(id) as planejamentos_conflitantes
-- from public.planejamentos
-- where status <> 'cancelado'
-- group by data, horario_id, docente_id
-- having count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_docente_horario_data
  ON public.planejamentos (data, horario_id, docente_id)
  WHERE status <> 'cancelado';
