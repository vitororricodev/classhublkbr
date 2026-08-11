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
import type { Componente } from "@/lib/db";

export const Route = createFileRoute("/componentes")({ component: ComponentesPage });

function ComponentesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["componentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("componentes_curriculares").select("*").order("nome");
      if (error) throw error;
      return data as Componente[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Componente | null>(null);
  const [form, setForm] = useState({ nome: "", ativo: true, usa_laboratorio: false });

  const openNew = () => { setEditing(null); setForm({ nome: "", ativo: true, usa_laboratorio: false }); setOpen(true); };
  const openEdit = (d: Componente) => { setEditing(d); setForm({ nome: d.nome, ativo: d.ativo, usa_laboratorio: d.usa_laboratorio }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome");
      if (editing) {
        const { error } = await supabase.from("componentes_curriculares").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("componentes_curriculares").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["componentes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("componentes_curriculares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["componentes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Componentes Curriculares</h1>
          <p className="text-sm text-muted-foreground">Disciplinas oferecidas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo componente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar componente" : "Novo componente"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.usa_laboratorio} onCheckedChange={(v) => setForm({ ...form, usa_laboratorio: v })} />
                <Label>Usa o Laboratório de Informática</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Marque para componentes cujas aulas ocupam o laboratório (ex: Informática, Computação, Robótica). Isso alimenta o relatório de disponibilidade do laboratório.
              </p>
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
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead>Usa Laboratório</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum componente cadastrado.</TableCell></TableRow>}
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell>{d.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell>{d.usa_laboratorio ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) del.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
