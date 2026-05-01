export const currencyEngine = {
  formatar(valor: number | null | undefined): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  formatarNumero(valor: number | null | undefined, casas = 2): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
  },

  parseFromInput(input: string): number {
    const limpo = (input || "").replace(/\D/g, "");
    if (!limpo) return 0;
    return parseInt(limpo, 10) / 100;
  },

  formatarParaInput(valor: number | null | undefined): string {
    const n = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
};
