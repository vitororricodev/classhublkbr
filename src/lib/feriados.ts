import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Feriado = {
  id: string;
  nome: string;
  data: string; // YYYY-MM-DD
  tipo: "nacional" | "municipal";
  ativo: boolean;
  created_at: string;
};

// Feriados nacionais fixos (data MM-DD)
export const FERIADOS_NACIONAIS_FIXOS: { mmdd: string; nome: string }[] = [
  { mmdd: "01-01", nome: "Confraternização Universal" },
  { mmdd: "04-21", nome: "Tiradentes" },
  { mmdd: "05-01", nome: "Dia do Trabalhador" },
  { mmdd: "09-07", nome: "Independência do Brasil" },
  { mmdd: "10-12", nome: "Nossa Senhora Aparecida" },
  { mmdd: "11-02", nome: "Finados" },
  { mmdd: "11-15", nome: "Proclamação da República" },
  { mmdd: "11-20", nome: "Consciência Negra" },
  { mmdd: "12-25", nome: "Natal" },
];

export type HolidayHit = { nome: string; tipo: "nacional" | "municipal" };

export function checkHoliday(
  isoDate: string,
  municipais: Feriado[] = [],
): HolidayHit | null {
  // isoDate = YYYY-MM-DD
  const mmdd = isoDate.slice(5);
  const nat = FERIADOS_NACIONAIS_FIXOS.find((f) => f.mmdd === mmdd);
  if (nat) return { nome: nat.nome, tipo: "nacional" };
  const mun = municipais.find((f) => f.ativo && f.data === isoDate);
  if (mun) return { nome: mun.nome, tipo: "municipal" };
  return null;
}

export function useFeriadosMunicipais() {
  return useQuery({
    queryKey: ["feriados", "municipais"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("feriados")
        .select("*")
        .eq("ativo", true)
        .order("data");
      if (error) throw error;
      return (data ?? []) as Feriado[];
    },
  });
}
