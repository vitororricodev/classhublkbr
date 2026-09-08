import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MonitorSmartphone, Plus, Pencil, Trash2, AlertTriangle, Projector, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { LAB_SELECT } from "@/lib/db";
import type { Componente, Docente, Horario, LaboratorioAgendamentoFull, StatusLab, TipoAtividadeLabCS, Turma } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { useLaboratorioAtual } from "@/lib/laboratorios";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export const Route = createFileRoute("/laboratorio")({ component: LaboratorioPage });

// Dias da semana em que a escola funciona (1=Segunda ... 6=Sábado). Domingo (0) é sempre ignorado.
const DIAS_LETIVOS = [1, 2, 3, 4, 5, 6];

function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function startOfWeekISO(base: Date) { const d = new Date(base); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

const statusLabel: Record<StatusLab, string> = { agendado: "Agendado", realizado: "Realizado", cancelado: "Cancelado" };

function LaboratorioPage() {
  const { user, isAdmin } = useAuth();
  const { laboratorio } = useLaboratorioAtual();
  const podeGerir = !!laboratorio && (isAdmin || user?.laboratorio_ids.includes(laboratorio.id));
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(new Date()));
  const [diaMobile, setDiaMobile] = useState("");
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<{ data: string; horarioId: string; editing: LaboratorioAgendamentoFull | null } | null>(null);

  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    enabled: podeGerir,
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["laboratorio_agendamentos", laboratorio?.id, weekStart, weekEnd],
    enabled: podeGerir,
    queryFn: async () => {
      const { data, error } = await sb
        .from("laboratorio_agendamentos")
        .select(LAB_SELECT)
        .eq("laboratorio_id", laboratorio!.id)
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
  useEffect(() => { if (!datas.includes(diaMobile)) setDiaMobile(datas[0] ?? ""); }, [datas, diaMobile]);

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

  if (laboratorio && !podeGerir) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="p-6">
          <h1 className="text-lg font-semibold mb-1">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Você não é responsável por este laboratório. Para pedir um horário, use <b>Laboratórios</b> no menu.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-primary" />{laboratorio?.nome ?? "Laboratório"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle, agendamento e histórico do laboratório — independente da agenda normal de aulas.
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-auto">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setWeekStart(startOfWeekISO(new Date()))}>Semana atual</Button>
            <Button variant="outline" size="icon" aria-label="Próxima semana" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:text-right"><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Semana selecionada</span><span className="font-semibold">{fmtDate(weekStart)} a {fmtDate(weekEnd)}</span></div>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">
          {isLoading ? "Carregando..." : `${aulas.length} agendamento(s) no laboratório nesta semana.`}
        </div>
        {horarios.length === 0 ? (
          <div className="text-sm text-muted-foreground">Cadastre horários padrão para começar.</div>
        ) : (
          <>
          <div className="hidden max-h-[620px] overflow-auto rounded-md border md:block">
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
                  <tr key={h.id} className={`border-t ${h.eh_intervalo ? "bg-red-50" : ""}`}>
                    <td className={`p-2 sticky left-0 whitespace-nowrap font-medium ${h.eh_intervalo ? "bg-red-50 text-red-800" : "bg-background"}`}>
                      {h.label}
                      <div className={`text-xs font-normal ${h.eh_intervalo ? "text-red-700/80" : "text-muted-foreground"}`}>
                        {h.eh_intervalo ? "Intervalo" : `${h.hora_inicio?.slice(0, 5)}–${h.hora_fim?.slice(0, 5)}`}
                      </div>
                    </td>
                    {datas.map((dt) => {
                      if (h.eh_intervalo) {
                        return <td key={dt} className="p-2 text-center align-top bg-red-50 text-xs text-red-700/70">Intervalo</td>;
                      }
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
                              <div key={a.id} className="rounded-md border p-2 space-y-1 text-left" style={{ borderLeft: `4px solid ${a.docentes?.cor_identificadora || "#007BB8"}` }}>
                                <div className="text-xs font-medium">{a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}</div>
                                {a.docentes && <div className="text-[11px] text-muted-foreground">{a.docentes.nome}</div>}
                                {a.componentes_curriculares && <div className="text-[11px] text-muted-foreground">{a.componentes_curriculares.nome}</div>}
                                {a.tipo_atividade && <div className="text-[11px] font-medium text-primary">{a.tipo_atividade === "oficina_pedagogica" ? "Oficina pedagógica" : "Aula prática"}</div>}
                                {a.observacao && <div className="text-[11px] text-muted-foreground italic">{a.observacao}</div>}
                                {(a.usar_projetor || a.usar_equipamento_som) && (
                                  <div className="flex gap-1">
                                    {a.usar_projetor && <span title="Projetor"><Projector className="h-3 w-3 text-muted-foreground" /></span>}
                                    {a.usar_equipamento_som && <span title="Equipamento de som"><Volume2 className="h-3 w-3 text-muted-foreground" /></span>}
                                  </div>
                                )}
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
          <div className="space-y-5 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {datas.map((dt) => {
                const ativo = dt === diaMobile;
                return <Button key={dt} type="button" variant={ativo ? "default" : "outline"} className="h-auto min-w-[4.75rem] shrink-0 flex-col gap-0.5 px-3 py-2" onClick={() => setDiaMobile(dt)}><span className="capitalize text-xs">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span><span className="text-base leading-none">{new Date(dt + "T00:00:00").getDate()}</span></Button>;
              })}
            </div>
            {diaMobile && <section className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b bg-muted/50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize">{new Date(diaMobile + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(diaMobile)}</p>
                </div>
                <div className="divide-y">
                  {horarios.map((h) => {
                    if (h.eh_intervalo) return <div key={h.id} className="bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{h.label}<span className="ml-2 text-xs font-normal">Intervalo</span></div>;
                    const lista = mapa.get(`${diaMobile}__${h.id}`) ?? [];
                    return (
                      <div key={h.id} className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{h.label}</p><p className="text-xs text-muted-foreground">{h.hora_inicio?.slice(0, 5)}–{h.hora_fim?.slice(0, 5)}</p></div>{lista.length > 1 && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Revisar: {lista.length}</Badge>}</div>
                        {lista.map((a) => (
                          <div key={a.id} className="rounded-lg border p-3" style={{ borderLeft: `4px solid ${a.docentes?.cor_identificadora || "#007BB8"}` }}>
                            <p className="font-medium text-sm">{a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{[a.docentes?.nome, a.componentes_curriculares?.nome].filter(Boolean).join(" · ") || "Sem docente ou componente"}</p>
                            {a.tipo_atividade && <p className="mt-2 text-xs font-medium text-primary">{a.tipo_atividade === "oficina_pedagogica" ? "Oficina pedagógica" : "Aula prática"}</p>}
                            {a.observacao && <p className="mt-2 text-xs italic text-muted-foreground">{a.observacao}</p>}
                            <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => abrirEdicao(a)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button><ExcluirBotao id={a.id} /></div>
                          </div>
                        ))}
                        <Button size="sm" variant={lista.length === 0 ? "outline" : "ghost"} className="w-full" onClick={() => abrirNova(diaMobile, h.id)}><Plus className="mr-1 h-4 w-4" />{lista.length === 0 ? "Agendar neste horário" : "Adicionar outro"}</Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            }
          </div>
          </>
        )}
      </Card>

      {formData && (
        <LaboratorioAgendamentoForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          data={formData.data}
          horarioId={formData.horarioId}
          editing={formData.editing}
          laboratorioId={laboratorio?.id ?? ""}
          isLabCS={laboratorio?.slug === "multidisciplinar"}
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
  open, onClose, data, horarioId, editing, laboratorioId, isLabCS,
}: {
  open: boolean; onClose: () => void; data: string; horarioId: string; editing: LaboratorioAgendamentoFull | null; laboratorioId: string; isLabCS: boolean;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [turmaId, setTurmaId] = useState("");
  const [docenteId, setDocenteId] = useState<string>("none");
  const [componenteId, setComponenteId] = useState<string>("none");
  const [observacao, setObservacao] = useState("");
  const [usarProjetor, setUsarProjetor] = useState(false);
  const [usarSom, setUsarSom] = useState(false);
  const [status, setStatus] = useState<StatusLab>("agendado");
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividadeLabCS | "">("");
  const [alunosParticipantes, setAlunosParticipantes] = useState("");
  const [recursosUtilizados, setRecursosUtilizados] = useState("");
  const [habilidades, setHabilidades] = useState("");
  const [objetoConhecimento, setObjetoConhecimento] = useState("");

  useEffect(() => {
    if (editing) {
      setTurmaId(editing.turma_id);
      setDocenteId(editing.docente_id ?? "none");
      setComponenteId(editing.componente_id ?? "none");
      setObservacao(editing.observacao ?? "");
      setUsarProjetor(editing.usar_projetor);
      setUsarSom(editing.usar_equipamento_som);
      setStatus(editing.status);
      setTipoAtividade(editing.tipo_atividade ?? "");
      setAlunosParticipantes(editing.alunos_participantes ?? "");
      setRecursosUtilizados(editing.recursos_utilizados ?? "");
      setHabilidades(editing.habilidades ?? "");
      setObjetoConhecimento(editing.objeto_conhecimento ?? "");
    } else {
      setTurmaId(""); setDocenteId("none"); setComponenteId("none"); setObservacao(""); setUsarProjetor(false); setUsarSom(false); setStatus("agendado");
      setTipoAtividade(""); setAlunosParticipantes(""); setRecursosUtilizados(""); setHabilidades(""); setObjetoConhecimento("");
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
      if (isLabCS) {
        if (!tipoAtividade) throw new Error("Selecione o tipo de atividade do LabCS.");
        if (tipoAtividade === "oficina_pedagogica" && !alunosParticipantes.trim()) throw new Error("Informe os alunos participantes da oficina.");
        if (!recursosUtilizados.trim() || !habilidades.trim() || !objetoConhecimento.trim()) throw new Error("Preencha recursos, habilidades e objeto do conhecimento.");
      }
      const payload = {
        data, horario_id: horarioId, turma_id: turmaId, laboratorio_id: laboratorioId,
        docente_id: docenteId === "none" ? null : docenteId,
        componente_id: componenteId === "none" ? null : componenteId,
        observacao: observacao || null,
        usar_projetor: usarProjetor,
        usar_equipamento_som: usarSom,
        status,
        ...(isLabCS ? { tipo_atividade: tipoAtividade, alunos_participantes: tipoAtividade === "oficina_pedagogica" ? alunosParticipantes.trim() : null, recursos_utilizados: recursosUtilizados.trim(), habilidades: habilidades.trim(), objeto_conhecimento: objetoConhecimento.trim() } : {}),
      };

      // Aviso não-bloqueante: só avisa se já existir outro agendamento no
      // mesmo horário/dia — não impede de salvar, é uma checagem só pra
      // ajudar a organizar (ex: revezamento de professores no lab).
      const { data: outros, error: chkErr } = await sb
        .from("laboratorio_agendamentos")
        .select("id")
        .eq("data", data)
        .eq("horario_id", horarioId)
        .eq("laboratorio_id", laboratorioId)
        .neq("status", "cancelado");
      if (!chkErr) {
        const conflito = (outros ?? []).some((o: { id: string }) => o.id !== editing?.id);
        if (conflito) {
          toast.warning("Já existe outro agendamento neste horário — confira se não é duplicado.");
        }
      }

      if (editing) {
        const { error } = await sb.from("laboratorio_agendamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("laboratorio_agendamentos").insert({ ...payload, criado_por: user?.id ?? null });
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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>{editing ? "Editar agendamento do laboratório" : "Agendar laboratório"}</DialogTitle>
        </DialogHeader>
        <div className="mx-5 shrink-0 text-xs text-muted-foreground sm:mx-6">
          {fmtDate(data)} · este agendamento não depende da agenda normal de aulas — a turma e o docente podem ter outra aula no mesmo horário sem problema.
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="space-y-4">
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
          {isLabCS && <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
            <div className="space-y-2"><Label>Tipo de atividade</Label><Select value={tipoAtividade} onValueChange={(v) => setTipoAtividade(v as TipoAtividadeLabCS)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="aula_pratica">Aula prática</SelectItem><SelectItem value="oficina_pedagogica">Oficina pedagógica</SelectItem></SelectContent></Select></div>
            {tipoAtividade === "oficina_pedagogica" && <div className="space-y-2"><Label>Alunos participantes</Label><Textarea rows={3} value={alunosParticipantes} onChange={(e) => setAlunosParticipantes(e.target.value)} placeholder="Informe os alunos que participarão da oficina" /></div>}
            <div className="space-y-2"><Label>Recursos utilizados e quantidade</Label><Textarea rows={3} value={recursosUtilizados} onChange={(e) => setRecursosUtilizados(e.target.value)} placeholder="Ex.: 15 tablets; 2 kits de robótica" /></div>
            <div className="space-y-2"><Label>Habilidades</Label><Textarea rows={3} value={habilidades} onChange={(e) => setHabilidades(e.target.value)} placeholder="Habilidades que serão desenvolvidas" /></div>
            <div className="space-y-2"><Label>Objeto do conhecimento</Label><Textarea rows={3} value={objetoConhecimento} onChange={(e) => setObjetoConhecimento(e.target.value)} placeholder="Objeto do conhecimento trabalhado" /></div>
          </div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Switch checked={usarProjetor} onCheckedChange={setUsarProjetor} />
              <Label className="cursor-pointer" onClick={() => setUsarProjetor(!usarProjetor)}>Projetor</Label>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Switch checked={usarSom} onCheckedChange={setUsarSom} />
              <Label className="cursor-pointer" onClick={() => setUsarSom(!usarSom)}>Equipamento de som</Label>
            </div>
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
        </div>
        <DialogFooter className="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
