import { supabase } from "@/lib/supabase";
import type { Horario } from "@/lib/db";

export const horariosService = {
  async list(): Promise<Horario[]> {
    const { data, error } = await supabase.from("horarios_padrao").select("*").order("ordem");
    if (error) throw error;
    return (data ?? []) as Horario[];
  },
  async create(input: Omit<Horario, "id">) {
    const { error } = await supabase.from("horarios_padrao").insert(input);
    if (error) throw error;
  },
  async update(id: string, input: Partial<Omit<Horario, "id">>) {
    const { error } = await supabase.from("horarios_padrao").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("horarios_padrao").delete().eq("id", id);
    if (error) throw error;
  },
};
