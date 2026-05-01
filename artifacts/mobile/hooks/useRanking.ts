import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { rankingService } from "@/services/ranking-service";
import { rankingEngine } from "@/engines/ranking-engine";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { supabase } from "@/lib/supabase";
import type { Ganho, IpvaAliquota, Jornada, Manutencao } from "@/lib/types";

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
    mutationFn: async () => {
      if (!userId || !perfil) throw new Error("Faça login para sincronizar");
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split("T")[0]!;
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split("T")[0]!;

      const [ganhosRes, jornadasRes, despesasRes, manutRes, ipvaRes] = await Promise.all([
        supabase.from("ganhos").select("*").eq("profile_id", userId).gte("data_ganho", inicioMes).lte("data_ganho", fimMes),
        supabase.from("jornadas").select("*").eq("profile_id", userId).gte("data_jornada", inicioMes).lte("data_jornada", fimMes),
        supabase.from("despesas").select("*").eq("profile_id", userId).gte("data_despesa", inicioMes).lte("data_despesa", fimMes),
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

      const despesasTotal = (despesasRes.data ?? []).reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
      const jornadasNoMes = jornadas.filter((j) => j.data_jornada >= new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0]!);

      const custoFixo = despesaFixaEngine.calcular({
        perfil,
        veiculo,
        manutencoes,
        aliquotasIpva,
        diasTrabalhadosMes: jornadasNoMes.length,
        totalJornadasMes: jornadasNoMes.length,
      });

      const periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const periodoFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const snapshot = rankingEngine.calcularSnapshot({
        perfil,
        veiculo,
        jornadas,
        ganhos,
        despesasTotal,
        custoFixoTotal: custoFixo.custoMensal,
        periodoInicio,
        periodoFim,
      });

      await rankingService.upsert(snapshot);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  return { list, sincronizar };
}
