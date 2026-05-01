import { supabase } from "@/lib/supabase";
import type { Jornada } from "@/lib/types";

// Remove colunas que podem não existir no banco dependendo da versão do schema.
// Adicione aqui qualquer campo que o código calcule mas o banco ainda não tenha.
function stripPayload<T extends Record<string, unknown>>(payload: T): Omit<T, "tempo_total_minutos"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tempo_total_minutos, ...rest } = payload as any;
  return rest;
}

export const jornadaService = {
  async listByProfile(profileId: string, opts?: { mes?: Date; modo?: Jornada["modo_jornada"] }): Promise<Jornada[]> {
    let q = supabase
      .from("jornadas")
      .select("*")
      .eq("profile_id", profileId)
      .order("data_jornada", { ascending: false });
    if (opts?.modo) {
      q = q.eq("modo_jornada", opts.modo);
    }
    if (opts?.mes) {
      const inicio = new Date(opts.mes.getFullYear(), opts.mes.getMonth(), 1)
        .toISOString()
        .split("T")[0]!;
      const fim = new Date(opts.mes.getFullYear(), opts.mes.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]!;
      q = q.gte("data_jornada", inicio).lte("data_jornada", fim);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Jornada[];
  },

  async create(payload: Partial<Jornada> & { profile_id: string; data_jornada: string }): Promise<Jornada> {
    const { data, error } = await supabase
      .from("jornadas")
      .insert(stripPayload(payload))
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Jornada não pôde ser criada");
    return data as Jornada;
  },

  async update(id: string, patch: Partial<Jornada>): Promise<Jornada | null> {
    const { data, error } = await supabase
      .from("jornadas")
      .update(stripPayload(patch))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    // Não lança quando data é null — o update pode ter ocorrido mas a RLS impede
    // retornar a linha atualizada. Considera sucesso se não houve erro.
    return (data as Jornada) ?? null;
  },

  async remove(id: string) {
    const { error } = await supabase.from("jornadas").delete().eq("id", id);
    if (error) throw error;
  },

  async getByDate(profileId: string, data_jornada: string): Promise<Jornada | null> {
    const { data, error } = await supabase
      .from("jornadas")
      .select("*")
      .eq("profile_id", profileId)
      .eq("data_jornada", data_jornada)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Jornada) ?? null;
  },

  async getAtiva(profileId: string): Promise<Jornada | null> {
    const { data, error } = await supabase
      .from("jornadas")
      .select("*")
      .eq("profile_id", profileId)
      .in("status", ["ativa", "pausada"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Jornada) ?? null;
  },
};
