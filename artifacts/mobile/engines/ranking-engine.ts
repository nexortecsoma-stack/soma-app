import type { Ganho, Jornada, Perfil, RankingSoma, Veiculo } from "@/lib/types";

export type CampoRanking = "ganho_bruto" | "ganho_liquido" | "ganho_por_hora" | "ganho_por_km";

export type RankingPeriodo = "dia" | "semana" | "mes" | "ano" | "todos";

export function periodoParaDatas(filtro: RankingPeriodo, refDate: Date): { inicio: Date; fim: Date } {
  const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  if (filtro === "dia") {
    return { inicio: base, fim: new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1) };
  }
  if (filtro === "semana") {
    const day = (base.getDay() + 6) % 7;
    const ini = new Date(base);
    ini.setDate(base.getDate() - day);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 7);
    return { inicio: ini, fim };
  }
  if (filtro === "mes") {
    return {
      inicio: new Date(base.getFullYear(), base.getMonth(), 1),
      fim: new Date(base.getFullYear(), base.getMonth() + 1, 1),
    };
  }
  if (filtro === "ano") {
    return {
      inicio: new Date(base.getFullYear(), 0, 1),
      fim: new Date(base.getFullYear() + 1, 0, 1),
    };
  }
  // todos
  return { inicio: new Date(2020, 0, 1), fim: new Date() };
}

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
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const r4 = (n: number) => Math.round(n * 10000) / 10000;
    const isoLocal = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const ganhoBruto = ganhos.reduce((s, g) => s + Number(g.valor || 0), 0);
    const ganhoLiquido = ganhoBruto - despesasTotal - custoFixoTotal;
    const totalMin = jornadas.reduce((s, j) => s + Number(j.tempo_efetivo_minutos || j.tempo_total_minutos || 0), 0);
    const horas = totalMin / 60;
    const km = jornadas.reduce(
      (s, j) => s + Number(j.km_percorrido_real || j.km_percorrido || 0),
      0,
    );
    const ganhoPorHora = horas > 0 ? Math.max(0, ganhoBruto / horas) : 0;
    const ganhoPorKm   = km   > 0 ? Math.max(0, ganhoBruto / km)   : 0;
    return {
      profile_id: perfil.id,
      nome_publico: perfil.nome_publico ?? perfil.nome ?? null,
      categoria: perfil.categoria,
      cidade: perfil.cidade,
      uf: perfil.uf,
      ganho_bruto:      r2(Math.max(0, ganhoBruto)),
      ganho_liquido:    r2(ganhoLiquido),
      ganho_por_hora:   r2(ganhoPorHora),
      ganho_por_km:     r4(ganhoPorKm),
      horas_trabalhadas: r2(horas),
      km_percorrido:    r2(km),
      tipo_carro:       veiculo?.tipo_propriedade ?? null,
      tipo_tracao:      veiculo?.tipo_tracao ?? perfil.tipo_tracao ?? null,
      tipo_propriedade: veiculo?.tipo_propriedade ?? perfil.tipo_propriedade ?? null,
      foto_url:         perfil.foto_url ?? null,
      periodo_inicio:   isoLocal(periodoInicio),
      periodo_fim:      isoLocal(periodoFim),
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
