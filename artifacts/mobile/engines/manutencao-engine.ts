import type { Manutencao } from "@/lib/types";
import { dateEngine } from "./date-engine";

export interface StatusManutencao {
  vidaUtilPercentual: number;
  status: "ok" | "atencao" | "vencida";
  diasRestantes: number | null;
  kmRestantes: number | null;
  // Termo por tempo (meses)
  termoFinalISO: string | null;
  termoFinalFmt: string | null;
  // Termo por km (previsão baseada em média km/mês)
  kmFim: number | null;
  dataPrevistaKmISO: string | null;
  dataPrevistaKmFmt: string | null;
  // Termo efetivo = menor dos dois (quem vence primeiro)
  termoFinalEfetivoISO: string | null;
  termoFinalEfetivoFmt: string | null;
  termoEfetivoFonte: "km" | "tempo" | null;
  // Rateio calculado sobre vida útil efetiva
  vidaUtilMeses: number | null;
  rateioMensal: number;
  rateioDiario: number;
}

export interface ManutencaoComStatus extends Manutencao {
  ativo: boolean;
  termoFinalISO: string | null;
  termoFinalFmt: string | null;
}

export interface ResumoManutencoes {
  itens: ManutencaoComStatus[];
  totalCustoAtivo: number;
  termoFinalGlobal: string | null;
  termoFinalGlobalFmt: string | null;
  totalItensAtivos: number;
  totalItensSubstituidos: number;
}

function calcularTermoFinalTempo(m: Manutencao): string | null {
  if (!m.duracao_meses || m.duracao_meses <= 0) return null;
  try {
    const base = new Date(m.data_manutencao + "T00:00:00");
    base.setMonth(base.getMonth() + Number(m.duracao_meses));
    return base.toISOString().slice(0, 10);
  } catch { return null; }
}

function calcularTermoFinalKm(m: Manutencao, kmAtual: number, kmMediaMensal: number): string | null {
  if (!m.duracao_km || !m.km_troca || kmMediaMensal <= 0) return null;
  const kmFim = Number(m.km_troca) + Number(m.duracao_km);
  const kmRestantes = Math.max(0, kmFim - kmAtual);
  if (kmRestantes === 0) return dateEngine.formatarISO(dateEngine.hoje());
  const diasRestantes = Math.round((kmRestantes / kmMediaMensal) * 30);
  return dateEngine.formatarISO(dateEngine.somarDias(dateEngine.hoje(), diasRestantes));
}

function fmtBR(iso: string | null): string | null {
  if (!iso) return null;
  try { return dateEngine.formatarBR(iso); } catch { return null; }
}

