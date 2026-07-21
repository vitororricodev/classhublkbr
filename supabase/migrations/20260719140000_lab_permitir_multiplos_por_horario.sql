-- Revisão: o laboratório PODE ter mais de um agendamento no mesmo
-- horário/dia. Isso acontece de verdade quando dois professores revezam
-- o uso do componente de Informática/Computação e ambos ficaram
-- registrados no histórico. Em vez de o sistema decidir sozinho qual
-- descartar (podendo jogar fora justamente o certo), a trava vira apenas
-- um aviso visual na tela — o ajuste final é manual.

drop index if exists public.uniq_lab_agendamento_horario_data;

-- Reprocessa o povoamento trazendo TAMBÉM os registros que ficaram de fora
-- na migration anterior por causa da trava (agora removida). A checagem de
-- duplicidade agora é pelo registro completo (turma + docente + componente),
-- não só por horário/dia — assim internamente permitimos múltiplos
-- agendamentos no mesmo slot, mas sem inserir o mesmo registro duas vezes
-- se este script rodar de novo.
insert into public.laboratorio_agendamentos
  (data, horario_id, turma_id, docente_id, componente_id, observacao, status, criado_por, created_at)
select
  p.data, p.horario_id, p.turma_id, p.docente_id, p.componente_id, p.conteudo,
  case p.status when 'planejado' then 'agendado' else p.status end,
  p.criado_por, p.created_at
from public.planejamentos p
join public.componentes_curriculares c on c.id = p.componente_id
where c.usa_laboratorio = true
  and not exists (
    select 1 from public.laboratorio_agendamentos a
    where a.data = p.data
      and a.horario_id = p.horario_id
      and a.turma_id = p.turma_id
      and a.docente_id is not distinct from p.docente_id
      and a.componente_id is not distinct from p.componente_id
  );
