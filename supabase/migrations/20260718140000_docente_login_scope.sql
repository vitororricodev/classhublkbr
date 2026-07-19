-- 1) Corrige bugs de autenticação introduzidos quando a tabela usuarios
--    trocou de senha_hash (bcrypt) para senha (texto puro) em
--    20260713234654_f7a24bce-38e0-4786-b7c2-83032d0edd86.sql:
--    - criar_usuario e resetar_senha_usuario ainda escreviam em senha_hash,
--      coluna que não existe mais -> falhava em runtime.
--    - alterar_senha_usuario foi dropada nessa mesma migration e nunca
--      recriada -> a tela "Alterar Senha" (obrigatória no primeiro login)
--      chamava uma função inexistente.

drop function if exists public.criar_usuario(text, text, text, text, boolean);
drop function if exists public.atualizar_usuario(uuid, text, text, boolean);
drop function if exists public.resetar_senha_usuario(uuid, text);
drop function if exists public.alterar_senha_usuario(uuid, text, text);
drop function if exists public.listar_usuarios();

-- 2) Vínculo do login com o docente (para restringir a visão do professor
--    às próprias aulas, e alimentar o relatório do docente).
alter table public.usuarios
  add column if not exists docente_id uuid references public.docentes(id) on delete set null;

create index if not exists idx_usuarios_docente_id on public.usuarios(docente_id);

-- 3) Recria as funções de gerenciamento de usuário, já usando "senha" (texto
--    puro) e aceitando docente_id.

create or replace function public.listar_usuarios()
returns table(
  id uuid, usuario text, nome text, tipo text, ativo boolean,
  primeiro_login boolean, created_at timestamptz,
  docente_id uuid, docente_nome text
)
language sql security definer set search_path = public as $$
  select u.id, u.usuario, u.nome, u.tipo, u.ativo, u.primeiro_login, u.created_at,
         u.docente_id, d.nome as docente_nome
  from public.usuarios u
  left join public.docentes d on d.id = u.docente_id
  order by u.created_at desc;
$$;

create or replace function public.criar_usuario(
  p_usuario text, p_nome text, p_senha text, p_tipo text, p_ativo boolean,
  p_docente_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(p_usuario,'') = '' or coalesce(p_nome,'') = '' or coalesce(p_senha,'') = '' then
    raise exception 'Usuário, nome e senha são obrigatórios.';
  end if;
  if p_tipo not in ('admin','usuario') then
    raise exception 'Tipo inválido.';
  end if;
  if exists(select 1 from public.usuarios where usuario = p_usuario) then
    raise exception 'Já existe um usuário com esse login.';
  end if;
  insert into public.usuarios(usuario, nome, senha, tipo, ativo, primeiro_login, docente_id)
  values (p_usuario, p_nome, p_senha, p_tipo, coalesce(p_ativo, true), true, p_docente_id)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.atualizar_usuario(
  p_id uuid, p_nome text, p_tipo text, p_ativo boolean, p_docente_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('admin','usuario') then
    raise exception 'Tipo inválido.';
  end if;
  if p_ativo = false or p_tipo <> 'admin' then
    if not exists (
      select 1 from public.usuarios
      where ativo = true and tipo = 'admin' and id <> p_id
    ) then
      if (select tipo from public.usuarios where id = p_id) = 'admin'
         and (select ativo from public.usuarios where id = p_id) = true then
        raise exception 'Deve existir pelo menos um administrador ativo.';
      end if;
    end if;
  end if;
  update public.usuarios
    set nome = p_nome, tipo = p_tipo, ativo = p_ativo, docente_id = p_docente_id
    where id = p_id;
end $$;

create or replace function public.resetar_senha_usuario(p_id uuid, p_nova text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_nova,'')) < 4 then
    raise exception 'A nova senha deve ter pelo menos 4 caracteres.';
  end if;
  update public.usuarios
    set senha = p_nova,
        primeiro_login = true
    where id = p_id;
end $$;

create or replace function public.alterar_senha_usuario(
  p_usuario_id uuid,
  p_senha_atual text,
  p_nova_senha text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_match uuid;
begin
  if length(coalesce(p_nova_senha, '')) < 4 then
    raise exception 'A nova senha deve ter pelo menos 4 caracteres.';
  end if;

  select id into v_match
  from public.usuarios
  where id = p_usuario_id
    and ativo = true
    and senha = p_senha_atual;

  if v_match is null then
    raise exception 'Senha atual incorreta.';
  end if;

  update public.usuarios
  set senha = p_nova_senha,
      primeiro_login = false
  where id = p_usuario_id;

  return true;
end $$;

grant execute on function public.listar_usuarios() to anon, authenticated;
grant execute on function public.criar_usuario(text, text, text, text, boolean, uuid) to anon, authenticated;
grant execute on function public.atualizar_usuario(uuid, text, text, boolean, uuid) to anon, authenticated;
grant execute on function public.resetar_senha_usuario(uuid, text) to anon, authenticated;
grant execute on function public.alterar_senha_usuario(uuid, text, text) to anon, authenticated;