export const manutencaoEngine = {
  agrupar(manutencoes: Manutencao[]): ManutencaoComStatus[] {
    const maisRecentePorTipo = new Map<string, string>();
    for (const m of manutencoes) {
      const atualId = maisRecentePorTipo.get(m.tipo_manutencao);
      if (!atualId) {
        maisRecentePorTipo.set(m.tipo_manutencao, m.id);
      } else {
        const atualData = manutencoes.find((x) => x.id === atualId)?.data_manutencao ?? "";
        if (m.data_manutencao > atualData) {
          maisRecentePorTipo.set(m.tipo_manutencao, m.id);
        }
      }
    }
    return manutencoes.map((m) => {
      const ativo = maisRecentePorTipo.get(m.tipo_manutencao) === m.id;
      const termoFinalISO = calcularTermoFinalTempo(m);
      return { ...m, ativo, termoFinalISO, termoFinalFmt: fmtBR(termoFinalISO) };
    });
  },

  resumo(manutencoes: Manutencao[]): ResumoManutencoes {
    const itens = this.agrupar(manutencoes);
    const ativos = itens.filter((i) => i.ativo);
    const totalCustoAtivo = ativos.reduce((s, m) => s + (Number(m.valor) || 0), 0);
    let termoFinalGlobal: string | null = null;
    for (const m of ativos) {
      if (m.termoFinalISO && (!termoFinalGlobal || m.termoFinalISO > termoFinalGlobal)) {
        termoFinalGlobal = m.termoFinalISO;
      }
    }
    return {
      itens,
      totalCustoAtivo,
      termoFinalGlobal,
      termoFinalGlobalFmt: fmtBR(termoFinalGlobal),
      totalItensAtivos: ativos.length,
      totalItensSubstituidos: itens.filter((i) => !i.ativo).length,
    };
  },

  status(m: Manutencao, kmAtual: number, kmMediaMensal = 0): StatusManutencao {
    const hoje = dateEngine.hoje();
    let percentualKm: number | null = null;
    let percentualTempo: number | null = null;
    let kmRestantes: number | null = null;
    let diasRestantes: number | null = null;

    if (m.duracao_km && m.duracao_km > 0 && m.km_troca != null) {
      const kmRodados = Math.max(0, kmAtual - Number(m.km_troca));
      percentualKm = Math.min(100, (kmRodados / Number(m.duracao_km)) * 100);
      kmRestantes = Math.max(0, Number(m.duracao_km) - kmRodados);
    }

    if (m.duracao_meses && m.duracao_meses > 0) {
      const dataM = dateEngine.parseISO(m.data_manutencao);
      const diasDuracao = m.duracao_meses * 30;
      const diasPassados = Math.max(0, dateEngine.diferencaDias(hoje, dataM));
      percentualTempo = Math.min(100, (diasPassados / diasDuracao) * 100);
      diasRestantes = Math.max(0, diasDuracao - diasPassados);
    }

    const percentual = Math.max(percentualKm ?? 0, percentualTempo ?? 0);
    const st: StatusManutencao["status"] =
      percentual >= 100 ? "vencida" : percentual >= 80 ? "atencao" : "ok";

    // Termo por tempo
    const termoFinalISO = calcularTermoFinalTempo(m);

    // Km-based prediction
    const kmFim = m.duracao_km && m.km_troca
      ? Number(m.km_troca) + Number(m.duracao_km)
      : null;
    const dataPrevistaKmISO = calcularTermoFinalKm(m, kmAtual, kmMediaMensal);

    // Termo efetivo = mais próximo
    let termoFinalEfetivoISO: string | null = null;
    let termoEfetivoFonte: "km" | "tempo" | null = null;
    if (termoFinalISO && dataPrevistaKmISO) {
      if (dataPrevistaKmISO <= termoFinalISO) {
        termoFinalEfetivoISO = dataPrevistaKmISO;
        termoEfetivoFonte = "km";
      } else {
        termoFinalEfetivoISO = termoFinalISO;
        termoEfetivoFonte = "tempo";
      }
    } else if (dataPrevistaKmISO) {
      termoFinalEfetivoISO = dataPrevistaKmISO;
      termoEfetivoFonte = "km";
    } else if (termoFinalISO) {
      termoFinalEfetivoISO = termoFinalISO;
      termoEfetivoFonte = "tempo";
    }

    // Vida útil efetiva em meses (para rateio)
    const mesesTempo = m.duracao_meses ? Number(m.duracao_meses) : null;
    const mesesKm = m.duracao_km && kmMediaMensal > 0
      ? Number(m.duracao_km) / kmMediaMensal
      : null;
    let vidaUtilMeses: number | null = null;
    if (mesesTempo !== null && mesesKm !== null) {
      vidaUtilMeses = Math.min(mesesTempo, mesesKm);
    } else {
      vidaUtilMeses = mesesTempo ?? mesesKm;
    }

    const rateioMensal = vidaUtilMeses && vidaUtilMeses > 0
      ? Number(m.valor) / vidaUtilMeses
      : 0;
    const rateioDiario = rateioMensal / 30;

    return {
      vidaUtilPercentual: Math.round(percentual),
      status: st,
      diasRestantes,
      kmRestantes,
      termoFinalISO,
      termoFinalFmt: fmtBR(termoFinalISO),
      kmFim,
      dataPrevistaKmISO,
      dataPrevistaKmFmt: fmtBR(dataPrevistaKmISO),
      termoFinalEfetivoISO,
      termoFinalEfetivoFmt: fmtBR(termoFinalEfetivoISO),
      termoEfetivoFonte,
      vidaUtilMeses: vidaUtilMeses !== null ? Math.round(vidaUtilMeses * 10) / 10 : null,
      rateioMensal,
      rateioDiario,
    };
  },

  /** Custo mensal total — usa vida útil efetiva (km ou tempo, o menor) */
  custoMensalTotal(manutencoes: Manutencao[], kmMediaMensal: number): number {
    const ativas = this.agrupar(manutencoes).filter((m) => m.ativo);
    let total = 0;
    for (const m of ativas) {
      const s = this.status(m, 0, kmMediaMensal);
      total += s.rateioMensal;
    }
    return total;
  },

  /** @deprecated use custoMensalTotal */
  custoEstimadoDiario(manutencoes: Manutencao[], kmMediaDiaria: number): number {
    return this.custoMensalTotal(manutencoes, kmMediaDiaria * 30) / 30;
  },
};
