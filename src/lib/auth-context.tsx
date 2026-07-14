import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppUser = {
  id: string;
  usuario: string;
  nome: string;
  tipo: "admin" | "usuario";
  primeiro_login: boolean;
};

type Ctx = {
  user: AppUser | null;
  isLoading: boolean;
  signIn: (usuario: string, senha: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AppUser | null) => void;
};

const AuthContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "classhub.session.v1";

function readStoredUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.usuario === "string") {
      return parsed as AppUser;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredUser(u: AppUser | null) {
  if (typeof window === "undefined") return;
  if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  const setUser = useCallback((u: AppUser | null) => {
    setUserState(u);
    writeStoredUser(u);
  }, []);

  const signIn = useCallback(async (usuario: string, senha: string): Promise<AppUser> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, usuario, nome, tipo, primeiro_login, senha, ativo")
        .eq("usuario", usuario)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || (data as any).senha !== senha) {
        throw new Error("Usuário ou senha inválidos.");
      }
      const row = data as any;
      const u: AppUser = {
        id: row.id,
        usuario: row.usuario,
        nome: row.nome,
        tipo: (row.tipo === "admin" ? "admin" : "usuario") as "admin" | "usuario",
        primeiro_login: row.primeiro_login,
      };
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const signOut = useCallback(async () => {
    setUser(null);
  }, [setUser]);

  const refresh = useCallback(async () => {
    // No server-side session; nothing to refresh.
  }, []);

  useEffect(() => {
    // Sincroniza entre abas
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUserState(readStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
