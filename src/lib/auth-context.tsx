import { createContext, useContext, type ReactNode } from "react";

export type AppUser = {
  id: string;
  username: string;
  nome: string;
  role: "admin" | "operador" | "visualizador";
  ativo: boolean;
  must_change_password: boolean;
};

type Ctx = {
  user: AppUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

// Auth desabilitado temporariamente — provider stub.
// Quando reativar, implementar via Supabase Auth ou camada própria.
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        isLoading: false,
        refresh: async () => {},
        signOut: async () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
