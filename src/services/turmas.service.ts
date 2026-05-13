import { supabase } from "@/lib/supabase";
import type { Turma } from "@/lib/db";

export const turmasService = {
  async list(): Promise<Turma[]> {
    const { data, error } = await supabase.from("turmas").select("*").order("serie").order("nome");
    if (error) throw error;
    return (data ?? []) as Turma[];
  },
  async create(input: Omit<Turma, "id" | "created_at">) {
    const { error } = await supabase.from("turmas").insert(input);
    if (error) throw error;
  },
  async update(id: string, input: Partial<Omit<Turma, "id" | "created_at">>) {
    const { error } = await supabase.from("turmas").update(input).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) throw error;
  },
};
