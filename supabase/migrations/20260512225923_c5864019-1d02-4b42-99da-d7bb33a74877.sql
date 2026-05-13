
-- DOCENTES
CREATE TABLE public.docentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor_identificadora TEXT NOT NULL DEFAULT '#7C3AED',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMPONENTES CURRICULARES
CREATE TABLE public.componentes_curriculares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TURMAS
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HORARIOS PADRAO
CREATE TABLE public.horarios_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PLANEJAMENTOS
CREATE TABLE public.planejamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  horario_id UUID NOT NULL REFERENCES public.horarios_padrao(id) ON DELETE RESTRICT,
  docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE RESTRICT,
  componente_id UUID NOT NULL REFERENCES public.componentes_curriculares(id) ON DELETE RESTRICT,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  conteudo TEXT,
  anexo_url TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado','realizado','cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices unicos para evitar conflitos (ignora cancelados)
CREATE UNIQUE INDEX uniq_docente_horario_data
  ON public.planejamentos (data, horario_id, docente_id)
  WHERE status <> 'cancelado';

CREATE UNIQUE INDEX uniq_turma_horario_data
  ON public.planejamentos (data, horario_id, turma_id)
  WHERE status <> 'cancelado';

CREATE INDEX idx_planejamentos_data ON public.planejamentos (data);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_planejamentos_updated
BEFORE UPDATE ON public.planejamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS - acesso aberto (uso interno)
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.componentes_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.docentes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.componentes_curriculares FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.turmas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.horarios_padrao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.planejamentos FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('anexos', 'anexos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anexos_read" ON storage.objects FOR SELECT USING (bucket_id = 'anexos');
CREATE POLICY "anexos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'anexos');
CREATE POLICY "anexos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'anexos');
CREATE POLICY "anexos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'anexos');
