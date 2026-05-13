import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { me, logout, type AppUser } from "./auth.functions";

type Ctx = {
  user: AppUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const meFn = useServerFn(me);
  const logoutFn = useServerFn(logout);
  const qc = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);

  const { data, isLoading: queryIsLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => (await meFn()).user,
    staleTime: 60_000,
  });

  // Marca como hidratado após o cliente montar
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Durante a hidratação do servidor, não mostrar loading state
  const isLoading = isHydrated ? queryIsLoading : false;

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        refresh: async () => {
          await qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
        signOut: async () => {
          await logoutFn();
          await qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
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
