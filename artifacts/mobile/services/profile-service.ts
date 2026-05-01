import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/lib/types";

export const profileService = {
  async getByUserId(userId: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from("perfil")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as Perfil) ?? null;
  },

  async ensureExists(userId: string, email: string | null): Promise<Perfil> {
    const existing = await this.getByUserId(userId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from("perfil")
      .upsert({ id: userId, email }, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Não foi possível criar o perfil");
    return data as Perfil;
  },

  async upsert(perfil: Partial<Perfil> & { id: string }): Promise<Perfil> {
    const { data, error } = await supabase
      .from("perfil")
      .upsert(perfil, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Perfil não pôde ser salvo");
    return data as Perfil;
  },

  async update(id: string, patch: Partial<Perfil>): Promise<Perfil> {
    // Colunas que podem não existir em bancos antigos — removidas do patch se causarem erro
    const SAFE_STRIP = [
      "considerar_ipva_automatico",
      "considerar_seguro_automatico",
      "considerar_depreciacao_automatico",
      "considerar_internet_automatico",
      "valor_internet_mensal",
      "considerar_manutencoes_basicas",
      "considerar_custo_soma_automatico",
      "participar_ranking_soma",
      "mostrar_ganhos_liquidos_brutos",
      "dias_folga_semana",
      "meta_mensal",
    ] as const;

    const payload = { id, ...patch };

    // Tenta com todas as colunas primeiro
    const { data, error } = await supabase
      .from("perfil")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    if (!error) {
      if (!data) throw new Error("Perfil não encontrado");
      return data as Perfil;
    }

    // Se o erro for de coluna inexistente, tenta sem as colunas opcionais
    if (error.code === "42703" || error.message?.includes("column")) {
      const safePayload: Record<string, unknown> = { id };
      for (const key of Object.keys(patch) as (keyof Perfil)[]) {
        if (!SAFE_STRIP.includes(key as typeof SAFE_STRIP[number])) {
          safePayload[key] = patch[key];
        }
      }
      const { data: data2, error: error2 } = await supabase
        .from("perfil")
        .upsert(safePayload, { onConflict: "id" })
        .select("*")
        .maybeSingle();
      if (error2) throw error2;
      if (!data2) throw new Error("Perfil não encontrado");
      return data2 as Perfil;
    }

    throw error;
  },

  async cpfJaExiste(cpf: string, ignorarUserId?: string): Promise<boolean> {
    let q = supabase.from("perfil").select("id").eq("cpf", cpf);
    if (ignorarUserId) q = q.neq("id", ignorarUserId);
    const { data, error } = await q.limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async uploadAvatar(userId: string, fileUri: string, mimeType?: string): Promise<string> {
    const ext = (mimeType?.split("/").pop() || fileUri.split(".").pop() || "jpg")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const contentType = mimeType || `image/${ext}`;

    // XMLHttpRequest é mais confiável que fetch().blob() em Android/Expo Go
    // para file:// URIs do ImagePicker
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response as Blob);
      xhr.onerror = () => reject(new Error("Falha ao ler arquivo de imagem"));
      xhr.responseType = "blob";
      xhr.open("GET", fileUri);
      xhr.send();
    });

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  },
};
