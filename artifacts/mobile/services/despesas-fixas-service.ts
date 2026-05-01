import { supabase } from "@/lib/supabase";
import type { DespesaFixa, IpvaAliquota } from "@/lib/types";

export const despesasFixasService = {
  async listByProfile(profileId: string): Promise<DespesaFixa[]> {
    const { data, error } = await supabase
      .from("despesas_fixas")
      .select("*")
      .eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []) as DespesaFixa[];
  },

  async upsert(payload: Partial<DespesaFixa> & { profile_id: string; tipo: string }): Promise<DespesaFixa> {
    if (payload.id) {
      const { data, error } = await supabase
        .from("despesas_fixas")
        .update(payload)
        .eq("id", payload.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as DespesaFixa;
    }
    const { data, error } = await supabase
      .from("despesas_fixas")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as DespesaFixa;
  },

  async remove(id: string) {
    const { error } = await supabase.from("despesas_fixas").delete().eq("id", id);
    if (error) throw error;
  },

  async listIpvaAliquotas(): Promise<IpvaAliquota[]> {
    const { data, error } = await supabase.from("ipva_aliquotas").select("*");
    if (error) throw error;
    return (data ?? []) as IpvaAliquota[];
  },
};
