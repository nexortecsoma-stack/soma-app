import type { Ganho, Jornada, Perfil, RankingSoma, Veiculo } from "@/lib/types";

export type CampoRanking = "ganho_bruto" | "ganho_liquido" | "ganho_por_hora" | "ganho_por_km";

export interface FiltrosRanking {
  cidade?: string | null;
  uf?: string | null;
  categoria?: string | null;
  tipo_carro?: string | null;
  tipo_tracao?: string | null;
  tipo_propriedade?: string | null;
  campo?: CampoRanking;
}

export const rankingEngine = {
  calcularSnapshot(input: {
    perfil: Perfil;
    veiculo: Veiculo | null;
    jornadas: Jornada[];
    ganhos: Ganho[];
    despesasTotal: number;
    custoFixoTotal: number;
    periodoInicio: Date;
    periodoFim: Date;
  }): Omit<RankingSoma, "atualizado_em"> {
    const { perfil, veiculo, jornadas, ganhos, despesasTotal, custoFixoTotal, periodoInicio, periodoFim } = input;
    const ganhoBruto = ganhos.reduce((s, g) => s + Number(g.valor || 0), 0);
    const ganhoLiquido = ganhoBruto - despesasTotal - custoFixoTotal;
    const totalMin = jornadas.reduce((s, j) => s + Number(j.tempo_efetivo_minutos || j.tempo_total_minutos || 0), 0);
    const horas = totalMin / 60;
    const km = jornadas.reduce(
      (s, j) => s + Number(j.km_percorrido_real || j.km_percorrido || 0),
      0,
    );
    // Quando o ganho líquido é negativo, R$/h e R$/km usam o bruto como base
    // para evitar valores negativos sem sentido no ranking
    const baseHora = ganhoLiquido >= 0 ? ganhoLiquido : ganhoBruto;
    const baseKm = ganhoLiquido >= 0 ? ganhoLiquido : ganhoBruto;
    const ganhoPorHora = horas > 0 ? Math.max(0, baseHora / horas) : 0;
    const ganhoPorKm = km > 0 ? Math.max(0, baseKm / km) : 0;
    return {
      profile_id: perfil.id,
      nome_publico: perfil.nome_publico ?? perfil.nome ?? null,
      categoria: perfil.categoria,
      cidade: perfil.cidade,
      uf: perfil.uf,
      ganho_bruto: Math.max(0, ganhoBruto),
      ganho_liquido: ganhoLiquido,
      ganho_por_hora: ganhoPorHora,
      ganho_por_km: ganhoPorKm,
      horas_trabalhadas: horas,
      km_percorrido: km,
      tipo_carro: veiculo?.tipo_propriedade ?? null,
      tipo_tracao: veiculo?.tipo_tracao ?? perfil.tipo_tracao ?? null,
      tipo_propriedade: veiculo?.tipo_propriedade ?? perfil.tipo_propriedade ?? null,
      foto_url: perfil.foto_url ?? null,
      periodo_inicio: periodoInicio.toISOString().split("T")[0] ?? null,
      periodo_fim: periodoFim.toISOString().split("T")[0] ?? null,
    };
  },

  ordenar(items: RankingSoma[], campo: CampoRanking): RankingSoma[] {
    return [...items].sort((a, b) => Number(b[campo] || 0) - Number(a[campo] || 0));
  },

  filtrar(items: RankingSoma[], filtros: FiltrosRanking): RankingSoma[] {
    return items.filter((r) => {
      if (filtros.cidade && (r.cidade ?? "").toLowerCase() !== filtros.cidade.toLowerCase()) return false;
      if (filtros.uf && (r.uf ?? "") !== filtros.uf) return false;
      if (filtros.categoria && (r.categoria ?? "") !== filtros.categoria) return false;
      if (filtros.tipo_carro && (r.tipo_carro ?? "") !== filtros.tipo_carro) return false;
      if (filtros.tipo_tracao && (r.tipo_tracao ?? "") !== filtros.tipo_tracao) return false;
      if (filtros.tipo_propriedade && (r.tipo_propriedade ?? "") !== filtros.tipo_propriedade) return false;
      return true;
    });
  },
};
