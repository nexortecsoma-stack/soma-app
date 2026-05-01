import type { Abastecimento, Jornada, Veiculo } from "@/lib/types";
import { combustivelEngine } from "./combustivel-engine";
import { dateEngine } from "./date-engine";

export type FiltroPeriodo = "hoje" | "semana" | "mes" | "ano" | "todos";

export interface EstatisticasPeriodo {
  filtro: FiltroPeriodo;
  kmTrabalho: number;         // exato (de jornadas)
  kmPessoal: number;          // exato para "todos"; estimado proporcionalmente para sub-períodos
  kmTotal: number;            // exato para "todos"; estimado para sub-períodos
  percentualTrabalho: number;
  percentualPessoal: number;
  custoEstimadoTrabalho: number;
  custoEstimadoPessoal: number;
  jornadasCount: number;
  estimado: boolean;          // true quando km_pessoal é proporcionalmente estimado
}

export interface ResumoHodometro {
  hodometroInicial: number;
  hodometroAtual: number;
  kmTotalGeral: number;       // km_atual - hodometro_inicial
  kmTrabalhoTotal: number;    // soma de todos os km_percorrido de todas as jornadas
  kmPessoalTotal: number;     // km_total_geral - km_trabalho_total
  percentualTrabalhoGeral: number;
  percentualPessoalGeral: number;
  periodo: EstatisticasPeriodo;
}

export interface ConferenciaCalculo {
  hodometroAnterior: number;
  hodometroAtual: number;
  kmTotalPeriodo: number;
  kmTrabalhoPeriodo: number;
  kmPessoalPeriodo: number;
  percentualTrabalho: number;
  percentualPessoal: number;
  custoEstimadoTrabalho: number;
  custoEstimadoPessoal: number;
}

export interface ConferenciaInput {
  hodometroAtual: number;
  hodometroAnterior: number;
  dataAnterior: string;
  dataAtual: string;
  jornadas: Jornada[];
  abastecimentos: Abastecimento[];
  veiculo: Veiculo | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inicioPeriodo(filtro: FiltroPeriodo): Date | null {
  const hoje = new Date();
  switch (filtro) {
    case "hoje":
      return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    case "semana": {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7)); // segunda-feira
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "mes":
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    case "ano":
      return new Date(hoje.getFullYear(), 0, 1);
    case "todos":
      return null;
  }
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export const hodometroEngine = {
  resumo(input: {
    jornadas: Jornada[];
    abastecimentos: Abastecimento[];
    veiculo: Veiculo | null;
    hodometroAtual: number;
    filtro: FiltroPeriodo;
  }): ResumoHodometro {
    const hodometroInicial = Number(input.veiculo?.hodometro_inicial ?? 0);
    const hodometroAtual = input.hodometroAtual;
    const kmTotalGeral = Math.max(0, hodometroAtual - hodometroInicial);

    // km trabalho total (todas as jornadas)
    const kmTrabalhoTotal = input.jornadas.reduce(
      (s, j) => s + (Number(j.km_percorrido) || 0),
      0,
    );
    const kmPessoalTotal = Math.max(0, kmTotalGeral - kmTrabalhoTotal);

    const pctTrabalhoGeral = kmTotalGeral > 0
      ? Math.min(100, Math.round((kmTrabalhoTotal / kmTotalGeral) * 100))
      : 0;

    // ── Filtro de período ──
    const inicio = inicioPeriodo(input.filtro);
    const jornadasFiltradas = inicio
      ? input.jornadas.filter((j) => {
          const d = dateEngine.parseISO(j.data_jornada);
          return d >= inicio;
        })
      : input.jornadas;

    const kmTrabalhoPeriodo = jornadasFiltradas.reduce(
      (s, j) => s + (Number(j.km_percorrido) || 0),
      0,
    );

    let kmPessoalPeriodo: number;
    let kmTotalPeriodo: number;
    let estimado: boolean;

    if (input.filtro === "todos") {
      // Exato
      kmTotalPeriodo = kmTotalGeral;
      kmPessoalPeriodo = kmPessoalTotal;
      estimado = false;
    } else {
      // Estima km_pessoal proporcionalmente usando a razão global
      const ratioTrabalho = kmTotalGeral > 0 ? kmTrabalhoTotal / kmTotalGeral : 1;
      kmTotalPeriodo = ratioTrabalho > 0 ? Math.round(kmTrabalhoPeriodo / ratioTrabalho) : kmTrabalhoPeriodo;
      kmPessoalPeriodo = Math.max(0, kmTotalPeriodo - kmTrabalhoPeriodo);
      estimado = kmPessoalTotal > 0;
    }

    const pctTrabalho = kmTotalPeriodo > 0
      ? Math.min(100, Math.round((kmTrabalhoPeriodo / kmTotalPeriodo) * 100))
      : 0;

    const custoTrabalho = combustivelEngine.custoEstimado({
      km: kmTrabalhoPeriodo,
      veiculo: input.veiculo,
      abastecimentos: input.abastecimentos,
    });
    const custoPessoal = combustivelEngine.custoEstimado({
      km: kmPessoalPeriodo,
      veiculo: input.veiculo,
      abastecimentos: input.abastecimentos,
    });

    return {
      hodometroInicial,
      hodometroAtual,
      kmTotalGeral,
      kmTrabalhoTotal,
      kmPessoalTotal,
      percentualTrabalhoGeral: pctTrabalhoGeral,
      percentualPessoalGeral: 100 - pctTrabalhoGeral,
      periodo: {
        filtro: input.filtro,
        kmTrabalho: kmTrabalhoPeriodo,
        kmPessoal: kmPessoalPeriodo,
        kmTotal: kmTotalPeriodo,
        percentualTrabalho: pctTrabalho,
        percentualPessoal: 100 - pctTrabalho,
        custoEstimadoTrabalho: custoTrabalho,
        custoEstimadoPessoal: custoPessoal,
        jornadasCount: jornadasFiltradas.length,
        estimado,
      },
    };
  },

  /** Mantido para compatibilidade com o fluxo de conferência manual */
  calcular(input: ConferenciaInput): ConferenciaCalculo {
    const kmTotal = Math.max(0, input.hodometroAtual - input.hodometroAnterior);
    const dataA = dateEngine.parseISO(input.dataAnterior);
    const dataB = dateEngine.parseISO(input.dataAtual);

    const kmTrabalho = input.jornadas
      .filter((j) => {
        const d = dateEngine.parseISO(j.data_jornada);
        return d >= dataA && d <= dataB;
      })
      .reduce((s, j) => s + (Number(j.km_percorrido) || 0), 0);

    const kmPessoal = Math.max(0, kmTotal - kmTrabalho);
    const percentualTrabalho = kmTotal > 0 ? Math.round((kmTrabalho / kmTotal) * 100) : 0;

    const custoTrabalho = combustivelEngine.custoEstimado({ km: kmTrabalho, veiculo: input.veiculo, abastecimentos: input.abastecimentos });
    const custoPessoal = combustivelEngine.custoEstimado({ km: kmPessoal, veiculo: input.veiculo, abastecimentos: input.abastecimentos });

    return {
      hodometroAnterior: input.hodometroAnterior,
      hodometroAtual: input.hodometroAtual,
      kmTotalPeriodo: kmTotal,
      kmTrabalhoPeriodo: kmTrabalho,
      kmPessoalPeriodo: kmPessoal,
      percentualTrabalho,
      percentualPessoal: kmTotal > 0 ? 100 - percentualTrabalho : 0,
      custoEstimadoTrabalho: custoTrabalho,
      custoEstimadoPessoal: custoPessoal,
    };
  },
};
