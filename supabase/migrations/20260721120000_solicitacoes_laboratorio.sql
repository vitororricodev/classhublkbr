-- 1) Recursos do laboratório (projetor / equipamento de som) ficam
--    registrados junto do agendamento, para quem organiza o espaço já ver
--    de cara o que vai ser usado.
alter table public.laboratorio_agendamentos
  add column if not exists usar_projetor boolean not null default false,
  add column if not exists usar_equipamento_som boolean not null default false;

-- 2) Solicitações de uso do laboratório feitas pelo docente. O docente
--    preenche, a coordenação aprova ou rejeita. Ao aprovar, o sistema cria
--    automaticamente o registro correspondente em laboratorio_agendamentos
--    (feito pelo aplicativo, não por trigger, para manter a lógica de
--    negócio no mesmo lugar que as outras aprovações do sistema).
create table if not exists public.solicitacoes_laboratorio (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references public.docentes(id) on delete cascade,
  data date not null,
  horario_id uuid not null references public.horarios_padrao(id) on delete cascade,
  componente_id uuid not null references public.componentes_curriculares(id) on delete restrict,
  turma_id uuid not null references public.turmas(id) on delete cascade,
  conteudo text,
  usar_projetor boolean not null default false,
  usar_equipamento_som boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  motivo_rejeicao text,
  decidido_por uuid references public.usuarios(id) on delete set null,
  decidido_em timestamptz,
  criado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_solic_lab_status on public.solicitacoes_laboratorio(status);
create index if not exists idx_solic_lab_docente on public.solicitacoes_laboratorio(docente_id);
create index if not exists idx_solic_lab_data on public.solicitacoes_laboratorio(data);

alter table public.solicitacoes_laboratorio enable row level security;
drop policy if exists open_all on public.solicitacoes_laboratorio;
create policy open_all on public.solicitacoes_laboratorio for all using (true) with check (true);
grant select, insert, update, delete on public.solicitacoes_laboratorio to anon, authenticated;
