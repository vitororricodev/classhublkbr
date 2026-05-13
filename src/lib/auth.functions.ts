// Stubs client-side. Auth está desabilitada nesta build (deploy Vercel SPA).
// Mantém a assinatura para que telas /login, /alterar-senha e /usuarios continuem
// compilando. Reativar implementando contra Supabase Auth ou backend próprio.

export type AppUser = {
  id: string;
  username: string;
  nome: string;
  role: "admin" | "operador" | "visualizador";
  ativo: boolean;
  must_change_password: boolean;
};

const DISABLED = "Autenticação desabilitada nesta versão.";

export async function login(_args: { data: { username: string; password: string } }): Promise<{ user: AppUser }> {
  throw new Error(DISABLED);
}

export async function logout(): Promise<{ ok: true }> {
  return { ok: true };
}

export async function me(): Promise<{ user: AppUser | null }> {
  return { user: null };
}

export async function changeMyPassword(_args: {
  data: { currentPassword: string; newPassword: string; confirmPassword: string };
}): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}

export async function listUsers(): Promise<{ users: AppUser[] }> {
  return { users: [] };
}

export async function createUser(_args: {
  data: { username: string; nome: string; role: AppUser["role"]; password: string; ativo: boolean };
}): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}

export async function updateUser(_args: {
  data: { id: string; nome: string; role: AppUser["role"] };
}): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}

export async function resetUserPassword(_args: {
  data: { id: string; newPassword: string };
}): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}

export async function toggleUserActive(_args: {
  data: { id: string; ativo: boolean };
}): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}

export async function deleteUser(_args: { data: { id: string } }): Promise<{ ok: true }> {
  throw new Error(DISABLED);
}
