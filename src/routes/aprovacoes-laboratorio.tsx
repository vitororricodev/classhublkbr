import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Projector, Volume2, ClipboardCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { SOLIC_SELECT } from "@/lib/db";
import type { SolicitacaoLaboratorioFull } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/aprovacoes-laboratorio")({ component: AprovacoesLaboratorioPage });

function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }

const statusBadge: Record<string, ReactNode> = {
  pendente: <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>,
  aprovado: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>,
  rejeitado: <Badge variant="destructive">Rejeitado</Badge>,
};

function AprovacoesLaboratorioPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [rejeitando, setRejeitando] = useState<SolicitacaoLaboratorioFull | null>(null);
  const [motivo, setMotivo] = useState("");

  const { data: pendentes = [], isLoading: loadingPend } = useQuery({
    queryKey: ["solicitacoes_laboratorio", "pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes_laboratorio").select(SOLIC_SELECT).eq("status", "pendente").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoLaboratorioFull[];
    },
  });

  const { data: historico = [], isLoading: loadingHist } = useQuery({
    queryKey: ["solicitacoes_laboratorio", "historico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes_laboratorio").select(SOLIC_SELECT).neq("status", "pendente").order("decidido_em", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoLaboratorioFull[];
    },
  });

  const aprovar = useMutation({
    mutationFn: async (s: SolicitacaoLaboratorioFull) => {
      if (!user?.id) throw new Error("Sessão inválida. Entre novamente.");
      const { error } = await supabase.rpc("aprovar_solicitacao_laboratorio", {
        p_solicitacao_id: s.id,
        p_decidido_por: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aprovado! Já criei o agendamento no laboratório.");
      qc.invalidateQueries({ queryKey: ["solicitacoes_laboratorio"] });
      qc.invalidateQueries({ queryKey: ["laboratorio_agendamentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejeitar = useMutation({
    mutationFn: async () => {
      if (!rejeitando) return;
      if (!user?.id) throw new Error("Sessão inválida. Entre novamente.");
      const { error } = await supabase.rpc("rejeitar_solicitacao_laboratorio", {
        p_solicitacao_id: rejeitando.id,
        p_decidido_por: user.id,
        p_motivo_rejeicao: motivo || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      setRejeitando(null); setMotivo("");
      qc.invalidateQueries({ queryKey: ["solicitacoes_laboratorio"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const Item = ({ s }: { s: SolicitacaoLaboratorioFull }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="font-medium text-sm">{s.docentes?.nome ?? "—"}</div>
          <div className="text-sm text-muted-foreground">
            {fmtDate(s.data)} · {s.horarios_padrao?.label} · {s.componentes_curriculares?.nome} · {s.turmas ? `${s.turmas.serie} ${s.turmas.nome}` : "—"}
          </div>
          {s.conteudo && <div className="text-sm mt-1">{s.conteudo}</div>}
          <div className="flex gap-2 mt-2">
            {s.usar_projetor && <Badge variant="outline" className="gap-1"><Projector className="h-3 w-3" />Projetor</Badge>}
            {s.usar_equipamento_som && <Badge variant="outline" className="gap-1"><Volume2 className="h-3 w-3" />Som</Badge>}
          </div>
          <div className="text-xs font-medium text-foreground/80 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />Solicitado em: {fmtDateTime(s.created_at)}
          </div>
          {s.status !== "pendente" && s.decidido_em && (
            <div className="text-xs text-muted-foreground">
              {s.status === "aprovado" ? "Aprovada" : "Rejeitada"} em {fmtDateTime(s.decidido_em)}
              {s.status === "rejeitado" && s.motivo_rejeicao && ` · Motivo: ${s.motivo_rejeicao}`}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {statusBadge[s.status]}
          {s.status === "pendente" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => aprovar.mutate(s)} disabled={aprovar.isPending}>
                <Check className="h-4 w-4 mr-1" />Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setRejeitando(s); setMotivo(""); }}>
                <X className="h-4 w-4 mr-1" />Rejeitar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />Aprovações do Laboratório
        </h1>
        <p className="text-sm text-muted-foreground">Aprove ou rejeite as solicitações enviadas pelos docentes.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes {pendentes.length > 0 && `(${pendentes.length})`}</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="space-y-3 pt-4">
          {loadingPend && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loadingPend && pendentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente. 🎉</p>}
          {pendentes.map((s) => <Item key={s.id} s={s} />)}
        </TabsContent>
        <TabsContent value="historico" className="space-y-3 pt-4">
          {loadingHist && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loadingHist && historico.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação decidida ainda.</p>}
          {historico.map((s) => <Item key={s.id} s={s} />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejeitando} onOpenChange={(v) => !v && setRejeitando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar solicitação</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">Motivo (opcional, o docente vai ver isso):</p>
            <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Horário já reservado para manutenção dos computadores." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitando(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => rejeitar.mutate()} disabled={rejeitar.isPending}>
              {rejeitar.isPending ? "Rejeitando..." : "Confirmar rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
