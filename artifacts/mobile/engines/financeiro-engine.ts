import type { Despesa, Ganho } from "@/lib/types";

export const financeiroEngine = {
  totalGanhos(ganhos: Ganho[]): number {
    return ganhos.reduce((sum, g) => sum + (Number(g.valor) || 0), 0);
  },

  totalDespesas(despesas: Despesa[]): number {
    return despesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
  },

  totalCorridas(ganhos: Ganho[]): number {
    return ganhos.reduce((sum, g) => sum + (Number(g.corridas) || 0), 0);
  },

  ganhoLiquido(ganhos: Ganho[], despesas: Despesa[], custoCombustivel: number, custoFixo: number): number {
    return this.totalGanhos(ganhos) - this.totalDespesas(despesas) - custoCombustivel - custoFixo;
  },

  variacaoPercentual(atual: number, anterior: number): number {
    if (anterior <= 0) return atual > 0 ? 100 : 0;
    return Math.round(((atual - anterior) / anterior) * 100);
  },

  agruparPorCategoria(despesas: Despesa[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const d of despesas) {
      map[d.categoria] = (map[d.categoria] ?? 0) + (Number(d.valor) || 0);
    }
    return map;
  },
};
