import { supabase } from "@/lib/supabase";
import type { RankingSoma } from "@/lib/types";

export const rankingService = {
  async listAll(): Promise<RankingSoma[]> {
    const { data, error } = await supabase
      .from("ranking_soma")
      .select("*")
      .order("atualizado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []) as RankingSoma[];
  },

  async upsert(payload: Omit<RankingSoma, "atualizado_em">): Promise<void> {
    const now = new Date().toISOString();

    // Verifica se já existe um registro para este profile_id
    const { data: existing, error: selectErr } = await supabase
      .from("ranking_soma")
      .select("profile_id")
      .eq("profile_id", payload.profile_id)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (existing) {
      const { error } = await supabase
        .from("ranking_soma")
        .update({ ...payload, atualizado_em: now })
        .eq("profile_id", payload.profile_id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("ranking_soma")
        .insert({ ...payload, atualizado_em: now });
      if (error) throw error;
    }
  },

  async remove(profileId: string) {
    const { error } = await supabase
      .from("ranking_soma")
      .delete()
      .eq("profile_id", profileId);
    if (error) throw error;
  },
};
