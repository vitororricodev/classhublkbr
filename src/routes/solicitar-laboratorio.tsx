import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HelpCircle, MonitorSmartphone, Send, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { LAB_SELECT, SOLIC_SELECT } from "@/lib/db";
import type { Componente, Docente, Horario, LaboratorioAgendamentoFull, SolicitacaoLaboratorioFull, Turma } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/solicitar-laboratorio")({ component: SolicitarLaboratorioPage });

const DIAS_LETIVOS = [1, 2, 3, 4, 5, 6];

function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function startOfWeekISO(base: Date) { const d = new Date(base); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

function AjudaPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full border text-muted-foreground" type="button">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm leading-relaxed space-y-2">
        <p>As aulas realizadas no laboratório deverão estar alinhadas ao planejamento de aula previamente aprovado pela coordenação:</p>
        <p>Docente: Data: Horário: Componente: Turma: Conteúdo: Recursos do laboratório que serão utilizados: Observação:</p>
        <p className="font-medium text-foreground">Caso seja necessária a utilização da caixa de som, a solicitação deverá ser feita previamente à Mara.</p>
      </PopoverContent>
    </Popover>
  );
}

const statusBadge: Record<string, ReactNode> = {
  pendente: <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>,
  aprovado: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>,
  rejeitado: <Badge variant="destructive">Rejeitado</Badge>,
};

