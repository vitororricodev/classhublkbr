// Supabase client — integração externa (sem dependência do Lovable Cloud).
// Lê variáveis VITE_* (build-time) com fallback para nomes alternativos.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.SUPABASE_URL as string | undefined) ||
  "";

const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Aviso silencioso — não bloqueia o app.
  console.warn(
    "[Supabase] Variáveis ausentes. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env (ou no painel da Vercel).",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
