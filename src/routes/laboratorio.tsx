import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MonitorSmartphone, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PLAN_SELECT } from "@/lib/db";
import type { Componente, Horario, PlanejamentoFull } from "@/lib/db";
import { PlanejamentoForm } from "@/components/PlanejamentoForm";

export const Route = createFileRoute("/laboratorio")({ component: LaboratorioPage });

// Dias da semana em que a escola funciona (1=Segunda ... 6=Sábado). Domingo (0) é sempre ignorado.
const DIAS_LETIVOS = [1, 2, 3, 4, 5, 6];

function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function startOfWeekISO(base: Date) { const d = new Date(base); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function LaboratorioPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(new Date()));
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<{ data: string; horarioId: string; editing: PlanejamentoFull | null; turmaId: string } | null>(null);

  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: componentesLab = [] } = useQuery({
    queryKey: ["componentes", "usa_laboratorio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("componentes_curriculares").select("*").eq("usa_laboratorio", true);
      if (error) throw error;
      return data as Componente[];
    },
  });
  const componentesLabIds = useMemo(() => componentesLab.map((c) => c.id), [componentesLab]);

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["planejamentos", "laboratorio-gerenciar", weekStart, weekEnd, componentesLabIds],
    enabled: componentesLabIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamentos")
        .select(PLAN_SELECT)
        .in("componente_id", componentesLabIds)
        .gte("data", weekStart).lte("data", weekEnd)
        .neq("status", "cancelado");
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
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const mapaAulas = useMemo(() => {
    const m = new Map<string, PlanejamentoFull>();
    for (const a of aulas) m.set(`${a.data}__${a.horario_id}`, a);
    return m;
  }, [aulas]);

  const abrirNova = (data: string, horarioId: string) => {
    setFormData({ data, horarioId, editing: null, turmaId: "" });
    setFormOpen(true);
  };
  const abrirEdicao = (a: PlanejamentoFull) => {
    setFormData({ data: a.data, horarioId: a.horario_id, editing: a, turmaId: a.turma_id });
    setFormOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-primary" />Laboratório de Informática
          </h1>
          <p className="text-sm text-muted-foreground">Agende e gerencie as aulas do laboratório, semana a semana.</p>
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

      {componentesLab.length === 0 && (
        <Card className="p-4 flex items-start gap-3 border-amber-300 bg-amber-50">
          <MonitorSmartphone className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            Nenhum componente curricular está marcado como "Usa o Laboratório de Informática".
            Vá em <b>Componentes Curriculares</b> e marque os componentes correspondentes (ex: Informática, Computação)
            para gerenciar a agenda do laboratório aqui.
          </div>
        </Card>
      )}

      {componentesLab.length > 0 && (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-3">
            {isLoading ? "Carregando..." : `${aulas.length} aula(s) agendada(s) no laboratório nesta semana.`}
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
                        const a = mapaAulas.get(`${dt}__${h.id}`);
                        return (
                          <td key={dt} className="p-2 text-center align-top min-w-[150px]">
                            {a ? (
                              <div className="rounded-md border p-2 space-y-1 text-left" style={{ borderLeft: `4px solid ${a.docentes?.cor_identificadora || "#7C3AED"}` }}>
                                <div className="text-xs font-medium">{a.componentes_curriculares?.nome ?? "—"}</div>
                                <div className="text-[11px] text-muted-foreground">{a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}</div>
                                <div className="text-[11px] text-muted-foreground">{a.docentes?.nome ?? "—"}</div>
                                <div className="flex gap-1 pt-1">
                                  <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => abrirEdicao(a)}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => { if (confirm("Excluir esta aula do laboratório?")) del.mutate(a.id); }}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => abrirNova(dt, h.id)}>
                                <Plus className="h-4 w-4 mr-1" />Agendar
                              </Button>
                            )}
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
      )}

      {formData && (
        <PlanejamentoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          data={formData.data}
          horarioId={formData.horarioId}
          editing={formData.editing}
          turmaId={formData.turmaId}
          lockTurma={!!formData.editing}
          apenasLaboratorio
        />
      )}
    </div>
  );
}
