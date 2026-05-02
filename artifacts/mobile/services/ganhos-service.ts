import { supabase } from "@/lib/supabase";
import type { Ganho } from "@/lib/types";

type GanhoInsert = {
  profile_id: string;
  jornada_id: string | null;
  plataforma_id: string | null;
  data_ganho: string;
  valor: number;
  corridas: number;
};

function toInsert(payload: Omit<Ganho, "id" | "created_at" | "updated_at">): GanhoInsert {
  return {
    profile_id: payload.profile_id,
    jornada_id: payload.jornada_id ?? null,
    plataforma_id: payload.plataforma_id ?? null,
    data_ganho: payload.data_ganho,
    valor: payload.valor,
    corridas: payload.corridas ?? 0,
  };
}

const COLS = "id, profile_id, jornada_id, plataforma_id, data_ganho, valor, corridas, created_at";

export const ganhosService = {
  async listByProfile(profileId: string, opts?: { mes?: Date }): Promise<Ganho[]> {
    let q = supabase
      .from("ganhos")
      .select(COLS)
      .eq("profile_id", profileId)
      .order("data_ganho", { ascending: false });
    if (opts?.mes) {
      const inicio = new Date(opts.mes.getFullYear(), opts.mes.getMonth(), 1)
        .toISOString()
        .split("T")[0]!;
      const fim = new Date(opts.mes.getFullYear(), opts.mes.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]!;
      q = q.gte("data_ganho", inicio).lte("data_ganho", fim);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Ganho[];
  },

  async create(payload: Omit<Ganho, "id" | "created_at" | "updated_at">): Promise<Ganho> {
    const { data, error } = await supabase
      .from("ganhos")
      .insert(toInsert(payload))
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    return data as Ganho;
  },

  async update(id: string, patch: Partial<Ganho>): Promise<Ganho> {
    const safe: Partial<GanhoInsert> = {};
    if (patch.valor !== undefined) safe.valor = patch.valor;
    if (patch.corridas !== undefined) safe.corridas = patch.corridas;
    if (patch.data_ganho !== undefined) safe.data_ganho = patch.data_ganho;
    if (patch.jornada_id !== undefined) safe.jornada_id = patch.jornada_id ?? null;
    if ("plataforma_id" in patch) safe.plataforma_id = patch.plataforma_id ?? null;
    const { data, error } = await supabase
      .from("ganhos")
      .update(safe)
      .eq("id", id)
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    return data as Ganho;
  },

  async remove(id: string) {
    const { error } = await supabase.from("ganhos").delete().eq("id", id);
    if (error) throw error;
  },

  async removeByDate(profileId: string, date: string) {
    const { error } = await supabase
      .from("ganhos")
      .delete()
      .eq("profile_id", profileId)
      .eq("data_ganho", date);
    if (error) throw error;
  },
};
