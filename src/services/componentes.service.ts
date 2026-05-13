import { supabase } from "@/lib/supabase";
import type { Componente } from "@/lib/db";

export const componentesService = {
  async list(): Promise<Componente[]> {
    const { data, error } = await supabase.from("componentes_curriculares").select("*").order("nome");
    if (error) throw error;
    return (data ?? []) as Componente[];
  },
  async create(input: Omit<Componente, "id" | "created_at">) {
    const { error } = await supabase.from("componentes_curriculares").insert(input);
    if (error) throw error;
  },
  async update(id: string, input: Partial<Omit<Componente, "id" | "created_at">>) {
    const { error } = await supabase.from("componentes_curriculares").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("componentes_curriculares").delete().eq("id", id);
    if (error) throw error;
  },
};
