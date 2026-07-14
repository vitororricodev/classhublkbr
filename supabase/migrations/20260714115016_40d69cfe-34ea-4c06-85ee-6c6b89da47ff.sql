
-- Add criado_por to planejamentos
alter table public.planejamentos
  add column if not exists criado_por uuid references public.usuarios(id) on delete set null;

create index if not exists idx_planejamentos_criado_por on public.planejamentos(criado_por);

-- View exposing usuarios sem senha (para joins de leitura no admin)
create or replace view public.usuarios_public as
  select id, usuario, nome, tipo, ativo from public.usuarios;

grant select on public.usuarios_public to anon, authenticated;

-- RPCs de gerenciamento de usuários (SECURITY DEFINER, RLS-safe)
create or replace function public.listar_usuarios()
returns table(id uuid, usuario text, nome text, tipo text, ativo boolean, primeiro_login boolean, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, usuario, nome, tipo, ativo, primeiro_login, created_at
  from public.usuarios order by created_at desc;
$$;

create or replace function public.criar_usuario(
  p_usuario text, p_nome text, p_senha text, p_tipo text, p_ativo boolean
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
  insert into public.usuarios(usuario, nome, senha_hash, tipo, ativo, primeiro_login)
  values (p_usuario, p_nome, crypt(p_senha, gen_salt('bf', 10)), p_tipo, coalesce(p_ativo,true), true)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.atualizar_usuario(
  p_id uuid, p_nome text, p_tipo text, p_ativo boolean
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
      -- garantir pelo menos um admin ativo
      if (select tipo from public.usuarios where id = p_id) = 'admin'
         and (select ativo from public.usuarios where id = p_id) = true then
        raise exception 'Deve existir pelo menos um administrador ativo.';
      end if;
    end if;
  end if;
  update public.usuarios set nome = p_nome, tipo = p_tipo, ativo = p_ativo where id = p_id;
end $$;

create or replace function public.resetar_senha_usuario(p_id uuid, p_nova text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_nova,'')) < 4 then
    raise exception 'A nova senha deve ter pelo menos 4 caracteres.';
  end if;
  update public.usuarios
    set senha_hash = crypt(p_nova, gen_salt('bf', 10)),
        primeiro_login = true
    where id = p_id;
end $$;

create or replace function public.excluir_usuario(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select tipo from public.usuarios where id = p_id) = 'admin'
     and (select count(*) from public.usuarios where tipo = 'admin' and ativo = true) <= 1 then
    raise exception 'Não é possível excluir o último administrador ativo.';
  end if;
  delete from public.usuarios where id = p_id;
end $$;

grant execute on function public.listar_usuarios() to anon, authenticated;
grant execute on function public.criar_usuario(text,text,text,text,boolean) to anon, authenticated;
grant execute on function public.atualizar_usuario(uuid,text,text,boolean) to anon, authenticated;
grant execute on function public.resetar_senha_usuario(uuid,text) to anon, authenticated;
grant execute on function public.excluir_usuario(uuid) to anon, authenticated;
