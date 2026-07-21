import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MonitorSmartphone, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LAB_SELECT } from "@/lib/db";
import type { Componente, Docente, Horario, LaboratorioAgendamentoFull, StatusLab, Turma } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/laboratorio")({ component: LaboratorioPage });

// Dias da semana em que a escola funciona (1=Segunda ... 6=Sábado). Domingo (0) é sempre ignorado.
const DIAS_LETIVOS = [1, 2, 3, 4, 5, 6];

function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function startOfWeekISO(base: Date) { const d = new Date(base); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

const statusLabel: Record<StatusLab, string> = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" };

function LaboratorioPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(new Date()));
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<{ data: string; horarioId: string; editing: LaboratorioAgendamentoFull | null } | null>(null);

  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["laboratorio_agendamentos", weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laboratorio_agendamentos")
        .select(LAB_SELECT)
        .gte("data", weekStart).lte("data", weekEnd)
        .neq("status", "cancelado");
      if (error) throw error;
      return (data ?? []) as unknown as LaboratorioAgendamentoFull[];
    },
  });

  const datas = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 6; i++) {
      const dt = addDaysISO(weekStart, i);
      const dow = new Date(dt + "T00:00:00").getDay();
      if (DIAS_LETIVOS.includes(dow)) out.push(dt);
    }
    return out;
  }, [weekStart]);

  const mapa = useMemo(() => {
    const m = new Map<string, LaboratorioAgendamentoFull[]>();
    for (const a of aulas) {
      const key = `${a.data}__${a.horario_id}`;
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    return m;
  }, [aulas]);

  const abrirNova = (data: string, horarioId: string) => {
    setFormData({ data, horarioId, editing: null });
    setFormOpen(true);
  };
  const abrirEdicao = (a: LaboratorioAgendamentoFull) => {
    setFormData({ data: a.data, horarioId: a.horario_id, editing: a });
    setFormOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-primary" />Laboratório de Informática
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle, agendamento e histórico do laboratório — independente da agenda normal de aulas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeekISO(new Date()))}>Semana atual</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Semana de {fmtDate(weekStart)} a {fmtDate(weekEnd)}
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">
          {isLoading ? "Carregando..." : `${aulas.length} agendamento(s) no laboratório nesta semana.`}
        </div>
        {horarios.length === 0 ? (
          <div className="text-sm text-muted-foreground">Cadastre horários padrão para começar.</div>
        ) : (
          <div className="overflow-auto max-h-[620px] border rounded-md">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-muted z-20 whitespace-nowrap">Horário</th>
                  {datas.map((dt) => (
                    <th key={dt} className="text-center p-2 whitespace-nowrap">
                      <div className="capitalize">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                      <div className="text-xs font-normal text-muted-foreground">{fmtDate(dt)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="p-2 sticky left-0 bg-background whitespace-nowrap font-medium">
                      {h.label}
                      <div className="text-xs font-normal text-muted-foreground">
                        {h.hora_inicio?.slice(0, 5)}–{h.hora_fim?.slice(0, 5)}
                      </div>
                    </td>
                    {datas.map((dt) => {
                      const lista = mapa.get(`${dt}__${h.id}`) ?? [];
                      return (
                        <td key={dt} className="p-2 text-center align-top min-w-[160px]">
                          <div className="space-y-1.5">
                            {lista.length > 1 && (
                              <div className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <AlertTriangle className="h-3 w-3 shrink-0" />Revisar: {lista.length} agendamentos aqui
                              </div>
                            )}
                            {lista.map((a) => (
                              <div key={a.id} className="rounded-md border p-2 space-y-1 text-left" style={{ borderLeft: `4px solid ${a.docentes?.cor_identificadora || "#7C3AED"}` }}>
                                <div className="text-xs font-medium">{a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}</div>
                                {a.docentes && <div className="text-[11px] text-muted-foreground">{a.docentes.nome}</div>}
                                {a.componentes_curriculares && <div className="text-[11px] text-muted-foreground">{a.componentes_curriculares.nome}</div>}
                                {a.observacao && <div className="text-[11px] text-muted-foreground italic">{a.observacao}</div>}
                                <div className="flex gap-1 pt-1">
                                  <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => abrirEdicao(a)}><Pencil className="h-3 w-3" /></Button>
                                  <ExcluirBotao id={a.id} />
                                </div>
                              </div>
                            ))}
                            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => abrirNova(dt, h.id)}>
                              <Plus className="h-4 w-4 mr-1" />{lista.length === 0 ? "Agendar" : "Adicionar outro"}
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formData && (
        <LaboratorioAgendamentoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          data={formData.data}
          horarioId={formData.horarioId}
          editing={formData.editing}
        />
      )}
    </div>
  );
}

function ExcluirBotao({ id }: { id: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("laboratorio_agendamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento excluído");
      qc.invalidateQueries({ queryKey: ["laboratorio_agendamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      size="sm" variant="outline" className="h-6 px-1.5"
      onClick={() => { if (confirm("Excluir este agendamento do laboratório?")) del.mutate(); }}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

function LaboratorioAgendamentoForm({
  open, onClose, data, horarioId, editing,
}: {
  open: boolean; onClose: () => void; data: string; horarioId: string; editing: LaboratorioAgendamentoFull | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [turmaId, setTurmaId] = useState("");
  const [docenteId, setDocenteId] = useState<string>("none");
  const [componenteId, setComponenteId] = useState<string>("none");
  const [observacao, setObservacao] = useState("");
  const [status, setStatus] = useState<StatusLab>("agendado");

  useEffect(() => {
    if (editing) {
      setTurmaId(editing.turma_id);
      setDocenteId(editing.docente_id ?? "none");
      setComponenteId(editing.componente_id ?? "none");
      setObservacao(editing.observacao ?? "");
      setStatus(editing.status);
    } else {
      setTurmaId(""); setDocenteId("none"); setComponenteId("none"); setObservacao(""); setStatus("agendado");
    }
  }, [editing, open]);

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("turmas").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Turma[]; },
  });
  const { data: docentes = [] } = useQuery({
    queryKey: ["docentes", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("docentes").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Docente[]; },
  });
  const { data: componentes = [] } = useQuery({
    queryKey: ["componentes", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("componentes_curriculares").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Componente[]; },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!turmaId) throw new Error("Selecione a turma.");
      const payload = {
        data, horario_id: horarioId, turma_id: turmaId,
        docente_id: docenteId === "none" ? null : docenteId,
        componente_id: componenteId === "none" ? null : componenteId,
        observacao: observacao || null,
        status,
      };

      // Aviso não-bloqueante: só avisa se já existir outro agendamento no
      // mesmo horário/dia — não impede de salvar, é uma checagem só pra
      // ajudar a organizar (ex: revezamento de professores no lab).
      const { data: outros, error: chkErr } = await supabase
        .from("laboratorio_agendamentos")
        .select("id")
        .eq("data", data)
        .eq("horario_id", horarioId)
        .neq("status", "cancelado");
      if (!chkErr) {
        const conflito = (outros ?? []).some((o) => o.id !== editing?.id);
        if (conflito) {
          toast.warning("Já existe outro agendamento neste horário — confira se não é duplicado.");
        }
      }

      if (editing) {
        const { error } = await supabase.from("laboratorio_agendamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("laboratorio_agendamentos").insert({ ...payload, criado_por: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Agendamento atualizado" : "Laboratório agendado");
      qc.invalidateQueries({ queryKey: ["laboratorio_agendamentos"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar agendamento do laboratório" : "Agendar laboratório"}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground -mt-2">
          {fmtDate(data)} · este agendamento não depende da agenda normal de aulas — a turma e o docente podem ter outra aula no mesmo horário sem problema.
        </div>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.serie} — {t.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Docente responsável (opcional)</Label>
            <Select value={docenteId} onValueChange={setDocenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Componente / disciplina (opcional)</Label>
            <Select value={componenteId} onValueChange={setComponenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {componentes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>O que vai ser feito</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Assistir vídeo sobre a Segunda Guerra Mundial" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusLab)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">{statusLabel.agendado}</SelectItem>
                <SelectItem value="realizado">{statusLabel.realizado}</SelectItem>
                <SelectItem value="cancelado">{statusLabel.cancelado}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
