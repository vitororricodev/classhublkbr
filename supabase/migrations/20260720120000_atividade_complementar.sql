-- 1) Marca qual horário padrão é o intervalo/recreio, para os relatórios
--    poderem destacá-lo visualmente (em vez de aparecer em branco, que
--    estava sendo confundido com horário vago).
alter table public.horarios_padrao
  add column if not exists eh_intervalo boolean not null default false;

update public.horarios_padrao
set eh_intervalo = true
where eh_intervalo = false and label ilike '%interval%';

-- 2) Categorias de Atividade Complementar (AC): catálogo editável pela
--    coordenação (ex: Humanas, Exatas, Linguagens...).
create table if not exists public.categorias_ac (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categorias_ac enable row level security;
drop policy if exists open_all on public.categorias_ac;
create policy open_all on public.categorias_ac for all using (true) with check (true);
grant select, insert, update, delete on public.categorias_ac to anon, authenticated;

-- 3) Atividades Complementares lançadas pela coordenação no horário do
--    docente. Um docente só pode ter 1 AC por horário/dia (mas isso não
--    interfere em nada da agenda normal de aulas do docente).
create table if not exists public.atividades_complementares (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references public.docentes(id) on delete cascade,
  data date not null,
  horario_id uuid not null references public.horarios_padrao(id) on delete cascade,
  categoria_id uuid not null references public.categorias_ac(id) on delete restrict,
  observacao text,
  criado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_ac_docente_horario_data
  on public.atividades_complementares (docente_id, data, horario_id);

create index if not exists idx_ac_docente on public.atividades_complementares(docente_id);
create index if not exists idx_ac_data on public.atividades_complementares(data);

alter table public.atividades_complementares enable row level security;
drop policy if exists open_all on public.atividades_complementares;
create policy open_all on public.atividades_complementares for all using (true) with check (true);
grant select, insert, update, delete on public.atividades_complementares to anon, authenticated;
