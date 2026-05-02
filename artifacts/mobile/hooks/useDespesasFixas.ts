import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { despesasFixasService } from "@/services/despesas-fixas-service";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { jornadaService } from "@/services/jornada-service";
import { manutencoesService } from "@/services/manutencoes-service";
import { dateEngine } from "@/engines/date-engine";

export function useDespesasFixas() {
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["despesas-fixas", userId, perfil?.id, veiculo?.id],
    queryFn: async () => {
      if (!userId) return null;
      const hoje = dateEngine.hoje();
      const [aliquotas, jornadasMes, todasJornadas, manutencoes] = await Promise.all([
        despesasFixasService.listIpvaAliquotas(),
        jornadaService.listByProfile(userId, { mes: hoje }),
        jornadaService.listByProfile(userId),
        manutencoesService.listByProfile(userId),
      ]);

      const diasTrabalhadosMes = new Set(jornadasMes.map((j) => j.data_jornada)).size;
      const kmMes = jornadasMes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);

      // Jornada mais antiga para termoInicial
      const jornadaMaisAntiga = todasJornadas
        .map((j) => j.data_jornada)
        .sort()[0] ?? null;

      // Km média mensal — média dos últimos 90 dias (3 meses)
      const limite90Iso = dateEngine.formatarISO(dateEngine.somarDias(hoje, -90));
      const jornadasRecentes = todasJornadas.filter((j) => j.data_jornada >= limite90Iso);
      const kmRecentes = jornadasRecentes.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
      const kmMediaMensal = kmRecentes > 0 ? kmRecentes / 3 : 0;

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
