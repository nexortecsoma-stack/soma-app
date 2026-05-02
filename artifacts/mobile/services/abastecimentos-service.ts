import { supabase } from "@/lib/supabase";
import type { Abastecimento } from "@/lib/types";

const COLS = [
  "id",
  "profile_id",
  "veiculo_id",
  "data_abastecimento",
  "valor_total",
  "preco_por_litro",
  "litros",
  "tipo_combustivel",
  "autonomia_km_litro",
  "consumo_kwh",
  "valor_kwh",
  "uso",
  "observacao",
  "created_at",
].join(", ");

export const abastecimentosService = {
  async listByProfile(profileId: string): Promise<Abastecimento[]> {
    const { data, error } = await supabase
      .from("abastecimentos")
      .select(COLS)
      .eq("profile_id", profileId)
      .order("data_abastecimento", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Abastecimento[];
  },

  async ultimos30(profileId: string): Promise<Abastecimento[]> {
    const { data, error } = await supabase
      .from("abastecimentos")
      .select(COLS)
      .eq("profile_id", profileId)
      .order("data_abastecimento", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []) as unknown as Abastecimento[];
  },

  async create(payload: Omit<Abastecimento, "id" | "created_at" | "updated_at">): Promise<Abastecimento> {
    const { data, error } = await supabase
      .from("abastecimentos")
      .insert(payload as any)
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Abastecimento;
  },

  async update(id: string, patch: Partial<Abastecimento>): Promise<Abastecimento> {
    const { data, error } = await supabase
      .from("abastecimentos")
      .update(patch as any)
      .eq("id", id)
      .select(COLS)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Abastecimento;
  },

  async remove(id: string) {
    const { error } = await supabase.from("abastecimentos").delete().eq("id", id);
    if (error) throw error;
  },

  async removeByDate(profileId: string, date: string) {
    const { error } = await supabase
      .from("abastecimentos")
      .delete()
      .eq("profile_id", profileId)
      .eq("data_abastecimento", date);
    if (error) throw error;
  },
};
