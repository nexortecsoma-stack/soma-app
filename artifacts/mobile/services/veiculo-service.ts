import { supabase } from "@/lib/supabase";
import type { Veiculo } from "@/lib/types";

// Campos que nunca devem ser enviados no INSERT/UPDATE
const READONLY_FIELDS: (keyof Veiculo)[] = ["id", "created_at", "updated_at"];

function stripReadonly(obj: Partial<Veiculo>): Partial<Veiculo> {
  const clean = { ...obj };
  for (const f of READONLY_FIELDS) delete clean[f];
  return clean;
}

export const veiculoService = {
  async getByProfile(profileId: string): Promise<Veiculo | null> {
    const { data, error } = await supabase
      .from("veiculo")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Veiculo) ?? null;
  },

  async listByProfile(profileId: string): Promise<Veiculo[]> {
    const { data, error } = await supabase
      .from("veiculo")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Veiculo[];
  },

  async upsert(veiculo: Partial<Veiculo> & { profile_id: string }): Promise<Veiculo> {
    const payload = stripReadonly(veiculo);

    if (veiculo.id) {
      const { data, error } = await supabase
        .from("veiculo")
        .update(payload)
        .eq("id", veiculo.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Veiculo;
    }

    const { data, error } = await supabase
      .from("veiculo")
      .insert({ ...payload, profile_id: veiculo.profile_id })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Veiculo;
  },

  async remove(id: string) {
    const { error } = await supabase.from("veiculo").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
