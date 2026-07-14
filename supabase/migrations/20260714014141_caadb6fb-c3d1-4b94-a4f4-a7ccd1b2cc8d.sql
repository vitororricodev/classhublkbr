ALTER TABLE public.planejamentos
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

UPDATE public.planejamentos
   SET owner_id = (SELECT id FROM public.usuarios WHERE usuario = 'admin' LIMIT 1)
 WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS planejamentos_owner_id_idx ON public.planejamentos(owner_id);