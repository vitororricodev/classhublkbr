import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Docente, Componente, Turma, Horario } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

type Props = { open: boolean; onClose: () => void };

const DIAS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ReplicarAulasDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [docenteId, setDocenteId] = useState("");
  const [componenteId, setComponenteId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [conteudo, setConteudo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<{ criadas: number; conflitos: { data: string; motivo: string }[] } | null>(null);

  const { data: docentes = [] } = useQuery({
    queryKey: ["docentes", "ativos"],
    queryFn: async () => (await supabase.from("docentes").select("*").eq("ativo", true).order("nome")).data as Docente[],
  });
  const { data: componentes = [] } = useQuery({
    queryKey: ["componentes", "ativos"],
    queryFn: async () => (await supabase.from("componentes_curriculares").select("*").eq("ativo", true).order("nome")).data as Componente[],
  });
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", "ativos"],
    queryFn: async () => (await supabase.from("turmas").select("*").eq("ativo", true).order("nome")).data as Turma[],
  });
  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos"],
    queryFn: async () => (await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem")).data as Horario[],
  });

  const datasGeradas = useMemo(() => {
    if (!dataInicial || !dataFinal || diasSemana.length === 0) return [];
    const out: string[] = [];
    const start = new Date(dataInicial + "T00:00:00");
    const end = new Date(dataFinal + "T00:00:00");
    if (start > end) return [];
    const d = new Date(start);
    while (d <= end) {
      if (diasSemana.includes(d.getDay())) out.push(fmtISO(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [dataInicial, dataFinal, diasSemana]);

  function reset() {
    setDocenteId(""); setComponenteId(""); setTurmaId(""); setHorarioId("");
    setDataInicial(""); setDataFinal(""); setDiasSemana([]); setConteudo("");
    setConfirmando(false); setResumo(null); setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  function toggleDia(v: number) {
    setDiasSemana((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  function validar(): string | null {
    if (!docenteId) return "Selecione o docente";
    if (!componenteId) return "Selecione o componente";
    if (!turmaId) return "Selecione a turma";
    if (!horarioId) return "Selecione o horário";
    if (!dataInicial || !dataFinal) return "Informe o período";
    if (new Date(dataInicial) > new Date(dataFinal)) return "Data inicial deve ser anterior à final";
    if (diasSemana.length === 0) return "Selecione ao menos um dia da semana";
    if (datasGeradas.length === 0) return "Nenhuma data gerada para o período/dias selecionados";
    return null;
  }

  async function executar() {
    setLoading(true);
    try {
      // Buscar todos os planejamentos existentes nas datas + horário
      const { data: existentes, error } = await supabase
        .from("planejamentos")
        .select("data, docente_id, turma_id, status")
        .in("data", datasGeradas)
        .eq("horario_id", horarioId)
        .neq("status", "cancelado");
      if (error) throw error;

      const conflitos: { data: string; motivo: string }[] = [];
      const aCriar: { data: string; horario_id: string; docente_id: string; componente_id: string; turma_id: string; conteudo: string | null; status: string; owner_id: string | null }[] = [];

      for (const dt of datasGeradas) {
        const noDia = (existentes ?? []).filter((p) => p.data === dt);
        const conflitoDocente = noDia.some((p) => p.docente_id === docenteId);
        const conflitoTurma = noDia.some((p) => p.turma_id === turmaId);
        if (conflitoDocente || conflitoTurma) {
          conflitos.push({
            data: dt,
            motivo: conflitoDocente && conflitoTurma ? "Docente e turma ocupados" : conflitoDocente ? "Docente já tem aula" : "Turma já ocupada",
          });
          continue;
        }
        aCriar.push({
          data: dt, horario_id: horarioId, docente_id: docenteId,
          componente_id: componenteId, turma_id: turmaId,
          conteudo: conteudo || null, status: "planejado", owner_id: user?.id ?? null,
        });
      }

      let criadas = 0;
      if (aCriar.length > 0) {
        const { error: insErr, data: ins } = await supabase.from("planejamentos").insert(aCriar).select("id");
        if (insErr) throw insErr;
        criadas = ins?.length ?? aCriar.length;
      }

      setResumo({ criadas, conflitos });
      qc.invalidateQueries({ queryKey: ["planejamentos"] });
      qc.invalidateQueries({ queryKey: ["planejamentos-dia"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(`Replicação concluída: ${criadas} aulas criadas e ${conflitos.length} conflitos ignorados.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setConfirmando(false);
    }
  }

  function handlePrimary() {
    if (resumo) { handleClose(); return; }
    if (confirmando) { executar(); return; }
    const err = validar();
    if (err) { toast.error(err); return; }
    setConfirmando(true);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replicar Aulas</DialogTitle>
          <DialogDescription>
            Gere automaticamente planejamentos repetidos em um período.
          </DialogDescription>
        </DialogHeader>

        {resumo ? (
          <div className="space-y-3 py-2">
            <div className="rounded-md border p-4 space-y-1">
              <div className="text-sm">Total de datas geradas: <b>{datasGeradas.length}</b></div>
              <div className="text-sm text-green-700">Criadas com sucesso: <b>{resumo.criadas}</b></div>
              <div className="text-sm text-amber-700">Conflitos ignorados: <b>{resumo.conflitos.length}</b></div>
            </div>
            {resumo.conflitos.length > 0 && (
              <div className="rounded-md border max-h-60 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-medium bg-secondary">Conflitos</div>
                <ul className="divide-y text-sm">
                  {resumo.conflitos.map((c, i) => (
                    <li key={i} className="px-3 py-2 flex justify-between gap-2">
                      <span>{new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      <span className="text-muted-foreground">{c.motivo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Docente</Label>
                <Select value={docenteId} onValueChange={setDocenteId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Componente curricular</Label>
                <Select value={componenteId} onValueChange={setComponenteId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{componentes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma</Label>
                <Select value={turmaId} onValueChange={setTurmaId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.serie} — {t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horário padrão</Label>
                <Select value={horarioId} onValueChange={setHorarioId} disabled={loading}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{horarios.map((h) => <SelectItem key={h.id} value={h.id}>{h.label} ({h.hora_inicio?.slice(0,5)}–{h.hora_fim?.slice(0,5)})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-3">
                {DIAS.map((d) => (
                  <label key={d.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={diasSemana.includes(d.value)}
                      onCheckedChange={() => toggleDia(d.value)}
                      disabled={loading}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo padrão (opcional)</Label>
              <Textarea rows={2} value={conteudo} onChange={(e) => setConteudo(e.target.value)} disabled={loading} placeholder="Conteúdo aplicado a todas as aulas geradas..." />
            </div>

            {datasGeradas.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Serão geradas <b>{datasGeradas.length}</b> aulas. Status padrão: <b>planejado</b>.
              </div>
            )}

            {confirmando && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Confirmar geração de {datasGeradas.length} aulas? Conflitos serão ignorados automaticamente.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {resumo ? "Fechar" : "Cancelar"}
          </Button>
          {!resumo && (
            <Button onClick={handlePrimary} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Replicando...</> : confirmando ? "Confirmar replicação" : "Replicar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
