import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Feriado } from "@/lib/feriados";
import { FERIADOS_NACIONAIS_FIXOS } from "@/lib/feriados";

// O tipo `feriados` ainda não está no schema gerado; usamos cast pontual.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export const Route = createFileRoute("/feriados")({ component: FeriadosPage });

function FeriadosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Feriado | null>(null);

  const { data: feriados = [] } = useQuery({
    queryKey: ["feriados", "all"],
    queryFn: async () => {
      const { data, error } = await sb.from("feriados").select("*").order("data");
      if (error) throw error;
      return (data ?? []) as Feriado[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("feriados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feriado removido");
      qc.invalidateQueries({ queryKey: ["feriados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feriados</h1>
          <p className="text-sm text-muted-foreground">Cadastre feriados municipais. Os feriados nacionais fixos já estão incluídos automaticamente.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo Feriado
        </Button>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium mb-2">Feriados Nacionais (fixos)</div>
        <div className="flex flex-wrap gap-2">
          {FERIADOS_NACIONAIS_FIXOS.map((f) => (
            <span key={f.mmdd} className="text-xs px-2 py-1 rounded border bg-secondary">
              {f.mmdd.replace("-", "/")} — {f.nome}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feriados.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum feriado cadastrado.</TableCell></TableRow>
            )}
            {feriados.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{f.nome}</TableCell>
                <TableCell className="capitalize">{f.tipo}</TableCell>
                <TableCell>{f.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Excluir feriado?")) del.mutate(f.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <FeriadoForm open={open} onClose={() => setOpen(false)} editing={editing} />
    </div>
  );
}

function FeriadoForm({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Feriado | null }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState<"nacional" | "municipal">("municipal");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNome(editing.nome); setData(editing.data); setTipo(editing.tipo); setAtivo(editing.ativo);
    } else {
      setNome(""); setData(""); setTipo("municipal"); setAtivo(true);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!nome || !data) throw new Error("Preencha nome e data");
      const payload = { nome, data, tipo, ativo };
      if (editing) {
        const { error } = await sb.from("feriados").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("feriados").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Feriado atualizado" : "Feriado cadastrado");
      qc.invalidateQueries({ queryKey: ["feriados"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Editar feriado" : "Novo feriado"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "nacional" | "municipal")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="municipal">Municipal</SelectItem>
                <SelectItem value="nacional">Nacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input id="ativo" type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <Label htmlFor="ativo">Ativo</Label>
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
