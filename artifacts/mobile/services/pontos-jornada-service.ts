import { supabase } from "@/lib/supabase";
import type { PontoJornada } from "@/lib/types";

export const pontosJornadaService = {
  async listByJornada(jornadaId: string): Promise<PontoJornada[]> {
    const { data, error } = await supabase
      .from("pontos_jornada")
      .select("*")
      .eq("jornada_id", jornadaId)
      .order("recorded_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PontoJornada[];
  },

  async insertBatch(payload: Omit<PontoJornada, "id" | "created_at">[]) {
    if (payload.length === 0) return;
    const { error } = await supabase.from("pontos_jornada").insert(payload);
    if (error) throw error;
  },

  async insertOne(payload: Omit<PontoJornada, "id" | "created_at">) {
    const { error } = await supabase.from("pontos_jornada").insert(payload);
    if (error) throw error;
  },

  async removeByJornada(jornadaId: string) {
    const { error } = await supabase.from("pontos_jornada").delete().eq("jornada_id", jornadaId);
    if (error) throw error;
  },
};
