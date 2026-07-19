-- Marca quais componentes curriculares ocupam o Laboratório de Informática.
-- Usado no relatório de disponibilidade do laboratório (ver relatorios.tsx).
ALTER TABLE public.componentes_curriculares
  ADD COLUMN IF NOT EXISTS usa_laboratorio BOOLEAN NOT NULL DEFAULT false;

-- Melhor esforço: marca automaticamente componentes já cadastrados que
-- claramente são de Informática/Computação. Pode ser ajustado manualmente
-- depois na tela de Componentes Curriculares.
UPDATE public.componentes_curriculares
SET usa_laboratorio = true
WHERE usa_laboratorio = false
  AND (nome ILIKE '%inform%' OR nome ILIKE '%comput%');
