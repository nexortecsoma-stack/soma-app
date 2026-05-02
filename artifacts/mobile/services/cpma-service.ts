import { supabase } from "@/lib/supabase";
import type { Abastecimento, Despesa, Ganho, IpvaAliquota, Jornada, Manutencao } from "@/lib/types";

export const cpmaService = {
  async fetch(profileId: string, inicio: string | null, fim: string | null) {
    let qGanhos = supabase.from("ganhos").select("*").eq("profile_id", profileId);
    if (inicio) qGanhos = qGanhos.gte("data_ganho", inicio);
    if (fim) qGanhos = qGanhos.lte("data_ganho", fim);

    let qDespesas = supabase.from("despesas").select("*").eq("profile_id", profileId);
    if (inicio) qDespesas = qDespesas.gte("data_despesa", inicio);
    if (fim) qDespesas = qDespesas.lte("data_despesa", fim);

    let qJornadas = supabase.from("jornadas").select("*").eq("profile_id", profileId);
    if (inicio) qJornadas = qJornadas.gte("data_jornada", inicio);
    if (fim) qJornadas = qJornadas.lte("data_jornada", fim);

    const [ganhosRes, despesasRes, jornadasRes, abastRes, manutRes, ipvaRes] = await Promise.all([
      qGanhos,
      qDespesas,
      qJornadas,
      supabase
        .from("abastecimentos")
        .select("*")
        .eq("profile_id", profileId)
        .order("data_abastecimento", { ascending: false })
        .limit(100),
      supabase.from("manutencoes").select("*").eq("profile_id", profileId),
      supabase.from("ipva_aliquotas").select("*"),
    ]);

    if (ganhosRes.error) throw ganhosRes.error;
    if (despesasRes.error) throw despesasRes.error;
    if (jornadasRes.error) throw jornadasRes.error;
    if (abastRes.error) throw abastRes.error;
    if (manutRes.error) throw manutRes.error;
    if (ipvaRes.error) throw ipvaRes.error;

    return {
      ganhos: (ganhosRes.data ?? []) as Ganho[],
      despesas: (despesasRes.data ?? []) as Despesa[],
      jornadas: (jornadasRes.data ?? []) as Jornada[],
      abastecimentos: (abastRes.data ?? []) as Abastecimento[],
      manutencoes: (manutRes.data ?? []) as Manutencao[],
      aliquotasIpva: (ipvaRes.data ?? []) as IpvaAliquota[],
    };
  },
};
