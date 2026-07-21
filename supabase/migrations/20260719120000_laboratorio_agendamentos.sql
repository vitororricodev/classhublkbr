-- Tabela independente para controle de uso do Laboratório de Informática.
--
-- Por quê separada de "planejamentos": o laboratório é uma sala física
-- compartilhada, e seu uso não deve ser bloqueado pelas regras de conflito
-- de "uma aula oficial por turma/docente por horário" que valem para o
-- planejamento normal de aulas. Exemplo real: a professora de História já
-- tem a turma dela no horário normal, mas quer levar essa mesma turma ao
-- laboratório nesse período para exibir um vídeo — isso não é um conflito
-- de agenda dela, é um uso adicional do espaço.
--
-- Não há trava de "1 reserva por horário": na prática, o histórico mostra
-- casos legítimos de dois professores revezando o mesmo componente de
-- Informática/Computação no mesmo horário/dia. Em vez de o banco decidir
-- sozinho qual descartar, a tela mostra um aviso visual quando há mais de
-- um agendamento no mesmo horário, e o ajuste final é manual.

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

create index if not exists idx_lab_agendamentos_data on public.laboratorio_agendamentos(data);
create index if not exists idx_lab_agendamentos_horario on public.laboratorio_agendamentos(horario_id);
create index if not exists idx_lab_agendamentos_turma on public.laboratorio_agendamentos(turma_id);

alter table public.laboratorio_agendamentos enable row level security;

drop policy if exists open_all on public.laboratorio_agendamentos;
create policy open_all on public.laboratorio_agendamentos for all using (true) with check (true);

grant select, insert, update, delete on public.laboratorio_agendamentos to anon, authenticated;

-- Povoamento único: traz para a tabela nova TUDO que já estava lançado em
-- "planejamentos" para componentes marcados como "usa_laboratorio" —
-- incluindo casos em que duas turmas diferentes têm aula no mesmo
-- horário/dia (revezamento de professores). Isso NÃO remove nada de
-- planejamentos — as aulas normais de Informática continuam existindo lá
-- normalmente, com a validação de conflito delas intacta.
--
-- A checagem de duplicidade é pelo registro completo (turma + docente +
-- componente), então é seguro rodar este script mais de uma vez: não
-- insere de novo o que já foi trazido antes.
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
