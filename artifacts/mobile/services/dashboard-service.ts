import { supabase } from "@/lib/supabase";
import type {
  Abastecimento,
  Despesa,
  Ganho,
  IpvaAliquota,
  Jornada,
  Manutencao,
  Plataforma,
} from "@/lib/types";

export const dashboardService = {
  async fetchAll(profileId: string, mesReferencia: Date) {
    const inicioMes = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1)
      .toISOString()
      .split("T")[0]!;
    const fimMes = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]!;
    const inicioJanela = new Date(mesReferencia.getFullYear(), mesReferencia.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0]!;

    const [ganhosRes, despesasRes, jornadasRes, abastRes, plataformasRes, manutRes, ipvaRes] = await Promise.all([
      supabase.from("ganhos").select("*").eq("profile_id", profileId).gte("data_ganho", inicioJanela).lte("data_ganho", fimMes),
      supabase.from("despesas").select("*").eq("profile_id", profileId).gte("data_despesa", inicioMes).lte("data_despesa", fimMes),
      supabase.from("jornadas").select("*").eq("profile_id", profileId).gte("data_jornada", inicioJanela).lte("data_jornada", fimMes),
      supabase.from("abastecimentos").select("*").eq("profile_id", profileId).order("data_abastecimento", { ascending: false }).limit(30),
      supabase.from("plataformas").select("*").eq("profile_id", profileId),
      supabase.from("manutencoes").select("*").eq("profile_id", profileId),
      supabase.from("ipva_aliquotas").select("*"),
    ]);

    if (ganhosRes.error) throw ganhosRes.error;
    if (despesasRes.error) throw despesasRes.error;
    if (jornadasRes.error) throw jornadasRes.error;
    if (abastRes.error) throw abastRes.error;
    if (plataformasRes.error) throw plataformasRes.error;
    if (manutRes.error) throw manutRes.error;
    if (ipvaRes.error) throw ipvaRes.error;

    return {
      ganhos: (ganhosRes.data ?? []) as Ganho[],
      despesas: (despesasRes.data ?? []) as Despesa[],
      jornadas: (jornadasRes.data ?? []) as Jornada[],
      abastecimentos: (abastRes.data ?? []) as Abastecimento[],
      plataformas: (plataformasRes.data ?? []) as Plataforma[],
      manutencoes: (manutRes.data ?? []) as Manutencao[],
      aliquotasIpva: (ipvaRes.data ?? []) as IpvaAliquota[],
    };
  },
};
