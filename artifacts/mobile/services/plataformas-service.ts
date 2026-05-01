import { supabase } from "@/lib/supabase";
import type { Plataforma } from "@/lib/types";

export const plataformasService = {
  async listByProfile(profileId: string): Promise<Plataforma[]> {
    const { data, error } = await Promise.resolve(
      supabase
        .from("plataformas")
        .select("id, profile_id, nome, ativa, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true }),
    );
    if (error) throw error;
    return (data ?? []) as Plataforma[];
  },

  async inserirFixa(profileId: string, nome: string): Promise<Plataforma> {
    const { data, error } = await Promise.resolve(
      supabase
        .from("plataformas")
        .insert({ profile_id: profileId, nome, ativa: false })
        .select("id, profile_id, nome, ativa, created_at")
        .maybeSingle(),
    );
    if (error) throw error;
    return data as Plataforma;
  },

  async toggle(id: string, ativa: boolean): Promise<Plataforma> {
    const { data, error } = await Promise.resolve(
      supabase
        .from("plataformas")
        .update({ ativa })
        .eq("id", id)
        .select("id, profile_id, nome, ativa, created_at")
        .maybeSingle(),
    );
    if (error) throw error;
    return data as Plataforma;
  },

  async addExtra(profileId: string, nome: string): Promise<Plataforma> {
    const { data, error } = await Promise.resolve(
      supabase
        .from("plataformas")
        .insert({ profile_id: profileId, nome, ativa: true })
        .select("id, profile_id, nome, ativa, created_at")
        .maybeSingle(),
    );
    if (error) throw error;
    return data as Plataforma;
  },

  async remove(id: string) {
    const { error } = await Promise.resolve(
      supabase.from("plataformas").delete().eq("id", id),
    );
    if (error) throw error;
  },
};
