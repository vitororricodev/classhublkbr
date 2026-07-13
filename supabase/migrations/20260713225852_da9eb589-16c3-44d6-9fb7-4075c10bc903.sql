
create extension if not exists pgcrypto;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  nome text not null,
  senha_hash text not null,
  tipo text not null default 'usuario' check (tipo in ('admin','usuario')),
  ativo boolean not null default true,
  primeiro_login boolean not null default true,
  created_at timestamptz not null default now()
);

grant all on public.usuarios to service_role;
-- No grants to anon/authenticated: table access happens only via SECURITY DEFINER functions below.

alter table public.usuarios enable row level security;

drop policy if exists no_client_access on public.usuarios;
create policy no_client_access on public.usuarios for all using (false) with check (false);

-- Login: valida credenciais e retorna dados públicos do usuário
create or replace function public.login_usuario(p_usuario text, p_senha text)
returns table (id uuid, usuario text, nome text, tipo text, primeiro_login boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select u.id, u.usuario, u.nome, u.tipo, u.primeiro_login
  from public.usuarios u
  where u.usuario = p_usuario
    and u.ativo = true
    and u.senha_hash = crypt(p_senha, u.senha_hash);
end;
$$;

revoke all on function public.login_usuario(text, text) from public;
grant execute on function public.login_usuario(text, text) to anon, authenticated;

-- Alterar senha (usada tanto no primeiro login quanto em trocas normais)
create or replace function public.alterar_senha_usuario(
  p_usuario_id uuid,
  p_senha_atual text,
  p_nova_senha text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match uuid;
begin
  if length(coalesce(p_nova_senha, '')) < 4 then
    raise exception 'A nova senha deve ter pelo menos 4 caracteres.';
  end if;

  select id into v_match
  from public.usuarios
  where id = p_usuario_id
    and ativo = true
    and senha_hash = crypt(p_senha_atual, senha_hash);

  if v_match is null then
    raise exception 'Senha atual incorreta.';
  end if;

  update public.usuarios
  set senha_hash = crypt(p_nova_senha, gen_salt('bf', 10)),
      primeiro_login = false
  where id = p_usuario_id;

  return true;
end;
$$;

revoke all on function public.alterar_senha_usuario(uuid, text, text) from public;
grant execute on function public.alterar_senha_usuario(uuid, text, text) to anon, authenticated;

-- Semear admin inicial apenas se não existir nenhum usuário
insert into public.usuarios (usuario, nome, senha_hash, tipo, ativo, primeiro_login)
select 'admin', 'Administrador', crypt('admin', gen_salt('bf', 10)), 'admin', true, true
where not exists (select 1 from public.usuarios);
