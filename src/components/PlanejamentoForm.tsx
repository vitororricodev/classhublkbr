import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Paperclip, X, AlertTriangle } from "lucide-react";
import type { Docente, Componente, Turma, Status, Planejamento } from "@/lib/db";
import { useFeriadosMunicipais, checkHoliday } from "@/lib/feriados";

type Props = {
  open: boolean;
  onClose: () => void;
  data: string;
  horarioId: string;
  editing?: Planejamento | null;
};

export function PlanejamentoForm({ open, onClose, data, horarioId, editing }: Props) {
  const qc = useQueryClient();
  const [docenteId, setDocenteId] = useState("");
  const [componenteId, setComponenteId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [status, setStatus] = useState<Status>("planejado");
  const [conteudo, setConteudo] = useState("");
  const [anexoUrl, setAnexoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editing) {
      setDocenteId(editing.docente_id);
      setComponenteId(editing.componente_id);
      setTurmaId(editing.turma_id);
      setStatus(editing.status);
      setConteudo(editing.conteudo ?? "");
      setAnexoUrl(editing.anexo_url);
    } else {
      setDocenteId(""); setComponenteId(""); setTurmaId(""); setStatus("planejado"); setConteudo(""); setAnexoUrl(null);
    }
  }, [editing, open]);

  const { data: docentes = [] } = useQuery({
    queryKey: ["docentes", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("docentes").select("*").eq("ativo", true).order("nome");
      if (error) throw error; return data as Docente[];
    },
  });
  const { data: componentes = [] } = useQuery({
    queryKey: ["componentes", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("componentes_curriculares").select("*").eq("ativo", true).order("nome");
      if (error) throw error; return data as Componente[];
    },
  });
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("turmas").select("*").eq("ativo", true).order("nome");
      if (error) throw error; return data as Turma[];
    },
  });

  const { data: feriadosMun = [] } = useFeriadosMunicipais();
  const feriado = checkHoliday(data, feriadosMun);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const path = `${data}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("anexos").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
      setAnexoUrl(pub.publicUrl);
      toast.success("Anexo enviado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removerAnexo() {
    if (!anexoUrl) return;
    try {
      const idx = anexoUrl.indexOf("/anexos/");
      if (idx > -1) {
        const key = anexoUrl.substring(idx + "/anexos/".length);
        await supabase.storage.from("anexos").remove([key]);
      }
      setAnexoUrl(null);
    } catch {
      setAnexoUrl(null);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!docenteId || !componenteId || !turmaId) throw new Error("Preencha docente, componente e turma");

      // Validação de conflito (frontend)
      const { data: conflitos, error: cErr } = await supabase
        .from("planejamentos")
        .select("id, docente_id, turma_id, status")
        .eq("data", data)
        .eq("horario_id", horarioId)
        .neq("status", "cancelado");
      if (cErr) throw cErr;
      const conflito = (conflitos ?? []).some((p) =>
        p.id !== editing?.id && (p.docente_id === docenteId || p.turma_id === turmaId)
      );
      if (conflito) {
        throw new Error("Já existe uma aula cadastrada para este docente ou turma neste horário.");
      }

      const payload = {
        data, horario_id: horarioId, docente_id: docenteId, componente_id: componenteId,
        turma_id: turmaId, status, conteudo: conteudo || null, anexo_url: anexoUrl,
      };
      if (editing) {
        const { error } = await supabase.from("planejamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planejamentos").insert(payload);
        if (error) {
          if (error.code === "23505") throw new Error("Já existe uma aula cadastrada para este docente ou turma neste horário.");
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Aula atualizada" : "Aula lançada");
      qc.invalidateQueries({ queryKey: ["planejamentos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar aula" : "Lançar aula"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Docente</Label>
            <Select value={docenteId} onValueChange={setDocenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Componente curricular</Label>
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
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conteúdo ministrado</Label>
            <Textarea rows={3} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Descreva o conteúdo..." />
          </div>
          <div className="space-y-2">
            <Label>Anexo</Label>
            {anexoUrl ? (
              <div className="flex items-center gap-2 rounded-md border p-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <a href={anexoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate flex-1">Visualizar anexo</a>
                <Button size="sm" variant="ghost" onClick={removerAnexo}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <input type="file" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-secondary/80"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
