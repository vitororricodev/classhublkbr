import { supabase } from "@/lib/supabase";
import { PLAN_SELECT, type Planejamento, type PlanejamentoFull } from "@/lib/db";

export const planejamentosService = {
  async list(): Promise<PlanejamentoFull[]> {
    const { data, error } = await supabase
      .from("planejamentos")
      .select(PLAN_SELECT)
      .order("data", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PlanejamentoFull[];
  },
  async byRange(from: string, to: string): Promise<PlanejamentoFull[]> {
    const { data, error } = await supabase
      .from("planejamentos")
      .select(PLAN_SELECT)
      .gte("data", from)
      .lte("data", to);
    if (error) throw error;
    return (data ?? []) as unknown as PlanejamentoFull[];
  },
  async create(input: Omit<Planejamento, "id" | "created_at" | "updated_at">) {
    const { error } = await supabase.from("planejamentos").insert(input);
    if (error) throw error;
  },
  async update(id: string, input: Partial<Omit<Planejamento, "id" | "created_at" | "updated_at">>) {
    const { error } = await supabase.from("planejamentos").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("planejamentos").delete().eq("id", id);
    if (error) throw error;
  },
};
