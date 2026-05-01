import type { Manutencao } from "@/lib/types";
import { dateEngine } from "./date-engine";

export interface StatusManutencao {
  vidaUtilPercentual: number;
  status: "ok" | "atencao" | "vencida";
  diasRestantes: number | null;
  kmRestantes: number | null;
  termoFinalISO: string | null;
  termoFinalFmt: string | null;
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

function calcularTermoFinal(m: Manutencao): string | null {
  if (m.duracao_meses && m.duracao_meses > 0) {
    try {
      const base = new Date(m.data_manutencao + "T00:00:00");
      base.setMonth(base.getMonth() + Number(m.duracao_meses));
      return base.toISOString().slice(0, 10);
    } catch { return null; }
  }
  return null;
}

function fmtBR(iso: string | null): string | null {
  if (!iso) return null;
  try { return dateEngine.formatarBR(iso); } catch { return null; }
}

export const manutencaoEngine = {
  /** Enriquece cada item com ativo/substituído e termo final */
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
      const termoFinalISO = calcularTermoFinal(m);
      return { ...m, ativo, termoFinalISO, termoFinalFmt: fmtBR(termoFinalISO) };
    });
  },

  /** Resumo geral: total de custo ativo + termo final mais distante */
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

  status(m: Manutencao, kmAtual: number): StatusManutencao {
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

    const termoFinalISO = calcularTermoFinal(m);
    return {
      vidaUtilPercentual: Math.round(percentual),
      status: st,
      diasRestantes,
      kmRestantes,
      termoFinalISO,
      termoFinalFmt: fmtBR(termoFinalISO),
    };
  },

  /** Custo diário — usa apenas o item mais recente por tipo */
  custoEstimadoDiario(manutencoes: Manutencao[], kmMediaDiaria: number): number {
    const ativas = this.agrupar(manutencoes).filter((m) => m.ativo);
    let custoMensal = 0;
    for (const m of ativas) {
      const valor = Number(m.valor) || 0;
      const meses = Number(m.duracao_meses) || 0;
      const km = Number(m.duracao_km) || 0;
      if (meses > 0) {
        custoMensal += valor / meses;
      } else if (km > 0 && kmMediaDiaria > 0) {
        custoMensal += valor / ((km / kmMediaDiaria) / 30);
      }
    }
    return custoMensal / 30;
  },
};
