import { supabase } from "@/integrations/supabase/client";

// Ordem importa para respeitar FKs no restore.
// Tabelas "pai" primeiro, "filhas" (com FK) por último.
export const BACKUP_TABLES = [
  "docentes",
  "componentes_curriculares",
  "turmas",
  "horarios_padrao",
  "feriados",
  "planejamentos",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupFile = {
  version: string;
  createdAt: string;
  database: Record<BackupTable, Record<string, unknown>[]>;
};

export async function createBackup(): Promise<BackupFile> {
  const database = {} as BackupFile["database"];
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`Falha ao ler "${table}": ${error.message}`);
    database[table] = (data ?? []) as Record<string, unknown>[];
  }
  return {
    version: "1.0",
    createdAt: new Date().toISOString(),
    database,
  };
}

export function downloadBackup(backup: BackupFile) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const name = `classhub-backup-${now.getFullYear()}-${pad(
    now.getMonth() + 1,
  )}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}.json`;

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function validateBackup(raw: unknown): raw is BackupFile {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Partial<BackupFile>;
  if (typeof b.version !== "string") return false;
  if (!b.database || typeof b.database !== "object") return false;
  for (const table of BACKUP_TABLES) {
    const rows = (b.database as Record<string, unknown>)[table];
    if (!Array.isArray(rows)) return false;
  }
  return true;
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo de backup inválido.");
  }
  if (!validateBackup(parsed)) throw new Error("Arquivo de backup inválido.");
  return parsed;
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  // 1) Validar já foi feito. 2) Apagar em ordem inversa (respeita FKs).
  const reverse = [...BACKUP_TABLES].reverse();
  for (const table of reverse) {
    // Não usar delete sem filtro. Usa NOT IS NULL em id (sempre presente).
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`Falha ao limpar "${table}": ${error.message}`);
  }

  // 3) Inserir em ordem direta.
  for (const table of BACKUP_TABLES) {
    const rows = backup.database[table];
    if (!rows.length) continue;
    // Insere em lotes para evitar payload gigante.
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).insert(chunk as never);
      if (error)
        throw new Error(`Falha ao restaurar "${table}": ${error.message}`);
    }
  }
}
