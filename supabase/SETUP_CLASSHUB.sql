-- =====================================================================
-- ClassHub — Setup completo do banco (Supabase / Postgres)
-- Idempotente: pode ser executado várias vezes sem erro.
-- Sem autenticação / RLS aberto (será endurecido na fase de auth).
-- =====================================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Função utilitária: updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- Tabela: docentes
-- =====================================================================
create table if not exists public.docentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor_identificadora text not null default '#7C3AED',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Tabela: componentes_curriculares
-- =====================================================================
create table if not exists public.componentes_curriculares (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  usa_laboratorio boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Tabela: turmas
-- =====================================================================
create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  serie text not null,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Tabela: horarios_padrao
-- =====================================================================
create table if not exists public.horarios_padrao (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  hora_inicio time not null,
  hora_fim time not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Tabela: planejamentos
-- =====================================================================
create table if not exists public.planejamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  horario_id uuid not null references public.horarios_padrao(id) on delete restrict,
  docente_id uuid not null references public.docentes(id) on delete restrict,
  componente_id uuid not null references public.componentes_curriculares(id) on delete restrict,
  turma_id uuid not null references public.turmas(id) on delete restrict,
  conteudo text,
  anexo_url text,
  status text not null default 'planejado'
    check (status in ('planejado','realizado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planejamentos_data on public.planejamentos(data);
create index if not exists idx_planejamentos_docente on public.planejamentos(docente_id);
create index if not exists idx_planejamentos_turma on public.planejamentos(turma_id);

-- Impede conflitos de horário: mesma turma ou mesmo docente não podem ter
-- dois planejamentos ativos (status <> 'cancelado') na mesma data/horário.
create unique index if not exists uniq_turma_horario_data
  on public.planejamentos (data, horario_id, turma_id)
  where status <> 'cancelado';

create unique index if not exists uniq_docente_horario_data
  on public.planejamentos (data, horario_id, docente_id)
  where status <> 'cancelado';

drop trigger if exists trg_planejamentos_updated_at on public.planejamentos;
create trigger trg_planejamentos_updated_at
before update on public.planejamentos
for each row execute function public.set_updated_at();

-- =====================================================================
-- Reservas do Laboratório de Informática (independentes de planejamentos)
-- =====================================================================
create table if not exists public.laboratorio_agendamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  horario_id uuid not null references public.horarios_padrao(id) on delete cascade,
  turma_id uuid not null references public.turmas(id) on delete cascade,
  docente_id uuid references public.docentes(id) on delete set null,
  componente_id uuid references public.componentes_curriculares(id) on delete set null,
  observacao text,
  status text not null default 'agendado' check (status in ('agendado', 'realizado', 'cancelado')),
  criado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Nota: o laboratório pode ter mais de um agendamento no mesmo horário/dia
-- (ex: dois professores revezando o mesmo componente). Isso é sinalizado
-- como aviso na interface, não bloqueado no banco.
create index if not exists idx_lab_agendamentos_data on public.laboratorio_agendamentos(data);
create index if not exists idx_lab_agendamentos_turma on public.laboratorio_agendamentos(turma_id);

-- =====================================================================
-- RLS (modo aberto — autenticação ainda não implementada)
-- =====================================================================
alter table public.docentes                 enable row level security;
alter table public.componentes_curriculares enable row level security;
alter table public.turmas                   enable row level security;
alter table public.horarios_padrao          enable row level security;
alter table public.planejamentos            enable row level security;
alter table public.laboratorio_agendamentos enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'docentes','componentes_curriculares','turmas','horarios_padrao','planejamentos','laboratorio_agendamentos'
  ]) loop
    execute format('drop policy if exists open_all on public.%I', t);
    execute format(
      'create policy open_all on public.%I for all using (true) with check (true)', t
    );
  end loop;
end $$;

-- =====================================================================
-- Storage: bucket "anexos" (planejamentos)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "anexos_public_read"   on storage.objects;
drop policy if exists "anexos_public_write"  on storage.objects;
drop policy if exists "anexos_public_update" on storage.objects;
drop policy if exists "anexos_public_delete" on storage.objects;

create policy "anexos_public_read"
  on storage.objects for select
  using (bucket_id = 'anexos');

create policy "anexos_public_write"
  on storage.objects for insert
  with check (bucket_id = 'anexos');

create policy "anexos_public_update"
  on storage.objects for update
  using (bucket_id = 'anexos');

create policy "anexos_public_delete"
  on storage.objects for delete
  using (bucket_id = 'anexos');
