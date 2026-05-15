create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  tipo text not null default 'municipal' check (tipo in ('nacional','municipal')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_feriados_data on public.feriados(data);

alter table public.feriados enable row level security;

drop policy if exists open_all on public.feriados;
create policy open_all on public.feriados for all using (true) with check (true);
