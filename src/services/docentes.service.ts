import { supabase } from "@/lib/supabase";
import type { Docente } from "@/lib/db";

export const docentesService = {
  async list(): Promise<Docente[]> {
    const { data, error } = await supabase.from("docentes").select("*").order("nome");
    if (error) throw error;
    return (data ?? []) as Docente[];
  },
  async create(input: Omit<Docente, "id" | "created_at">) {
    const { error } = await supabase.from("docentes").insert(input);
    if (error) throw error;
  },
  async update(id: string, input: Partial<Omit<Docente, "id" | "created_at">>) {
    const { error } = await supabase.from("docentes").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("docentes").delete().eq("id", id);
    if (error) throw error;
  },
};
