import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  SESSION_CONFIG,
  type SessionData,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "./auth.server";

export type AppUser = {
  id: string;
  username: string;
  nome: string;
  role: "admin" | "operador" | "visualizador";
  ativo: boolean;
  must_change_password: boolean;
  created_at: string;
};

const PUBLIC_FIELDS = "id, username, nome, role, ativo, must_change_password, created_at";

async function getSession() {
  return useSession<SessionData>(SESSION_CONFIG);
}

async function requireUser(): Promise<AppUser> {
  const session = await getSession();
  const userId = session.data?.userId;
  if (!userId) throw new Error("Não autenticado.");
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select(PUBLIC_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    await session.clear();
    throw new Error("Sessão inválida.");
  }
  if (!data.ativo) {
    await session.clear();
    throw new Error("Usuário inativo.");
  }
  return data as AppUser;
}

async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Acesso restrito a administradores.");
  return user;
}

// ----- Public auth -----

export const login = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().trim().min(1).max(64),
      password: z.string().min(1).max(200),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, nome, role, ativo, must_change_password, password_hash")
      .ilike("username", data.username)
      .maybeSingle();

    if (error) {
      console.error("[login] supabase error:", error);
      throw new Error("Usuário ou senha inválidos.");
    }
    if (!row) {
      console.warn("[login] user not found:", data.username);
      throw new Error("Usuário ou senha inválidos.");
    }
    if (!row.ativo) throw new Error("Usuário inativo. Procure um administrador.");

    let ok = false;
    try {
      ok = await verifyPassword(data.password, row.password_hash);
    } catch (e) {
      console.error("[login] verifyPassword threw:", e);
      throw new Error("Falha ao validar credenciais. Tente novamente.");
    }
    if (!ok) {
      console.warn("[login] wrong password for:", row.username);
      throw new Error("Usuário ou senha inválidos.");
    }

    const session = await getSession();
    await session.update({ userId: row.id });

    return {
      user: {
        id: row.id,
        username: row.username,
        nome: row.nome,
        role: row.role,
        ativo: row.ativo,
        must_change_password: row.must_change_password,
      },
    };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  await session.clear();
  return { ok: true };
});

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  const userId = session.data?.userId;
  if (!userId) return { user: null as AppUser | null };
  const { data } = await supabaseAdmin
    .from("app_users")
    .select(PUBLIC_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  if (!data || !data.ativo) {
    await session.clear();
    return { user: null as AppUser | null };
  }
  return { user: data as AppUser };
});

export const changeMyPassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(1),
      confirmPassword: z.string().min(1),
    }).parse,
  )
  .handler(async ({ data }) => {
    const session = await getSession();
    const userId = session.data?.userId;
    if (!userId) throw new Error("Não autenticado.");

    if (data.newPassword !== data.confirmPassword)
      throw new Error("A confirmação não confere.");
    const err = validatePasswordStrength(data.newPassword);
    if (err) throw new Error(err);

    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (!row) throw new Error("Usuário não encontrado.");

    const ok = await verifyPassword(data.currentPassword, row.password_hash);
    if (!ok) throw new Error("Senha atual incorreta.");

    const hash = await hashPassword(data.newPassword);
    await supabaseAdmin
      .from("app_users")
      .update({ password_hash: hash, must_change_password: false })
      .eq("id", userId);

    return { ok: true };
  });

// ----- Admin: user management -----

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select(PUBLIC_FIELDS)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return { users: (data ?? []) as AppUser[] };
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      username: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado."),
      nome: z.string().trim().min(1).max(120),
      role: z.enum(["admin", "operador", "visualizador"]),
      password: z.string().min(1),
      ativo: z.boolean().optional().default(true),
    }).parse,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const err = validatePasswordStrength(data.password);
    if (err) throw new Error(err);

    const { data: existing } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();
    if (existing) throw new Error("Já existe um usuário com esse nome.");

    const password_hash = await hashPassword(data.password);
    const { error } = await supabaseAdmin.from("app_users").insert({
      username: data.username,
      nome: data.nome,
      role: data.role,
      password_hash,
      ativo: data.ativo ?? true,
      must_change_password: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      nome: z.string().trim().min(1).max(120),
      role: z.enum(["admin", "operador", "visualizador"]),
    }).parse,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    // Prevent demoting the last active admin
    if (data.role !== "admin") {
      const { data: target } = await supabaseAdmin
        .from("app_users")
        .select("role, ativo")
        .eq("id", data.id)
        .maybeSingle();
      if (target?.role === "admin" && target.ativo) {
        const { count } = await supabaseAdmin
          .from("app_users")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("ativo", true);
        if ((count ?? 0) <= 1)
          throw new Error("Não é possível alterar o perfil do último administrador ativo.");
      }
    }
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ nome: data.nome, role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      newPassword: z.string().min(1),
    }).parse,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const err = validatePasswordStrength(data.newPassword);
    if (err) throw new Error(err);
    const password_hash = await hashPassword(data.newPassword);
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ password_hash, must_change_password: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse,
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (!data.ativo) {
      const { data: target } = await supabaseAdmin
        .from("app_users")
        .select("role, ativo")
        .eq("id", data.id)
        .maybeSingle();
      if (target?.role === "admin" && target.ativo) {
        const { count } = await supabaseAdmin
          .from("app_users")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("ativo", true);
        if ((count ?? 0) <= 1)
          throw new Error("Não é possível desativar o último administrador ativo.");
      }
      if (data.id === admin.id)
        throw new Error("Você não pode desativar a si mesmo.");
    }
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.id === admin.id) throw new Error("Você não pode excluir a si mesmo.");
    const { data: target } = await supabaseAdmin
      .from("app_users")
      .select("role, ativo")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.role === "admin" && target.ativo) {
      const { count } = await supabaseAdmin
        .from("app_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("ativo", true);
      if ((count ?? 0) <= 1)
        throw new Error("Não é possível excluir o último administrador ativo.");
    }
    const { error } = await supabaseAdmin.from("app_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
