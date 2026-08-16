import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type Laboratorio = { id: string; slug: "informatica" | "multidisciplinar"; nome: string; ativo: boolean };
// Schema gerado é atualizado após a migration ser aplicada no Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function useLaboratorioAtual() {
  const search = useRouterState({ select: (s) => s.location.search as { lab?: string } });
  const slug = search.lab === "multidisciplinar" ? "multidisciplinar" : "informatica";
  const query = useQuery({ queryKey: ["laboratorios"], queryFn: async () => {
    const { data, error } = await sb.from("laboratorios").select("id, slug, nome, ativo").eq("ativo", true).order("nome");
    if (error) throw error;
    return (data ?? []) as Laboratorio[];
  }});
  return { ...query, slug, laboratorio: query.data?.find((l) => l.slug === slug) ?? null };
}
