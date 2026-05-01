import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { rankingService } from "@/services/ranking-service";
import { rankingEngine } from "@/engines/ranking-engine";
import { ganhosService } from "@/services/ganhos-service";
import { despesasService } from "@/services/despesas-service";
import { jornadaService } from "@/services/jornada-service";
import { despesasFixasService } from "@/services/despesas-fixas-service";
import { manutencoesService } from "@/services/manutencoes-service";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { dateEngine } from "@/engines/date-engine";

export function useRanking() {
  const { perfil, veiculo, session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["ranking-soma"],
    queryFn: () => rankingService.listAll(),
  });

  const sincronizar = useMutation({
    mutationFn: async () => {
      if (!userId || !perfil) throw new Error("Sem sessão");
      if (!perfil.participar_ranking_soma) {
        await rankingService.remove(userId);
        return null;
      }
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const [jornadas, ganhos, despesas, manutencoes, aliquotas] = await Promise.all([
        jornadaService.listByProfile(userId, { mes: hoje }),
        ganhosService.listByProfile(userId, { mes: hoje }),
        despesasService.listByProfile(userId, { mes: hoje }),
        manutencoesService.listByProfile(userId),
        despesasFixasService.listIpvaAliquotas(),
      ]);
      const despesasTotal = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);
      const diasTrabalhados = new Set(jornadas.map((j) => j.data_jornada)).size;
      const kmTotal = jornadas.reduce(
        (s, j) => s + Number(j.km_percorrido_real || j.km_percorrido || 0),
        0,
      );
      const custo = despesaFixaEngine.calcular({
        perfil,
        veiculo,
        manutencoes,
        aliquotasIpva: aliquotas,
        diasTrabalhadosMes: diasTrabalhados,
        totalJornadasMes: jornadas.length,
        kmMediaDiaria: diasTrabalhados > 0 ? kmTotal / diasTrabalhados : 0,
        diaAtual: hoje.getDate(),
        diasMes: dateEngine.diasNoMes(hoje),
      });

      const snapshot = rankingEngine.calcularSnapshot({
        perfil,
        veiculo,
        jornadas,
        ganhos,
        despesasTotal,
        custoFixoTotal: custo.custoAcumuladoMes,
        periodoInicio: inicio,
        periodoFim: fim,
      });
      return rankingService.upsert(snapshot);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ranking-soma"] }),
  });

  return { list, sincronizar };
}
