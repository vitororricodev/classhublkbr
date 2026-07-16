import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { Docente, Componente, Turma, Horario } from "@/lib/db";

type Filtros = {
  inicio: string;
  fim: string;
  docente: string;
  componente: string;
  turma: string;
  horario: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultInicio: string;
  defaultFim: string;
  docentes: Docente[];
  componentes: Componente[];
  turmas: Turma[];
  horarios: Horario[];
  initial?: { docente?: string; componente?: string; turma?: string };
};

function applyFilters<T extends { gte: Function; lte: Function; eq: Function }>(q: T, f: Filtros, ownerId?: string | null): T {
  let r: any = q.gte("data", f.inicio).lte("data", f.fim);
  if (ownerId) r = r.eq("criado_por", ownerId);
  if (f.docente !== "all") r = r.eq("docente_id", f.docente);
  if (f.componente !== "all") r = r.eq("componente_id", f.componente);
  if (f.turma !== "all") r = r.eq("turma_id", f.turma);
  if (f.horario !== "all") r = r.eq("horario_id", f.horario);
  return r as T;
}

export function ExcluirAulasMassaDialog({
  open, onClose, defaultInicio, defaultFim,
  docentes, componentes, turmas, horarios, initial,
}: Props) {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const ownerScope = isAdmin ? null : user?.id ?? null;
  const [filtros, setFiltros] = useState<Filtros>({
    inicio: defaultInicio,
    fim: defaultFim,
    docente: initial?.docente ?? "all",
    componente: initial?.componente ?? "all",
    turma: initial?.turma ?? "all",
    horario: "all",
  });
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setFiltros((p) => ({ ...p, inicio: defaultInicio, fim: defaultFim }));
      setCount(null);
    }
  }, [open, defaultInicio, defaultFim]);

  const validPeriod = !!filtros.inicio && !!filtros.fim && filtros.inicio <= filtros.fim;

  const preflight = async () => {
    if (!validPeriod) {
      toast.error("Defina um período válido antes de continuar.");
      return;
    }
    setCounting(true);
    try {
      const { count, error } = await applyFilters(supabase.from("planejamentos").select("id", { count: "exact", head: true }), filtros, ownerScope);
      if (error) throw error;
      setCount(count ?? 0);
      if (!count) {
        toast.info("Nenhuma aula encontrada para os filtros selecionados.");
        return;
      }
      setConfirmOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCounting(false);
    }
  };

  const excluir = useMutation({
    mutationFn: async () => {
      const { error, count } = await applyFilters(supabase.from("planejamentos").delete({ count: "exact" }), filtros, ownerScope);
      if (error) throw error;
      return count ?? 0;
    },
    onSuccess: (removed) => {
      // Log da operação
      console.info("[exclusao-massa-aulas]", {
        usuario: user?.usuario ?? user?.id ?? "anonimo",
        filtros,
        removidos: removed,
        timestamp: new Date().toISOString(),
      });
      toast.success(`${removed} aula(s) excluída(s) com sucesso.`);
      qc.invalidateQueries({ queryKey: ["planejamentos"] });
      qc.invalidateQueries({ queryKey: ["planejamentos-dia"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setConfirmOpen(false);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <AlertDialog open={open} onOpenChange={(v) => !v && !excluir.isPending && onClose()}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aulas em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o período e os filtros. A exclusão é definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data inicial *</Label>
              <Input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Data final *</Label>
              <Input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} />
            </div>
            <FiltroSelect label="Docente" value={filtros.docente} onChange={(v) => setFiltros({ ...filtros, docente: v })}
              options={[{ value: "all", label: "Todos" }, ...docentes.map((d) => ({ value: d.id, label: d.nome }))]} />
            <FiltroSelect label="Componente" value={filtros.componente} onChange={(v) => setFiltros({ ...filtros, componente: v })}
              options={[{ value: "all", label: "Todos" }, ...componentes.map((c) => ({ value: c.id, label: c.nome }))]} />
            <FiltroSelect label="Turma" value={filtros.turma} onChange={(v) => setFiltros({ ...filtros, turma: v })}
              options={[{ value: "all", label: "Todas" }, ...turmas.map((t) => ({ value: t.id, label: `${t.serie} — ${t.nome}` }))]} />
            <FiltroSelect label="Horário" value={filtros.horario} onChange={(v) => setFiltros({ ...filtros, horario: v })}
              options={[{ value: "all", label: "Todos" }, ...horarios.map((h) => ({ value: h.id, label: h.label }))]} />
          </div>

          {!validPeriod && (
            <p className="text-xs text-destructive">Informe um período válido (data inicial ≤ data final).</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={counting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={preflight} disabled={!validPeriod || counting}>
              {counting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Verificar e excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && !excluir.isPending && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir <b>{count ?? 0}</b> aula(s) no período de{" "}
              <b>{filtros.inicio}</b> a <b>{filtros.fim}</b>. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); excluir.mutate(); }}
              disabled={excluir.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluir.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FiltroSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
