import { supabase } from "@/lib/supabase";
import type { ConferenciaHodometro } from "@/lib/types";

export const conferenciaHodometroService = {
  async listByProfile(profileId: string): Promise<ConferenciaHodometro[]> {
    const { data, error } = await supabase
      .from("conferencias_hodometro")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_conferencia", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ConferenciaHodometro[];
  },

  async ultima(profileId: string): Promise<ConferenciaHodometro | null> {
    const { data, error } = await supabase
      .from("conferencias_hodometro")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_conferencia", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as ConferenciaHodometro) ?? null;
  },

  async create(payload: Omit<ConferenciaHodometro, "id" | "created_at" | "updated_at">): Promise<ConferenciaHodometro> {
    const { data, error } = await supabase
      .from("conferencias_hodometro")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as ConferenciaHodometro;
  },

  async update(id: string, patch: Partial<Omit<ConferenciaHodometro, "id" | "profile_id" | "created_at" | "updated_at">>): Promise<ConferenciaHodometro> {
    const { data, error } = await supabase
      .from("conferencias_hodometro")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as ConferenciaHodometro;
  },

  async remove(id: string) {
    const { error } = await supabase.from("conferencias_hodometro").delete().eq("id", id);
    if (error) throw error;
  },
};
