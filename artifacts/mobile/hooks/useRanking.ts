import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { rankingService } from "@/services/ranking-service";
import { rankingEngine, periodoParaDatas, type RankingPeriodo } from "@/engines/ranking-engine";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { supabase } from "@/lib/supabase";
import type { Ganho, IpvaAliquota, Jornada, Manutencao } from "@/lib/types";

function isoStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

export function useRanking() {
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["ranking"],
    queryFn: () => rankingService.listAll(),
    staleTime: 60000,
  });

  const sincronizar = useMutation({
    mutationFn: async ({ filtro, refDate }: { filtro: RankingPeriodo; refDate: Date }) => {
      if (!userId || !perfil) throw new Error("Faça login para sincronizar");

      const { inicio, fim } = periodoParaDatas(filtro, refDate);
      const inicioISO = isoStr(inicio);
      // fim é exclusivo → subtrai 1 dia para o lte
      const fimISO = isoStr(new Date(fim.getTime() - 86400000));

      const [ganhosRes, jornadasRes, despesasRes, manutRes, ipvaRes] = await Promise.all([
        supabase.from("ganhos").select("*").eq("profile_id", userId).gte("data_ganho", inicioISO).lte("data_ganho", fimISO),
        supabase.from("jornadas").select("*").eq("profile_id", userId).gte("data_jornada", inicioISO).lte("data_jornada", fimISO),
        supabase.from("despesas").select("*").eq("profile_id", userId).gte("data_despesa", inicioISO).lte("data_despesa", fimISO),
        supabase.from("manutencoes").select("*").eq("profile_id", userId),
        supabase.from("ipva_aliquotas").select("*"),
      ]);

      if (ganhosRes.error) throw ganhosRes.error;
      if (jornadasRes.error) throw jornadasRes.error;
      if (despesasRes.error) throw despesasRes.error;
      if (manutRes.error) throw manutRes.error;
      if (ipvaRes.error) throw ipvaRes.error;

      const ganhos = (ganhosRes.data ?? []) as Ganho[];
      const jornadas = (jornadasRes.data ?? []) as Jornada[];
      const manutencoes = (manutRes.data ?? []) as Manutencao[];
      const aliquotasIpva = (ipvaRes.data ?? []) as IpvaAliquota[];

      const despesasTotal = (despesasRes.data ?? []).reduce(
        (s: number, d: any) => s + Number(d.valor || 0),
        0,
      );

      // Custo fixo mensal → proporcional ao período
      const diasNoPeriodo = Math.max(1, (fim.getTime() - inicio.getTime()) / 86400000);
      const fatorMes = diasNoPeriodo / 30;

      const custoFixo = despesaFixaEngine.calcular({
        perfil,
        veiculo,
        manutencoes,
        aliquotasIpva,
        diasTrabalhadosMes: jornadas.length,
        totalJornadasMes: jornadas.length,
      });

      const custoFixoTotal = custoFixo.custoMensal * fatorMes;

      const snapshot = rankingEngine.calcularSnapshot({
        perfil,
        veiculo,
        jornadas,
        ganhos,
        despesasTotal,
        custoFixoTotal,
        periodoInicio: inicio,
        periodoFim: new Date(fim.getTime() - 86400000),
      });

      await rankingService.upsert(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  return { list, sincronizar };
}
