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
import type { Horario } from "@/lib/db";

export const Route = createFileRoute("/horarios")({ component: HorariosPage });

function HorariosPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["horarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Horario | null>(null);
  const [form, setForm] = useState({ label: "", hora_inicio: "07:00", hora_fim: "07:50", ordem: 1, ativo: true });

  const openNew = () => { setEditing(null); setForm({ label: "", hora_inicio: "07:00", hora_fim: "07:50", ordem: (data[data.length - 1]?.ordem ?? 0) + 1, ativo: true }); setOpen(true); };
  const openEdit = (d: Horario) => { setEditing(d); setForm({ label: d.label, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim, ordem: d.ordem, ativo: d.ativo }); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.label.trim()) throw new Error("Informe o rótulo");
      if (editing) {
        const { error } = await supabase.from("horarios_padrao").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("horarios_padrao").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); setOpen(false); qc.invalidateQueries({ queryKey: ["horarios"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("horarios_padrao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries({ queryKey: ["horarios"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Horários Padrão</h1>
          <p className="text-sm text-muted-foreground">Defina os blocos de horário usados nas aulas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo horário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar horário" : "Novo horário"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Rótulo</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: 1ª aula" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Início</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim</Label><Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /><Label>Ativo</Label></div>
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
          <TableHeader><TableRow><TableHead>Ordem</TableHead><TableHead>Rótulo</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum horário cadastrado.</TableCell></TableRow>}
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.ordem}</TableCell>
                <TableCell className="font-medium">{d.label}</TableCell>
                <TableCell>{d.hora_inicio?.slice(0,5)}</TableCell>
                <TableCell>{d.hora_fim?.slice(0,5)}</TableCell>
                <TableCell>{d.ativo ? "Sim" : "Não"}</TableCell>
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
