-- Reservas do Laboratório de Informática — completamente independentes de
-- planejamentos. Motivo: o laboratório é um ESPAÇO FÍSICO, e uma turma pode
-- usá-lo durante um horário em que já tem aula normal marcada (ex: a
-- professora de História leva a turma pra assistir um vídeo no horário
-- normal da aula dela). Não faz sentido cruzar isso com a checagem de
-- conflito de docente/turma de planejamentos — o único conflito real aqui é
-- duas turmas reservando o mesmo horário físico do laboratório.

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

-- Único conflito real: duas reservas no mesmo horário físico do laboratório.
create unique index if not exists uniq_lab_agendamento_horario_data
  on public.laboratorio_agendamentos (data, horario_id)
  where status <> 'cancelado';

create index if not exists idx_lab_agendamentos_data on public.laboratorio_agendamentos(data);
create index if not exists idx_lab_agendamentos_turma on public.laboratorio_agendamentos(turma_id);

alter table public.laboratorio_agendamentos enable row level security;

create policy "open_all_laboratorio_agendamentos"
  on public.laboratorio_agendamentos for all
  using (true) with check (true);

grant select, insert, update, delete on public.laboratorio_agendamentos to anon, authenticated;
