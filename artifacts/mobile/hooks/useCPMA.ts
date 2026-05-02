import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { cpmaService } from "@/services/cpma-service";
import { combustivelEngine } from "@/engines/combustivel-engine";
import { despesaFixaEngine } from "@/engines/despesa-fixa-engine";
import { hodometroEngine } from "@/engines/hodometro-engine";
import { dateEngine } from "@/engines/date-engine";
import type { FiltroPeriodo } from "@/engines/hodometro-engine";

export interface CPMAData {
  // Financeiro principal
  ganhoBruto: number;
  ganhoLiquido: number;
  ganhoReal: number;
  pctLiquido: number;
  pctReal: number;

  // Custos (pctCombustivel/pctCustoFixo com 1 decimal)
  totalCustos: number;
  custoCombustivel: number;
  custoFixo: number;
  pctCustos: number;
  pctCombustivel: number;
  pctCustoFixo: number;

  // Despesas variáveis individuais (agrupadas por categoria, pct com 1 decimal)
  despesasItems: Array<{ nome: string; valor: number; pct: number }>;

  // Itens de custo fixo ativos (proporcional ao período)
  custoFixoItens: Array<{ descricao: string; valor: number; pct: number }>;

  // Quilometragem e tempo
  kmTrabalho: number;
  kmPessoal: number | null;
  horas: number;

  // Corridas e jornadas
  corridas: number;
  diasTrabalhados: number;
  corridasPorHora: number;

  // Médias
  ganhoPorDia: number;
  horasPorDia: number;
  kmPorCorrida: number;
  ganhoPorCorrida: number;
  ganhoPorHora: number;
  ganhoRealPorHora: number;
  ganhoRealPorDia: number;

  // Índices de custo e ganho
  custoPorHora: number;
  custoPorCorrida: number;
  custoPorKm: number;
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

      // ── Despesas individuais agrupadas por categoria ─────────────────────
      const despesasMap = new Map<string, number>();
      for (const d of raw.despesas) {
        const nome = d.categoria_personalizada?.trim() || d.categoria;
        despesasMap.set(nome, (despesasMap.get(nome) ?? 0) + (Number(d.valor) || 0));
      }
      // pct calculado depois que ganhoBruto está disponível — usa closure de pct1
      const despesasItemsRaw = Array.from(despesasMap.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor);
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
      const pct1 = (n: number) =>
        ganhoBruto > 0 ? Math.round((n / ganhoBruto) * 1000) / 10 : 0;

      // ── KM pessoal via hodometroEngine (usa hodômetro real da última conferência) ──
      let kmPessoal: number | null = null;
      if (veiculo?.hodometro_inicial != null) {
        const hodometroAtual =
          raw.ultimaConferencia?.hodometro_atual ??
          Number(veiculo.km_atual ?? veiculo.hodometro_inicial);

        const resumo = hodometroEngine.resumo({
          jornadas: raw.todasJornadas,
          abastecimentos: raw.abastecimentos,
          veiculo,
          hodometroAtual,
          filtro,
          refDate,
        });
        kmPessoal = resumo.periodo.kmPessoal;
      }

      const despesasItems = despesasItemsRaw.map((i) => ({
        ...i,
        pct: pct1(i.valor),
      }));

      const custoFixoItens = custoFixoCalc.itens
        .filter((i) => i.ativo)
        .map((i) => ({
          descricao: i.descricao,
          valor: i.valorMensal * (diasPeriodo / 30),
          pct: custoFixoCalc.custoMensal > 0
            ? Math.round((i.valorMensal / custoFixoCalc.custoMensal) * 1000) / 10
            : 0,
        }));

      return {
        ganhoBruto,
        ganhoLiquido,
        ganhoReal,
        pctLiquido: pct(ganhoLiquido),
        pctReal: pct(ganhoReal),

        totalCustos,
        custoCombustivel,
        custoFixo,
        pctCustos: pct(totalCustos),
        pctCombustivel: pct1(custoCombustivel),
        pctCustoFixo: pct1(custoFixo),
        despesasItems,
        custoFixoItens,

        kmTrabalho,
        kmPessoal,
        horas,

        corridas,
        diasTrabalhados,
        corridasPorHora: horas > 0 ? corridas / horas : 0,

        ganhoPorDia: diasTrabalhados > 0 ? ganhoBruto / diasTrabalhados : 0,
        horasPorDia: diasTrabalhados > 0 ? horas / diasTrabalhados : 0,
        kmPorCorrida: corridas > 0 ? kmTrabalho / corridas : 0,
        ganhoPorCorrida: corridas > 0 ? ganhoBruto / corridas : 0,
        ganhoPorHora: horas > 0 ? ganhoBruto / horas : 0,
        ganhoRealPorHora: horas > 0 ? ganhoReal / horas : 0,
        ganhoRealPorDia: diasTrabalhados > 0 ? ganhoReal / diasTrabalhados : 0,

        custoPorHora: horas > 0 ? totalCustos / horas : 0,
        custoPorCorrida: corridas > 0 ? totalCustos / corridas : 0,
        custoPorKm: kmTrabalho > 0 ? totalCustos / kmTrabalho : 0,
        ganhoPorKm: kmTrabalho > 0 ? ganhoBruto / kmTrabalho : 0,
        ganhoPorKmReal: kmTrabalho > 0 ? ganhoReal / kmTrabalho : 0,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
