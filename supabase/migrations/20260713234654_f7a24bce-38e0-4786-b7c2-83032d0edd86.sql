-- Simplificar autenticação: remover hash e usar senha em texto plano (uso interno)
DROP FUNCTION IF EXISTS public.login_usuario(text, text);
DROP FUNCTION IF EXISTS public.alterar_senha_usuario(uuid, text, text);

ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha_hash;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS senha text NOT NULL DEFAULT 'admin';

-- Garante admin com senha 'admin'
UPDATE public.usuarios SET senha = 'admin' WHERE usuario = 'admin';

INSERT INTO public.usuarios (usuario, nome, senha, tipo, primeiro_login, ativo)
SELECT 'admin', 'Administrador', 'admin', 'admin', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios WHERE usuario = 'admin');

-- Permitir leitura/escrita direta pelo cliente (uso interno)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO anon, authenticated;
GRANT ALL ON public.usuarios TO service_role;

DROP POLICY IF EXISTS no_client_access ON public.usuarios;
CREATE POLICY open_all ON public.usuarios FOR ALL USING (true) WITH CHECK (true);