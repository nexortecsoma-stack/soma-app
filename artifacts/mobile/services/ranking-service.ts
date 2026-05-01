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
    const { error } = await supabase
      .from("ranking_soma")
      .upsert(payload, { onConflict: "profile_id" });
    if (error) throw error;
  },

  async remove(profileId: string) {
    const { error } = await supabase.from("ranking_soma").delete().eq("profile_id", profileId);
    if (error) throw error;
  },
};
