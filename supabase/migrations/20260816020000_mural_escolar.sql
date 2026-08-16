create table if not exists public.mural_publicacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 3 and 140),
  conteudo text not null check (char_length(trim(conteudo)) between 3 and 4000),
  tipo text not null default 'aviso' check (tipo in ('aviso', 'evento', 'destaque')),
  data_evento date,
  hora_evento time,
  inicio_exibicao date not null default current_date,
  fim_exibicao date,
  fixado boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mural_periodo_valido check (fim_exibicao is null or fim_exibicao >= inicio_exibicao),
  constraint mural_evento_com_data check (tipo <> 'evento' or data_evento is not null)
);

create index if not exists idx_mural_publicacoes_visibilidade
  on public.mural_publicacoes(ativo, inicio_exibicao, fim_exibicao);
create index if not exists idx_mural_publicacoes_evento
  on public.mural_publicacoes(data_evento) where tipo = 'evento' and ativo;

drop trigger if exists trg_mural_publicacoes_updated_at on public.mural_publicacoes;
create trigger trg_mural_publicacoes_updated_at
before update on public.mural_publicacoes
for each row execute function public.set_updated_at();

alter table public.mural_publicacoes enable row level security;
drop policy if exists open_all on public.mural_publicacoes;
create policy open_all on public.mural_publicacoes for all using (true) with check (true);
grant select, insert, update, delete on public.mural_publicacoes to anon, authenticated;