function SolicitarLaboratorioPage() {
  const { user, isAdmin } = useAuth();
  const [docenteIdAdmin, setDocenteIdAdmin] = useState<string>("");
  const scopedDocenteId = isAdmin ? (docenteIdAdmin || null) : (user?.docente_id ?? null);

  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(new Date()));
  const weekEnd = useMemo(() => addDaysISO(weekStart, 6), [weekStart]);
  const [pedidoAberto, setPedidoAberto] = useState<{ data: string; horarioId: string } | null>(null);

  const { data: docentesLista = [] } = useQuery({
    queryKey: ["docentes", "ativos", "select-solicitacao"],
    enabled: isAdmin,
    queryFn: async () => { const { data, error } = await supabase.from("docentes").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Docente[]; },
  });
  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => { const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem"); if (error) throw error; return data as Horario[]; },
  });

  const { data: ocupados = [], isLoading: loadingOcupacao } = useQuery({
    queryKey: ["laboratorio_agendamentos", "grade-solicitacao", weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase.from("laboratorio_agendamentos").select(LAB_SELECT)
        .gte("data", weekStart).lte("data", weekEnd).neq("status", "cancelado");
      if (error) throw error;
      return (data ?? []) as unknown as LaboratorioAgendamentoFull[];
    },
  });

  const { data: pendentesSemana = [] } = useQuery({
    // A disponibilidade precisa ser igual para todos: um pedido pendente já
    // sinaliza que o horário está em análise, independentemente de quem pediu.
    queryKey: ["solicitacoes_laboratorio", "pendentes-semana", weekStart, weekEnd],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes_laboratorio").select("id, data, horario_id")
        .eq("status", "pendente").gte("data", weekStart).lte("data", weekEnd);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: minhas = [] } = useQuery({
    queryKey: ["solicitacoes_laboratorio", "minhas", scopedDocenteId],
    enabled: !!scopedDocenteId,
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes_laboratorio").select(SOLIC_SELECT)
        .eq("docente_id", scopedDocenteId!).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoLaboratorioFull[];
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

  const mapaOcupado = useMemo(() => {
    const m = new Map<string, LaboratorioAgendamentoFull[]>();
    for (const a of ocupados) {
      const key = `${a.data}__${a.horario_id}`;
      const arr = m.get(key) ?? [];
      arr.push(a);
      m.set(key, arr);
    }
    return m;
  }, [ocupados]);

  const mapaPendente = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of pendentesSemana) {
      const key = `${s.data}__${s.horario_id}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [pendentesSemana]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-primary" />Solicitar Laboratório
            <AjudaPopover />
          </h1>
          <p className="text-sm text-muted-foreground">
            Clique num horário livre da semana para enviar o pedido — a coordenação aprova depois.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeekISO(new Date()))}>Semana atual</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {isAdmin && (
        <Card className="p-4">
          <div className="space-y-2 max-w-sm">
            <Label>Solicitar em nome de qual docente?</Label>
            <Select value={docenteIdAdmin} onValueChange={setDocenteIdAdmin}>
              <SelectTrigger><SelectValue placeholder="Selecione o docente..." /></SelectTrigger>
              <SelectContent>{docentesLista.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {!isAdmin && !user?.docente_id && (
        <Card className="p-4 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-900">
            Seu login ainda não está vinculado a um docente. Peça para um administrador vincular seu usuário em <b>Usuários</b> para poder solicitar o laboratório.
          </p>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">Semana de {fmtDate(weekStart)} a {fmtDate(weekEnd)}</div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">
          {loadingOcupacao ? "Carregando disponibilidade..." : "Verde = livre (clique para solicitar) · Vermelho = intervalo · Cinza = já ocupado · Amarelo = solicitação pendente"}
        </div>
        {horarios.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum horário cadastrado ainda.</div>
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
                      const ocupantes = mapaOcupado.get(`${dt}__${h.id}`) ?? [];
                      const pendentes = mapaPendente.get(`${dt}__${h.id}`) ?? 0;
                      const ocupado = ocupantes.length > 0;

                      if (ocupado) {
                        return (
                          <td key={dt} className="p-2 text-center align-top bg-muted/40 min-w-[150px]">
                            <div className="space-y-1 text-left">
                              {ocupantes.map((a) => (
                                <div key={a.id} className="text-[11px] text-muted-foreground">
                                  {a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"} · {a.docentes?.nome ?? "—"}
                                </div>
                              ))}
                              <Badge variant="secondary" className="text-[10px]">Ocupado</Badge>
                            </div>
                          </td>
                        );
                      }

                      if (pendentes > 0) {
                        return (
                          <td key={dt} className="p-2 text-center align-top bg-amber-50 min-w-[150px]">
                            <div className="text-[11px] text-amber-800 space-y-1">
                              <div>{pendentes === 1 ? "Solicitação pendente" : `${pendentes} solicitações pendentes`}</div>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">Solicitado</Badge>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={dt} className="p-2 text-center align-top min-w-[150px]">
                          <Button
                            size="sm" variant="ghost" className="text-green-700 hover:text-green-800 hover:bg-green-50"
                            disabled={!scopedDocenteId}
                            onClick={() => setPedidoAberto({ data: dt, horarioId: h.id })}
                          >
                            <Plus className="h-4 w-4 mr-1" />Solicitar
                          </Button>
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

      {scopedDocenteId && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Minhas solicitações recentes</h2>
          {minhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação enviada ainda.</p>}
          <div className="space-y-2">
            {minhas.map((s) => (
              <div key={s.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {fmtDate(s.data)} · {s.horarios_padrao?.label} · {s.componentes_curriculares?.nome} · {s.turmas ? `${s.turmas.serie} ${s.turmas.nome}` : "—"}
                  </div>
                  <div className="text-xs font-medium text-foreground/80 mt-0.5">Solicitado em: {fmtDateTime(s.created_at)}</div>
                  {s.status !== "pendente" && s.decidido_em && (
                    <div className="text-xs text-muted-foreground">Decidido em: {fmtDateTime(s.decidido_em)}</div>
                  )}
                  {s.status === "rejeitado" && s.motivo_rejeicao && (
                    <div className="text-xs text-red-700 mt-1">Motivo: {s.motivo_rejeicao}</div>
                  )}
                </div>
                <div>{statusBadge[s.status]}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pedidoAberto && scopedDocenteId && (
        <PedidoLaboratorioDialog
          open={!!pedidoAberto}
          onClose={() => setPedidoAberto(null)}
          docenteId={scopedDocenteId}
          data={pedidoAberto.data}
          horarioId={pedidoAberto.horarioId}
          horarioLabel={horarios.find((h) => h.id === pedidoAberto.horarioId)?.label ?? ""}
        />
      )}
    </div>
  );
}

function PedidoLaboratorioDialog({
  open, onClose, docenteId, data, horarioId, horarioLabel,
}: {
  open: boolean; onClose: () => void; docenteId: string; data: string; horarioId: string; horarioLabel: string;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [componenteId, setComponenteId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [usarProjetor, setUsarProjetor] = useState(false);
  const [usarSom, setUsarSom] = useState(false);

  const { data: componentes = [] } = useQuery({
    queryKey: ["componentes", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("componentes_curriculares").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Componente[]; },
  });
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("turmas").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Turma[]; },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!componenteId) throw new Error("Selecione o componente.");
      if (!turmaId) throw new Error("Selecione a turma.");
      const { error } = await supabase.from("solicitacoes_laboratorio").insert({
        docente_id: docenteId, data, horario_id: horarioId, componente_id: componenteId, turma_id: turmaId,
        conteudo: conteudo || null, usar_projetor: usarProjetor, usar_equipamento_som: usarSom,
        status: "pendente", criado_por: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Você será avisado quando a coordenação decidir.");
      qc.invalidateQueries({ queryKey: ["solicitacoes_laboratorio"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar Laboratório</DialogTitle>
        </DialogHeader>
        <div className="text-sm bg-secondary rounded-md px-3 py-2">
          <b>{fmtDate(data)}</b> · <b>{horarioLabel}</b>
        </div>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Componente</Label>
            <Select value={componenteId} onValueChange={setComponenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{componentes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.serie} — {t.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conteúdo (alinhado ao planejamento aprovado)</Label>
            <Textarea rows={3} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="O que será trabalhado nesta aula" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Switch checked={usarProjetor} onCheckedChange={setUsarProjetor} />
              <Label className="cursor-pointer" onClick={() => setUsarProjetor(!usarProjetor)}>Usar projetor</Label>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-3 py-2">
              <Switch checked={usarSom} onCheckedChange={setUsarSom} />
              <Label className="cursor-pointer" onClick={() => setUsarSom(!usarSom)}>Usar equipamento de som</Label>
            </div>
          </div>
          {usarSom && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Caso use equipamento de som, alinhe previamente com a secretaria (Mara).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>
            <Send className="h-4 w-4 mr-2" />{enviar.isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
