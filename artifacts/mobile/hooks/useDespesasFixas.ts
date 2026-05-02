import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { despesasFixasService } from "@/services/despesas-fixas-service";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { jornadaService } from "@/services/jornada-service";
import { manutencoesService } from "@/services/manutencoes-service";
import { conferenciaHodometroService } from "@/services/conferencia-hodometro-service";
import { dateEngine } from "@/engines/date-engine";
import type { ConferenciaHodometro } from "@/lib/types";

/**
 * Calcula a média mensal de km rodados a partir das conferências de hodômetro.
 * - 1 conferência: usa km_total_periodo diretamente (1 período = ~1 mês por convenção)
 * - 2+ conferências: calcula km/dia por intervalo entre datas consecutivas → × 30
 * - Sem conferências: retorna null (fallback para jornadas)
 */
function kmMediaMensalDeConferencias(confs: ConferenciaHodometro[]): number | null {
  if (confs.length === 0) return null;
  const sorted = [...confs].sort((a, b) => a.data_conferencia.localeCompare(b.data_conferencia));
  if (sorted.length === 1) {
    return sorted[0].km_total_periodo;
  }
  let totalKm = 0;
  let totalDias = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dA = new Date(sorted[i - 1]!.data_conferencia + "T00:00:00");
    const dB = new Date(sorted[i]!.data_conferencia + "T00:00:00");
    const dias = Math.max(1, Math.round((dB.getTime() - dA.getTime()) / 86400000));
    totalKm += sorted[i]!.km_total_periodo;
    totalDias += dias;
  }
  return totalDias > 0 ? (totalKm / totalDias) * 30 : sorted[sorted.length - 1]!.km_total_periodo;
}

export function useDespesasFixas() {
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["despesas-fixas", userId, perfil?.id, veiculo?.id],
    queryFn: async () => {
      if (!userId) return null;
      const hoje = dateEngine.hoje();
      const [aliquotas, jornadasMes, todasJornadas, manutencoes, conferencias] = await Promise.all([
        despesasFixasService.listIpvaAliquotas(),
        jornadaService.listByProfile(userId, { mes: hoje }),
        jornadaService.listByProfile(userId),
        manutencoesService.listByProfile(userId),
        conferenciaHodometroService.listByProfile(userId),
      ]);

      const diasTrabalhadosMes = new Set(jornadasMes.map((j) => j.data_jornada)).size;
      const kmMes = jornadasMes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);

      // Jornada mais antiga para termoInicial
      const jornadaMaisAntiga = todasJornadas
        .map((j) => j.data_jornada)
        .sort()[0] ?? null;

      // Km média mensal: prioriza conferências de hodômetro (km total rodado),
      // cai de volta para jornadas (km trabalhado) se não houver conferências
      const kmMediaMensalConf = kmMediaMensalDeConferencias(conferencias);
      const limite90Iso = dateEngine.formatarISO(dateEngine.somarDias(hoje, -90));
      const jornadasRecentes = todasJornadas.filter((j) => j.data_jornada >= limite90Iso);
      const kmRecentes = jornadasRecentes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
      const kmMediaMensal = kmMediaMensalConf ?? (kmRecentes > 0 ? kmRecentes / 3 : 0);

      return despesaFixaEngine.calcular({
        perfil,
        veiculo,
        manutencoes,
        aliquotasIpva: aliquotas,
        diasTrabalhadosMes,
        totalJornadasMes: jornadasMes.length,
        kmMediaDiaria: diasTrabalhadosMes > 0 ? kmMes / diasTrabalhadosMes : 0,
        kmMediaMensal,
        dataJornadaMaisAntiga: jornadaMaisAntiga,
        diasFolgaSemana: perfil?.dias_folga_semana ?? 2,
      });
    },
    enabled: !!userId,
  });
}
