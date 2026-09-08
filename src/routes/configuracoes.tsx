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
  getBackupSummary,
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
  const pendingSummary = pending ? getBackupSummary(pending) : null;

  async function handleBackup() {
    setLoading(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      toast.success("Backup SGE v3 realizado com sucesso.");
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
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backup e Restauração</h1>
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
                Proteja os dados do SGE e recupere uma cópia anterior quando necessário.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>
              O backup v3 inclui cadastros, planejamentos, laboratórios, dados pedagógicos do LabCS,
              mural, contas e permissões dos responsáveis pelos laboratórios.
            </p>
            <p className="mt-2">
              Guarde o arquivo em local seguro: ele contém dados sensíveis de acesso. Anexos
              enviados ao bucket <code>anexos</code> não fazem parte deste arquivo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSummary && (
                <>
                  Este arquivo v{pendingSummary.version} possui {pendingSummary.recordCount}{" "}
                  registros em {pendingSummary.tableCount} tabelas. Todos os dados cobertos pelo
                  arquivo substituirão os dados atuais.
                </>
              )}
            </AlertDialogDescription>
            {pendingSummary?.isLegacy && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Este é um arquivo v2. Os dados novos do SGE que não existiam nele, como mural e
                vínculos do LabCS, serão preservados no ambiente atual.
              </p>
            )}
            <p className="text-sm text-destructive">
              As contas e permissões do laboratório também serão substituídas. Confirme que este é o
              arquivo correto.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={loading}>
              Restaurar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
