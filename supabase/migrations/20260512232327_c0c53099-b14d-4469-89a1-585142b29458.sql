
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'visualizador');

CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operador',
  ativo BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_username ON public.app_users (lower(username));

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Acesso bloqueado para o cliente; toda leitura/escrita passa por server functions com supabaseAdmin.
CREATE POLICY "no_client_access" ON public.app_users FOR ALL USING (false) WITH CHECK (false);

CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Senha "admin" hasheada com bcrypt (cost 10).
INSERT INTO public.app_users (username, nome, password_hash, role, ativo, must_change_password)
VALUES (
  'admin',
  'Administrador',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin',
  true,
  true
);
