import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanejamentoForm } from "@/components/PlanejamentoForm";
import { ReplicarAulasDialog } from "@/components/ReplicarAulasDialog";
import { Copy } from "lucide-react";
import type { Docente, Componente, Turma, Horario, PlanejamentoFull, Status } from "@/lib/db";
import { PLAN_SELECT } from "@/lib/db";

export const Route = createFileRoute("/agendamento")({ component: AgendamentoPage });

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MES_LABEL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function AgendamentoPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [replicarOpen, setReplicarOpen] = useState(false);
  const [filtros, setFiltros] = useState({ docente: "all", componente: "all", turma: "all", status: "all" });

  const { data: docentes = [] } = useQuery({ queryKey: ["docentes"], queryFn: async () => (await supabase.from("docentes").select("*").order("nome")).data as Docente[] });
  const { data: componentes = [] } = useQuery({ queryKey: ["componentes"], queryFn: async () => (await supabase.from("componentes_curriculares").select("*").order("nome")).data as Componente[] });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: async () => (await supabase.from("turmas").select("*").order("nome")).data as Turma[] });
  const { data: horarios = [] } = useQuery({ queryKey: ["horarios"], queryFn: async () => (await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem")).data as Horario[] });

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);

  const { data: planejamentos = [] } = useQuery({
    queryKey: ["planejamentos", fmtISO(monthStart), fmtISO(monthEnd), filtros],
    queryFn: async () => {
      let q = supabase.from("planejamentos").select(PLAN_SELECT)
        .gte("data", fmtISO(monthStart)).lte("data", fmtISO(monthEnd));
      if (filtros.docente !== "all") q = q.eq("docente_id", filtros.docente);
      if (filtros.componente !== "all") q = q.eq("componente_id", filtros.componente);
      if (filtros.turma !== "all") q = q.eq("turma_id", filtros.turma);
      if (filtros.status !== "all") q = q.eq("status", filtros.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PlanejamentoFull[];
    },
  });

  const eventosPorDia = useMemo(() => {
    const m: Record<string, PlanejamentoFull[]> = {};
    for (const p of planejamentos) {
      (m[p.data] ||= []).push(p);
    }
    return m;
  }, [planejamentos]);

  // Construir grade do mês
  const grid = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(start.getDate() - start.getDay()); // começa no Domingo
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d);
    }
    return cells;
  }, [monthStart]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agendamento</h1>
          <p className="text-sm text-muted-foreground">Calendário de planejamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-4 py-1.5 rounded-md bg-secondary font-medium min-w-44 text-center">{MES_LABEL[cursor.getMonth()]} {cursor.getFullYear()}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>Hoje</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FiltroSelect label="Docente" value={filtros.docente} onChange={(v) => setFiltros({ ...filtros, docente: v })} options={[{ value: "all", label: "Todos" }, ...docentes.map((d) => ({ value: d.id, label: d.nome }))]} />
          <FiltroSelect label="Componente" value={filtros.componente} onChange={(v) => setFiltros({ ...filtros, componente: v })} options={[{ value: "all", label: "Todos" }, ...componentes.map((d) => ({ value: d.id, label: d.nome }))]} />
          <FiltroSelect label="Turma" value={filtros.turma} onChange={(v) => setFiltros({ ...filtros, turma: v })} options={[{ value: "all", label: "Todas" }, ...turmas.map((d) => ({ value: d.id, label: `${d.serie} — ${d.nome}` }))]} />
          <FiltroSelect label="Status" value={filtros.status} onChange={(v) => setFiltros({ ...filtros, status: v })} options={[
            { value: "all", label: "Todos" }, { value: "planejado", label: "Planejado" }, { value: "realizado", label: "Realizado" }, { value: "cancelado", label: "Cancelado" }
          ]} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 bg-secondary text-xs font-medium">
          {DOW.map((d) => <div key={d} className="px-2 py-2 text-center border-b">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const iso = fmtISO(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = iso === fmtISO(new Date());
            const events = eventosPorDia[iso] ?? [];
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(iso)}
                className={`min-h-28 text-left p-2 border-b border-r last:border-r-0 transition-colors hover:bg-accent/30 ${inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground"}`}
              >
                <div className={`text-xs font-medium mb-1 inline-flex items-center justify-center h-6 w-6 rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}>{d.getDate()}</div>
                <div className="space-y-1">
                  {events.slice(0, 3).map((e) => (
                    <div key={e.id} className="text-[11px] truncate rounded px-1.5 py-0.5 border"
                      style={{ backgroundColor: hexAlpha(e.docentes?.cor_identificadora || "#7C3AED", 0.18), borderColor: hexAlpha(e.docentes?.cor_identificadora || "#7C3AED", 0.4), color: "#3b1078" }}
                      title={`${e.horarios_padrao?.label} • ${e.turmas?.nome} • ${e.componentes_curriculares?.nome}`}
                    >
                      {e.horarios_padrao?.hora_inicio?.slice(0,5)} {e.turmas?.nome} · {e.componentes_curriculares?.nome}
                    </div>
                  ))}
                  {events.length > 3 && <div className="text-[10px] text-muted-foreground">+{events.length - 3} aulas</div>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <DiaSheet
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        horarios={horarios}
      />
    </div>
  );
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function FiltroSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function DiaSheet({ date, onClose, horarios }: { date: string | null; onClose: () => void; horarios: Horario[] }) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanejamentoFull | null>(null);
  const [horarioId, setHorarioId] = useState<string>("");

  const { data: dia = [] } = useQuery({
    queryKey: ["planejamentos-dia", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await supabase.from("planejamentos").select(PLAN_SELECT).eq("data", date!);
      if (error) throw error;
      return (data ?? []) as unknown as PlanejamentoFull[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planejamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula excluída");
      qc.invalidateQueries({ queryKey: ["planejamentos"] });
      qc.invalidateQueries({ queryKey: ["planejamentos-dia"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dataLabel = date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "";

  return (
    <Sheet open={!!date} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Fluxo do Dia · {dataLabel}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {horarios.length === 0 && <div className="text-sm text-muted-foreground">Cadastre horários padrão para começar.</div>}
          {horarios.map((h) => {
            const plan = dia.find((p) => p.horario_id === h.id && p.status !== "cancelado");
            return (
              <Card key={h.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{h.label}</div>
                    <div className="text-xs text-muted-foreground">{h.hora_inicio?.slice(0,5)} – {h.hora_fim?.slice(0,5)}</div>
                  </div>
                  {!plan && (
                    <Button size="sm" onClick={() => { setEditingPlan(null); setHorarioId(h.id); setFormOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Lançar Aula
                    </Button>
                  )}
                </div>
                {plan && (
                  <div className="mt-3 rounded-md border p-3 space-y-2"
                    style={{ borderLeft: `4px solid ${plan.docentes?.cor_identificadora || "#7C3AED"}` }}>
                    <div className="text-sm font-medium">{plan.componentes_curriculares?.nome}</div>
                    <div className="text-xs text-muted-foreground">{plan.docentes?.nome} · {plan.turmas?.serie} {plan.turmas?.nome}</div>
                    <div><StatusBadge s={plan.status} /></div>
                    {plan.conteudo && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{plan.conteudo}</div>}
                    {plan.anexo_url && <a href={plan.anexo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver anexo</a>}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditingPlan(plan); setHorarioId(h.id); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm("Excluir aula?")) del.mutate(plan.id); }}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {date && (
          <PlanejamentoForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            data={date}
            horarioId={horarioId}
            editing={editingPlan}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, string> = {
    planejado: "bg-blue-100 text-blue-700 border-blue-200",
    realizado: "bg-green-100 text-green-700 border-green-200",
    cancelado: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded border ${map[s]}`}>{s}</span>;
}
