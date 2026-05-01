import { supabase } from "@/lib/supabase";
import type { Manutencao } from "@/lib/types";

export const manutencoesService = {
  async listByProfile(profileId: string): Promise<Manutencao[]> {
    const { data, error } = await supabase
      .from("manutencoes")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_manutencao", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Manutencao[];
  },

  async create(payload: Omit<Manutencao, "id" | "created_at" | "updated_at">): Promise<Manutencao> {
    const { data, error } = await supabase.from("manutencoes").insert(payload).select("*").maybeSingle();
    if (error) throw error;
    return data as Manutencao;
  },

  async update(id: string, patch: Partial<Manutencao>): Promise<Manutencao> {
    const { data, error } = await supabase
      .from("manutencoes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as Manutencao;
  },

  async remove(id: string) {
    const { error } = await supabase.from("manutencoes").delete().eq("id", id);
    if (error) throw error;
  },
};
