import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Download, Upload, DatabaseBackup } from "lucide-react";
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreBackup,
  type BackupFile,
} from "@/lib/backupService";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);

  async function handleBackup() {
    setLoading(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      toast.success("Backup realizado com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar backup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      setPending(backup);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Arquivo de backup inválido.");
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setLoading(true);
    try {
      await restoreBackup(pending);
      await qc.invalidateQueries();
      toast.success("Backup restaurado com sucesso.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao restaurar backup.");
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes gerais do sistema.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Backup e Restauração</CardTitle>
              <CardDescription>
                Faça uma cópia completa dos seus dados ou restaure um backup anterior.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleBackup} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" /> Fazer Backup
          </Button>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" /> Restaurar Backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ATENÇÃO</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados atuais serão substituídos. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={loading}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
