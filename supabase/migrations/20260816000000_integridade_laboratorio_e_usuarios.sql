-- Operações críticas executadas de modo atômico no banco.

create or replace function public.aprovar_solicitacao_laboratorio(
  p_solicitacao_id uuid,
  p_decidido_por uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitacao public.solicitacoes_laboratorio%rowtype;
begin
  if not exists (
    select 1 from public.usuarios
    where id = p_decidido_por and tipo = 'admin' and ativo = true
  ) then
    raise exception 'Somente um administrador ativo pode aprovar solicitações.';
  end if;

  select * into v_solicitacao
  from public.solicitacoes_laboratorio
  where id = p_solicitacao_id and status = 'pendente'
  for update;

  if not found then
    raise exception 'A solicitação não está mais pendente.';
  end if;

  insert into public.laboratorio_agendamentos (
    data, horario_id, turma_id, docente_id, componente_id, observacao,
    status, usar_projetor, usar_equipamento_som, criado_por
  ) values (
    v_solicitacao.data, v_solicitacao.horario_id, v_solicitacao.turma_id,
    v_solicitacao.docente_id, v_solicitacao.componente_id, v_solicitacao.conteudo,
    'agendado', v_solicitacao.usar_projetor, v_solicitacao.usar_equipamento_som,
    p_decidido_por
  );

  update public.solicitacoes_laboratorio
  set status = 'aprovado', decidido_por = p_decidido_por, decidido_em = now()
  where id = p_solicitacao_id;
end;
$$;

create or replace function public.rejeitar_solicitacao_laboratorio(
  p_solicitacao_id uuid,
  p_decidido_por uuid,
  p_motivo_rejeicao text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.usuarios
    where id = p_decidido_por and tipo = 'admin' and ativo = true
  ) then
    raise exception 'Somente um administrador ativo pode rejeitar solicitações.';
  end if;

  update public.solicitacoes_laboratorio
  set status = 'rejeitado', motivo_rejeicao = nullif(trim(p_motivo_rejeicao), ''),
      decidido_por = p_decidido_por, decidido_em = now()
  where id = p_solicitacao_id and status = 'pendente';

  if not found then
    raise exception 'A solicitação não está mais pendente.';
  end if;
end;
$$;

grant execute on function public.aprovar_solicitacao_laboratorio(uuid, uuid) to anon, authenticated;
grant execute on function public.rejeitar_solicitacao_laboratorio(uuid, uuid, text) to anon, authenticated;
