import { supabase } from "@/integrations/supabase/client";

// A ordem preserva as dependências entre tabelas na restauração.
// As tabelas pai entram primeiro; a exclusão ocorre na ordem inversa.
export const BACKUP_TABLES = [
  "docentes",
  "componentes_curriculares",
  "turmas",
  "horarios_padrao",
  "feriados",
  "categorias_ac",
  "laboratorios",
  "usuarios",
  "usuarios_laboratorios",
  "planejamentos",
  "laboratorio_agendamentos",
  "solicitacoes_laboratorio",
  "atividades_complementares",
  "mural_publicacoes",
] as const;

// Arquivos v2 não possuíam as estruturas adicionadas na evolução para SGE.
const LEGACY_V2_TABLES = [
  "docentes",
  "componentes_curriculares",
  "turmas",
  "horarios_padrao",
  "feriados",
  "categorias_ac",
  "planejamentos",
  "laboratorio_agendamentos",
  "solicitacoes_laboratorio",
  "atividades_complementares",
] as const;

export const BACKUP_VERSION = "3.0";
const PAGE_SIZE = 1_000;
const INSERT_CHUNK_SIZE = 500;
const RESTORE_DELETE_KEY: Partial<Record<BackupTable, string>> = {
  usuarios_laboratorios: "usuario_id",
};

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupDatabase = Record<BackupTable, Record<string, unknown>[]>;

export type BackupFile = {
  version: string;
  createdAt: string;
  tables: BackupTable[];
  database: BackupDatabase;
};

export type BackupSummary = {
  version: string;
  createdAt: string;
  tableCount: number;
  recordCount: number;
  isLegacy: boolean;
};

type RawBackup = {
  version?: unknown;
  createdAt?: unknown;
  tables?: unknown;
  database?: unknown;
};

// Os tipos Supabase do repositório ainda não refletem todas as tabelas do SGE.
// O backup trabalha por nomes de tabela centralizados até a regeneração dos tipos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const backupDb = supabase as any;

function hasRowsForTables(raw: RawBackup, tables: readonly string[]) {
  if (!raw.database || typeof raw.database !== "object") return false;
  return tables.every((table) => Array.isArray((raw.database as Record<string, unknown>)[table]));
}

function isCurrentBackup(raw: RawBackup) {
  return raw.version === BACKUP_VERSION && hasRowsForTables(raw, BACKUP_TABLES);
}

function isLegacyV2Backup(raw: RawBackup) {
  return raw.version === "2.0" && hasRowsForTables(raw, LEGACY_V2_TABLES);
}

function normalizeBackup(raw: RawBackup): BackupFile {
  const sourceTables = isCurrentBackup(raw) ? BACKUP_TABLES : LEGACY_V2_TABLES;
  const database = {} as BackupDatabase;
  const source = raw.database as Record<string, Record<string, unknown>[]>;

  for (const table of BACKUP_TABLES) {
    database[table] = source[table] ?? [];
  }

  return {
    version: raw.version as string,
    createdAt: raw.createdAt as string,
    tables: [...sourceTables],
    database,
  };
}

async function readAllRows(table: BackupTable): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await backupDb
      .from(table)
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Falha ao ler "${table}": ${error.message}`);

    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function createBackup(): Promise<BackupFile> {
  const database = {} as BackupDatabase;

  for (const table of BACKUP_TABLES) {
    database[table] = await readAllRows(table);
  }

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables: [...BACKUP_TABLES],
    database,
  };
}

export function getBackupSummary(backup: BackupFile): BackupSummary {
  return {
    version: backup.version,
    createdAt: backup.createdAt,
    tableCount: backup.tables.length,
    recordCount: backup.tables.reduce((total, table) => total + backup.database[table].length, 0),
    isLegacy: backup.version === "2.0",
  };
}

export function downloadBackup(backup: BackupFile) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const name = `sge-backup-v${backup.version}-${now.getFullYear()}-${pad(
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

export function validateBackup(raw: unknown): raw is RawBackup {
  if (!raw || typeof raw !== "object") return false;
  const backup = raw as RawBackup;
  if (typeof backup.createdAt !== "string") return false;
  return isCurrentBackup(backup) || isLegacyV2Backup(backup);
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo de backup inválido.");
  }

  if (!validateBackup(parsed)) throw new Error("Arquivo de backup inválido ou incompatível.");
  return normalizeBackup(parsed);
}

async function getDefaultLaboratoryId() {
  const { data, error } = await backupDb
    .from("laboratorios")
    .select("id")
    .eq("slug", "informatica")
    .single();

  if (error || !data?.id) {
    throw new Error(
      "O Laboratório de Informática não foi encontrado para restaurar este backup legado.",
    );
  }

  return data.id as string;
}

async function rowsForRestore(
  backup: BackupFile,
  table: BackupTable,
): Promise<Record<string, unknown>[]> {
  const rows = backup.database[table];

  // Os registros v2 existiam antes de laboratorio_id. Ao restaurá-los no SGE,
  // eles pertencem ao Laboratório de Informática, que é preservado nesse modo.
  if (
    backup.version === "2.0" &&
    (table === "laboratorio_agendamentos" || table === "solicitacoes_laboratorio") &&
    rows.some((row) => !row.laboratorio_id)
  ) {
    const laboratorioId = await getDefaultLaboratoryId();
    return rows.map((row) => ({ ...row, laboratorio_id: row.laboratorio_id ?? laboratorioId }));
  }

  return rows;
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  const tablesToRestore = backup.tables;

  for (const table of [...tablesToRestore].reverse()) {
    const key = RESTORE_DELETE_KEY[table] ?? "id";
    const { error } = await backupDb.from(table).delete().not(key, "is", null);
    if (error) throw new Error(`Falha ao limpar "${table}": ${error.message}`);
  }

  for (const table of tablesToRestore) {
    const rows = await rowsForRestore(backup, table);
    if (!rows.length) continue;

    for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
      const { error } = await backupDb.from(table).insert(chunk);
      if (error) throw new Error(`Falha ao restaurar "${table}": ${error.message}`);
    }
  }
}
