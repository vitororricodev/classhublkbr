import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
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
import { DatePicker } from "@/components/DatePicker";
import { HelpCircle, MonitorSmartphone, Send } from "lucide-react";
import { toast } from "sonner";
import { SOLIC_SELECT } from "@/lib/db";
import type { Componente, Docente, Horario, SolicitacaoLaboratorioFull, Turma } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/solicitar-laboratorio")({ component: SolicitarLaboratorioPage });

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }

function AjudaPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full border text-muted-foreground" type="button">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm leading-relaxed space-y-2">
        <p>
          As aulas realizadas no laboratório deverão estar alinhadas ao planejamento de aula previamente aprovado pela coordenação:
        </p>
        <p>Docente: Data: Horário: Componente: Turma: Conteúdo: Recursos do laboratório que serão utilizados: Observação:</p>
        <p className="font-medium text-foreground">
          Caso seja necessária a utilização da caixa de som, a solicitação deverá ser feita previamente à Mara.
        </p>
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
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();

  const [docenteIdAdmin, setDocenteIdAdmin] = useState<string>("");
  const scopedDocenteId = isAdmin ? (docenteIdAdmin || null) : (user?.docente_id ?? null);

  const [data, setData] = useState(todayISO());
  const [horarioId, setHorarioId] = useState("");
  const [componenteId, setComponenteId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [usarProjetor, setUsarProjetor] = useState(false);
  const [usarSom, setUsarSom] = useState(false);

  const { data: docentesLista = [] } = useQuery({
    queryKey: ["docentes", "ativos", "select-solicitacao"],
    enabled: isAdmin,
    queryFn: async () => { const { data, error } = await supabase.from("docentes").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Docente[]; },
  });
  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => { const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem"); if (error) throw error; return data as Horario[]; },
  });
  const { data: componentes = [] } = useQuery({
    queryKey: ["componentes", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("componentes_curriculares").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Componente[]; },
  });
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", "ativos"],
    queryFn: async () => { const { data, error } = await supabase.from("turmas").select("*").eq("ativo", true).order("nome"); if (error) throw error; return data as Turma[]; },
  });

  const { data: minhas = [] } = useQuery({
    queryKey: ["solicitacoes_laboratorio", "minhas", scopedDocenteId],
    enabled: !!scopedDocenteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes_laboratorio")
        .select(SOLIC_SELECT)
        .eq("docente_id", scopedDocenteId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoLaboratorioFull[];
    },
  });

  const limpar = () => {
    setData(todayISO()); setHorarioId(""); setComponenteId(""); setTurmaId(""); setConteudo(""); setUsarProjetor(false); setUsarSom(false);
  };

  const enviar = useMutation({
    mutationFn: async () => {
      if (!scopedDocenteId) throw new Error(isAdmin ? "Selecione o docente." : "Seu login não está vinculado a um docente.");
      if (!horarioId) throw new Error("Selecione o horário.");
      if (!componenteId) throw new Error("Selecione o componente.");
      if (!turmaId) throw new Error("Selecione a turma.");
      const { error } = await supabase.from("solicitacoes_laboratorio").insert({
        docente_id: scopedDocenteId, data, horario_id: horarioId, componente_id: componenteId, turma_id: turmaId,
        conteudo: conteudo || null, usar_projetor: usarProjetor, usar_equipamento_som: usarSom,
        status: "pendente", criado_por: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Você será avisado quando a coordenação decidir.");
      limpar();
      qc.invalidateQueries({ queryKey: ["solicitacoes_laboratorio"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MonitorSmartphone className="h-6 w-6 text-primary" />Solicitar Laboratório
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados da aula e envie para aprovação da coordenação.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Dados da solicitação</h2>
          <AjudaPopover />
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <Label>Docente</Label>
            <Select value={docenteIdAdmin} onValueChange={setDocenteIdAdmin}>
              <SelectTrigger><SelectValue placeholder="Selecione o docente..." /></SelectTrigger>
              <SelectContent>{docentesLista.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {!isAdmin && !user?.docente_id && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Seu login ainda não está vinculado a um docente. Peça para um administrador vincular seu usuário em <b>Usuários</b> para poder solicitar o laboratório.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Data</Label><DatePicker value={data} onChange={setData} /></div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={horarioId} onValueChange={setHorarioId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{horarios.map((h) => <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <div className="flex justify-end pt-2">
          <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>
            <Send className="h-4 w-4 mr-2" />{enviar.isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
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
                  <div className="text-xs text-muted-foreground mt-0.5">Enviada em {fmtDateTime(s.created_at)}</div>
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
    </div>
  );
}
