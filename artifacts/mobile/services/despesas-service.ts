import { supabase } from "@/lib/supabase";
import type { Despesa } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function strip<T extends Record<string, unknown>>(p: T): Omit<T, "jornada_id"> {
  const { jornada_id, ...rest } = p as any;
  return rest;
}

export const despesasService = {
  async listByProfile(profileId: string, opts?: { mes?: Date }): Promise<Despesa[]> {
    let q = supabase
      .from("despesas")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_despesa", { ascending: false });
    if (opts?.mes) {
      const inicio = new Date(opts.mes.getFullYear(), opts.mes.getMonth(), 1)
        .toISOString()
        .split("T")[0]!;
      const fim = new Date(opts.mes.getFullYear(), opts.mes.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]!;
      q = q.gte("data_despesa", inicio).lte("data_despesa", fim);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Despesa[];
  },

  async create(payload: Omit<Despesa, "id" | "created_at" | "updated_at">): Promise<Despesa> {
    const { data, error } = await supabase
      .from("despesas")
      .insert(strip(payload))
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as Despesa;
  },

  async update(id: string, patch: Partial<Despesa>): Promise<Despesa> {
    const { data, error } = await supabase
      .from("despesas")
      .update(strip(patch))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as Despesa;
  },

  async remove(id: string) {
    const { error } = await supabase.from("despesas").delete().eq("id", id);
    if (error) throw error;
  },
};
