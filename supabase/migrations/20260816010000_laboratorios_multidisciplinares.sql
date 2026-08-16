create table if not exists public.laboratorios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('informatica', 'multidisciplinar')),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.laboratorios (slug, nome) values
  ('informatica', 'Laboratório de Informática'),
  ('multidisciplinar', 'Laboratório Multidisciplinar')
on conflict (slug) do update set nome = excluded.nome;

alter table public.laboratorio_agendamentos add column if not exists laboratorio_id uuid references public.laboratorios(id) on delete restrict;
alter table public.solicitacoes_laboratorio add column if not exists laboratorio_id uuid references public.laboratorios(id) on delete restrict;

update public.laboratorio_agendamentos set laboratorio_id = (select id from public.laboratorios where slug = 'informatica') where laboratorio_id is null;
update public.solicitacoes_laboratorio set laboratorio_id = (select id from public.laboratorios where slug = 'informatica') where laboratorio_id is null;

alter table public.laboratorio_agendamentos alter column laboratorio_id set not null;
alter table public.solicitacoes_laboratorio alter column laboratorio_id set not null;

create index if not exists idx_lab_agendamentos_laboratorio_data on public.laboratorio_agendamentos(laboratorio_id, data);
create index if not exists idx_solic_lab_laboratorio_status on public.solicitacoes_laboratorio(laboratorio_id, status);

create table if not exists public.usuarios_laboratorios (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  laboratorio_id uuid not null references public.laboratorios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, laboratorio_id)
);

alter table public.laboratorios enable row level security;
alter table public.usuarios_laboratorios enable row level security;
create policy open_all on public.laboratorios for all using (true) with check (true);
create policy open_all on public.usuarios_laboratorios for all using (true) with check (true);
grant select, insert, update, delete on public.laboratorios, public.usuarios_laboratorios to anon, authenticated;

create or replace function public.pode_gerir_laboratorio(p_usuario_id uuid, p_laboratorio_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.usuarios where id = p_usuario_id and ativo and tipo = 'admin')
      or exists(select 1 from public.usuarios_laboratorios where usuario_id = p_usuario_id and laboratorio_id = p_laboratorio_id);
$$;

create or replace function public.aprovar_solicitacao_laboratorio(p_solicitacao_id uuid, p_decidido_por uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.solicitacoes_laboratorio%rowtype;
begin
  select * into s from public.solicitacoes_laboratorio where id = p_solicitacao_id and status = 'pendente' for update;
  if not found then raise exception 'A solicitação não está mais pendente.'; end if;
  if not public.pode_gerir_laboratorio(p_decidido_por, s.laboratorio_id) then raise exception 'Sem permissão para gerir este laboratório.'; end if;
  insert into public.laboratorio_agendamentos(data, horario_id, turma_id, docente_id, componente_id, observacao, status, usar_projetor, usar_equipamento_som, criado_por, laboratorio_id)
  values (s.data, s.horario_id, s.turma_id, s.docente_id, s.componente_id, s.conteudo, 'agendado', s.usar_projetor, s.usar_equipamento_som, p_decidido_por, s.laboratorio_id);
  update public.solicitacoes_laboratorio set status='aprovado', decidido_por=p_decidido_por, decidido_em=now() where id=s.id;
end; $$;

create or replace function public.rejeitar_solicitacao_laboratorio(p_solicitacao_id uuid, p_decidido_por uuid, p_motivo_rejeicao text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_lab uuid;
begin
  select laboratorio_id into v_lab from public.solicitacoes_laboratorio where id=p_solicitacao_id and status='pendente' for update;
  if not found then raise exception 'A solicitação não está mais pendente.'; end if;
  if not public.pode_gerir_laboratorio(p_decidido_por, v_lab) then raise exception 'Sem permissão para gerir este laboratório.'; end if;
  update public.solicitacoes_laboratorio set status='rejeitado', motivo_rejeicao=nullif(trim(p_motivo_rejeicao),''), decidido_por=p_decidido_por, decidido_em=now() where id=p_solicitacao_id;
end; $$;
