import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Docente } from "@/lib/db";

export const Route = createFileRoute("/docentes")({ component: DocentesPage });

function DocentesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["docentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("docentes").select("*").order("nome");
      if (error) throw error;
      return data as Docente[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Docente | null>(null);
  const [form, setForm] = useState({ nome: "", cor_identificadora: "#7C3AED", ativo: true });

  const openNew = () => { setEditing(null); setForm({ nome: "", cor_identificadora: "#7C3AED", ativo: true }); setOpen(true); };
  const openEdit = (d: Docente) => { setEditing(d); setForm({ nome: d.nome, cor_identificadora: d.cor_identificadora, ativo: d.ativo }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome");
      if (editing) {
        const { error } = await supabase.from("docentes").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("docentes").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["docentes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("docentes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["docentes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Docentes</h1>
          <p className="text-sm text-muted-foreground">Cadastro de docentes e cores identificadoras.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo docente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar docente" : "Novo docente"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cor identificadora</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.cor_identificadora} onChange={(e) => setForm({ ...form, cor_identificadora: e.target.value })} className="h-10 w-16 rounded border" />
                  <Input value={form.cor_identificadora} onChange={(e) => setForm({ ...form, cor_identificadora: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum docente cadastrado.</TableCell></TableRow>}
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell><span className="inline-block h-5 w-5 rounded-full border" style={{ background: d.cor_identificadora }} /></TableCell>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell>{d.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir docente?")) del.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
