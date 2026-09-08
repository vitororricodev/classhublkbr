-- Dados pedagógicos exclusivos do LabCS (slug multidisciplinar).
-- As colunas permanecem anuláveis para preservar o histórico e o Lab. de Informática.

update public.laboratorios
set nome = 'LabCS - Laboratório de Conexões e Saberes'
where slug = 'multidisciplinar';

alter table public.laboratorio_agendamentos
  add column if not exists tipo_atividade text,
  add column if not exists alunos_participantes text,
  add column if not exists recursos_utilizados text,
  add column if not exists habilidades text,
  add column if not exists objeto_conhecimento text;

alter table public.solicitacoes_laboratorio
  add column if not exists tipo_atividade text,
  add column if not exists alunos_participantes text,
  add column if not exists recursos_utilizados text,
  add column if not exists habilidades text,
  add column if not exists objeto_conhecimento text;

alter table public.laboratorio_agendamentos
  drop constraint if exists laboratorio_agendamentos_tipo_atividade_check,
  add constraint laboratorio_agendamentos_tipo_atividade_check
    check (tipo_atividade is null or tipo_atividade in ('aula_pratica', 'oficina_pedagogica'));

alter table public.solicitacoes_laboratorio
  drop constraint if exists solicitacoes_laboratorio_tipo_atividade_check,
  add constraint solicitacoes_laboratorio_tipo_atividade_check
    check (tipo_atividade is null or tipo_atividade in ('aula_pratica', 'oficina_pedagogica'));

-- Mantém a aprovação atômica e transporta o planejamento pedagógico do LabCS.
create or replace function public.aprovar_solicitacao_laboratorio(p_solicitacao_id uuid, p_decidido_por uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.solicitacoes_laboratorio%rowtype;
begin
  select * into s from public.solicitacoes_laboratorio
  where id = p_solicitacao_id and status = 'pendente' for update;
  if not found then raise exception 'A solicitação não está mais pendente.'; end if;
  if not public.pode_gerir_laboratorio(p_decidido_por, s.laboratorio_id) then
    raise exception 'Sem permissão para gerir este laboratório.';
  end if;

  insert into public.laboratorio_agendamentos(
    data, horario_id, turma_id, docente_id, componente_id, observacao, status,
    usar_projetor, usar_equipamento_som, criado_por, laboratorio_id,
    tipo_atividade, alunos_participantes, recursos_utilizados, habilidades, objeto_conhecimento
  ) values (
    s.data, s.horario_id, s.turma_id, s.docente_id, s.componente_id, s.conteudo, 'agendado',
    s.usar_projetor, s.usar_equipamento_som, p_decidido_por, s.laboratorio_id,
    s.tipo_atividade, s.alunos_participantes, s.recursos_utilizados, s.habilidades, s.objeto_conhecimento
  );

  update public.solicitacoes_laboratorio
  set status = 'aprovado', decidido_por = p_decidido_por, decidido_em = now()
  where id = s.id;
end; $$;
