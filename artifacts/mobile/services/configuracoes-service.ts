import { supabase } from "@/lib/supabase";
import type { ConfiguracaoUsuario } from "@/lib/types";

export const configuracoesService = {
  async list(profileId: string): Promise<ConfiguracaoUsuario[]> {
    const { data, error } = await supabase
      .from("configuracoes_usuario")
      .select("*")
      .eq("profile_id", profileId);
    if (error) throw error;
    return (data ?? []) as ConfiguracaoUsuario[];
  },

  async set(profileId: string, chave: string, valor: string | null): Promise<void> {
    const { error } = await supabase
      .from("configuracoes_usuario")
      .upsert(
        { profile_id: profileId, chave, valor },
        { onConflict: "profile_id,chave" },
      );
    if (error) throw error;
  },

  async get(profileId: string, chave: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("configuracoes_usuario")
      .select("valor")
      .eq("profile_id", profileId)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return (data?.valor as string | null) ?? null;
  },
};
