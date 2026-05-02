import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { cpmaService } from "@/services/cpma-service";
import { combustivelEngine } from "@/engines/combustivel-engine";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { dateEngine } from "@/engines/date-engine";
import type { FiltroPeriodo } from "@/engines/hodometro-engine";

export interface CPMAData {
  // Financeiro principal
  ganhoBruto: number;
  ganhoLiquido: number;
  ganhoReal: number;
  pctLiquido: number;
  pctReal: number;

  // Custos
  totalCustos: number;
  despesasVar: number;
  custoCombustivel: number;
  custoFixo: number;
  pctCustos: number;

  // Quilometragem
  kmTrabalho: number;
  kmPessoal: number | null;

  // Corridas e jornadas
  corridas: number;
  jornadasCount: number;
  diasTrabalhados: number;
  horas: number;
  corridasPorHora: number;
  ganhoPorHora: number;
  ganhoPorCorrida: number;

  // Ratios por km
  custoPorKm: number;
  custoPorCorrida: number;
  ganhoPorKm: number;
  ganhoPorKmReal: number;
}

function periodoDatas(
  filtro: FiltroPeriodo,
  ref: Date,
): { inicio: string | null; fim: string | null; diasPeriodo: number } {
  if (filtro === "todos") return { inicio: null, fim: null, diasPeriodo: 30 };

  const fmt = (d: Date) => dateEngine.formatarISO(d);

  switch (filtro) {
    case "dia":
      return { inicio: fmt(ref), fim: fmt(ref), diasPeriodo: 1 };

    case "semana": {
      const ini = dateEngine.inicioSemana(ref);
      const fim = dateEngine.fimSemana(ref);
      return { inicio: fmt(ini), fim: fmt(fim), diasPeriodo: 7 };
    }

    case "mes": {
      const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const fim = dateEngine.ultimoDiaMes(ref);
      const dias = Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1;
      return { inicio: fmt(ini), fim: fmt(fim), diasPeriodo: dias };
    }

    case "ano": {
      const ini = new Date(ref.getFullYear(), 0, 1);
      const fim = new Date(ref.getFullYear(), 11, 31);
      return { inicio: fmt(ini), fim: fmt(fim), diasPeriodo: 365 };
    }
  }
}

export function useCPMA(filtro: FiltroPeriodo, refDate: Date) {
  const { session, perfil, veiculo } = useAuth();
  const userId = session?.user?.id;

  const { inicio, fim, diasPeriodo } = periodoDatas(filtro, refDate);
  const periodoKey = `${filtro}|${inicio}|${fim}`;

  return useQuery({
    queryKey: ["cpma", userId, periodoKey, perfil?.id, veiculo?.id],
    queryFn: async (): Promise<CPMAData> => {
      if (!userId) throw new Error("Not authenticated");

      const raw = await cpmaService.fetch(userId, inicio, fim);

      // ── Básico ──────────────────────────────────────────────────────────
      const ganhoBruto = raw.ganhos.reduce((s, g) => s + (Number(g.valor) || 0), 0);
      const corridas = raw.ganhos.reduce((s, g) => s + (Number(g.corridas) || 0), 0);
      const despesasVar = raw.despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
      const kmTrabalho = raw.jornadas.reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);
      const minutos = raw.jornadas.reduce((s, j) => s + (Number(j.tempo_efetivo_minutos) || 0), 0);
      const horas = minutos / 60;
      const jornadasCount = raw.jornadas.length;
      const diasTrabalhados = new Set(raw.jornadas.map((j) => j.data_jornada)).size;

      // ── Combustível ─────────────────────────────────────────────────────
      const custoCombustivel = combustivelEngine.custoEstimado({
        km: kmTrabalho,
        veiculo,
        abastecimentos: raw.abastecimentos,
      });

      // ── Custo fixo proporcional ao período ──────────────────────────────
      const custoFixoCalc = despesaFixaEngine.calcular({
        perfil,
        veiculo,
        manutencoes: raw.manutencoes,
        aliquotasIpva: raw.aliquotasIpva,
        diasTrabalhadosMes: Math.max(1, diasTrabalhados),
        totalJornadasMes: jornadasCount,
        kmMediaDiaria: diasTrabalhados > 0 ? kmTrabalho / diasTrabalhados : 0,
        diasFolgaSemana: perfil?.dias_folga_semana ?? 2,
      });
      const custoFixo = custoFixoCalc.custoMensal * (diasPeriodo / 30);

      // ── Totais ──────────────────────────────────────────────────────────
      const totalCustos = despesasVar + custoCombustivel + custoFixo;
      const ganhoLiquido = ganhoBruto - despesasVar - custoCombustivel;
      const ganhoReal = ganhoBruto - totalCustos;

      const pct = (n: number) =>
        ganhoBruto > 0 ? Math.max(-999, Math.round((n / ganhoBruto) * 100)) : 0;

      // ── KM pessoal (só para "todos") ─────────────────────────────────
      let kmPessoal: number | null = null;
      if (filtro === "todos" && veiculo?.km_atual != null && veiculo?.hodometro_inicial != null) {
        const kmTotalGeral = Number(veiculo.km_atual) - Number(veiculo.hodometro_inicial);
        kmPessoal = Math.max(0, kmTotalGeral - kmTrabalho);
      }

      return {
        ganhoBruto,
        ganhoLiquido,
        ganhoReal,
        pctLiquido: pct(ganhoLiquido),
        pctReal: pct(ganhoReal),

        totalCustos,
        despesasVar,
        custoCombustivel,
        custoFixo,
        pctCustos: pct(totalCustos),

        kmTrabalho,
        kmPessoal,

        corridas,
        jornadasCount,
        diasTrabalhados,
        horas,
        corridasPorHora: horas > 0 ? corridas / horas : 0,
        ganhoPorHora: horas > 0 ? ganhoBruto / horas : 0,
        ganhoPorCorrida: corridas > 0 ? ganhoBruto / corridas : 0,

        custoPorKm: kmTrabalho > 0 ? totalCustos / kmTrabalho : 0,
        custoPorCorrida: corridas > 0 ? totalCustos / corridas : 0,
        ganhoPorKm: kmTrabalho > 0 ? ganhoBruto / kmTrabalho : 0,
        ganhoPorKmReal: kmTrabalho > 0 ? ganhoReal / kmTrabalho : 0,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
